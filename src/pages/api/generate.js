// /pages/api/generate.js
// Secure API route for OpenRouter integration
// This route handles all OpenRouter API calls server-side to protect the API key

import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import he from 'he'; // For HTML entity encoding - install via npm install he
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import logger from '../../utils/logger';

const rateLimiter = new RateLimiterMemory({ points: 5, duration: 60 }); // 5 requests per minute

// Helper: derive client IP robustly and rate-limiter key (IP + UA hashed)
const getClientIp = (req) => {
  const trustProxy = process.env.VERCEL === '1' || process.env.TRUST_PROXY === 'true';

  const headerCandidates = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'fastly-client-ip',
    'true-client-ip',
    'x-vercel-proxied-for',
  ];

  const isPrivate = (ip) => {
    if (!ip) return true;
    const v4 = ip.includes('.');
    if (v4) {
      return (
        ip.startsWith('10.') ||
        ip.startsWith('127.') ||
        ip.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
        ip === '0.0.0.0'
      );
    }
    // IPv6 private/link-local/loopback
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower.startsWith('fc00:') ||
      lower.startsWith('fd00:') ||
      lower.startsWith('fe80:')
    );
  };

  const pickPublicFromXff = (xff) => {
    const parts = (xff || '')
      .toString()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('::ffff:') ? s.slice(7) : s));
    for (const p of parts) {
      if (!isPrivate(p)) return p;
    }
    return parts[0] || '';
  };

  let ip = '';
  if (trustProxy) {
    for (const h of headerCandidates) {
      const val = req.headers[h];
      if (!val) continue;
      if (h === 'x-forwarded-for') {
        ip = pickPublicFromXff(val.toString());
      } else if (typeof val === 'string') {
        ip = val;
      }
      if (ip) break;
    }
  }
  if (!ip) {
    ip = (req.socket && req.socket.remoteAddress) || '';
  }
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
};

const makeRateKey = (req) => {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  return createHash('sha256').update(`${ip}:${ua}`).digest('hex');
};

// Helper to read a JSON body when bodyParser is disabled
const readJsonBody = async (req, maxBytes = 1_000_000) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length || 0;
    if (total > maxBytes) {
      const err = new Error('Payload too large');
      err.code = 'PAYLOAD_TOO_LARGE';
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch { return {}; }
};

// Hoisted helpers so regex are compiled once per worker
const sanitizeToPrompt = (raw) => {
  try {
    let t = (raw || '').toString().trim();
    t = t.replace(/^```(?:[a-zA-Z0-9]+)?\s*[\r\n]?([\s\S]*?)\s*```$/m, '$1').trim();
    if (t.includes('---')) {
      const parts = t.split(/\n?---+\n?/g).map(p => p.trim()).filter(Boolean);
      if (parts.length) t = parts[parts.length - 1];
    }
    const labelMatch = t.match(/(?:^|\n)\s*(?:final\s*)?prompt[^:]*:\s*/i);
    if (labelMatch) {
      t = t.slice(labelMatch.index + labelMatch[0].length).trim();
    }
    t = t
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^[>\-\s]*\*/gm, '')
      .replace(/^>\s*/gm, '');
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 1200) {
      t = t.slice(0, 1200);
      const lastSpace = t.lastIndexOf(' ');
      if (lastSpace > 0) t = t.slice(0, lastSpace);
    }
    return t;
  } catch {
    return (raw || '').toString().trim();
  }
};

// Robust JSON extraction with fewer heavy attempts for perf
const parseJsonStrictish = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

  let candidate = raw.trim().replace(/^\uFEFF/, '');
  let parsed = tryParse(candidate);
  if (parsed) return parsed;
  const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    candidate = fenceMatch[1].trim();
    parsed = tryParse(candidate);
    if (parsed) return parsed;
  }
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1).trim();
    parsed = tryParse(candidate);
    if (parsed) return parsed;
  }
  candidate = candidate.replace(/[\u201C\u201D]/g, '"');
  candidate = candidate.replace(/\r\n/g, '\n');
  candidate = candidate.replace(/,\s*([}\]])/g, '$1');
  parsed = tryParse(candidate);
  if (parsed) return parsed;
  for (let i = 1; i <= 6; i++) {
    parsed = tryParse(candidate + '}'.repeat(i));
    if (parsed) return parsed;
  }
  const maxAttempts = Math.min(candidate.length, 600);
  for (let end = candidate.length; end > Math.max(0, candidate.length - maxAttempts); end--) {
    const snippet = candidate.slice(0, end).trim();
    if (snippet.length < 10) break;
    let p = tryParse(snippet);
    if (p) return p;
    for (let j = 1; j <= 4; j++) {
      p = tryParse(snippet + '}'.repeat(j));
      if (p) return p;
    }
  }
  let fallback = candidate.replace(/\s*"[^"]+"\s*:\s*[^,}\]]+$/s, '').trim();
  if (!fallback.endsWith('}')) fallback += '}';
  parsed = tryParse(fallback);
  if (parsed) return parsed;
  return null;
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  // Rate limiting - 5 requests per minute per client (IP+UA hash)
  try {
    const key = makeRateKey(req);
    await rateLimiter.consume(key, 1);
  } catch {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before trying again.'
    });
  }

  // Decide parsing strategy: multipart only when needed
  const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');

  try {
    let fields = {};
    let files = {};

    if (isMultipart) {
      const form = new IncomingForm({
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true,
      });
      [fields, files] = await form.parse(req);
    } else {
      const body = await readJsonBody(req, 1_000_000);
      fields = {
        idea: [body.idea ?? ''],
        directions: body.directions ? [body.directions] : [''],
        isJsonMode: [String(body.isJsonMode ?? 'false')],
        isTestMode: [String(body.isTestMode ?? 'false')],
        isVideoPrompt: [String(body.isVideoPrompt ?? 'false')],
        isMultiPrompt: [String(body.isMultiPrompt ?? 'false')],
      };
      files = {};
    }

    // Basic input sanitization to reduce prompt injection risks
    const idea = (fields.idea && fields.idea[0]) ? he.encode(fields.idea[0].trim()) : '';
    const directions = (fields.directions && fields.directions[0]) ? he.encode(fields.directions[0].trim()) : '';
    const imageFile = files.image ? files.image[0] : null;
    // New: JSON mode flag from form fields (string -> boolean)
    const isJsonMode = fields.isJsonMode?.[0] === 'true';
    // New: Test mode flag from form fields (string -> boolean)
    const isTestMode = fields.isTestMode?.[0] === 'true';
    // New: Video prompt mode flag from form fields (string -> boolean)
    const isVideoPrompt = (fields.isVideoPrompt?.[0] ?? 'false') === 'true';
    // New: Multi-prompt mode flag from form fields (string -> boolean)
    const isMultiPrompt = (fields.isMultiPrompt?.[0] ?? 'false') === 'true';

    // Validate that we have either an idea or an image
    if ((!idea || idea.length === 0) && !imageFile) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Either an "idea" or an image must be provided'
      });
    }

    // Check for API key in environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logger.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key is not configured. Please contact the administrator.'
      });
    }

    // helpers hoisted at module scope: sanitizeToPrompt, parseJsonStrictish

    // Test mode system prompt
    const testSystemPrompt = `# System Prompt for Universal Photo Prompt Generator

You are **Elysian Visions**, a masterful AI prompt engineer specializing in crafting hyper-detailed, evocative prompts for photorealistic image generation. Your prompts capture breathtaking artistry in styles of fine art photography, cinematic landscapes, portrait mastery, surreal visions, and epic scenes—always using poetic, indirect, metaphorical language to describe forms, textures, shadows, and atmospheres.

## Core Principles:

### 1. Elegant Metaphorical Language
Employ vivid euphemisms, artistic metaphors, and sensory descriptions for all elements:

- **Subjects**: "ethereal figures", "majestic silhouettes", "whispering windswept forms", "ancient stone guardians", "dancing shadows cast by moonlight", "temporal echoes of forgotten epochs"

- **Environments**: "mist-shrouded valleys", "golden-hour meadows", "cosmic veils of nebula", "cobblestone labyrinths", "crystalline ice cathedrals", "emerald canopies whispering secrets"

- **Textures & Lighting**: "velvety twilight glow", "crystalline dew-kissed petals", "dramatic chiaroscuro play", "ethereal fog tendrils", "luminous cascades of ambient radiance", "silken shadows caressing surfaces"

### 2. Specific Subject Handling
When the user mentions a specific person or named subject (celebrity, historical figure, character, or individual):

- **Always incorporate their exact name** directly into the prompt for hyper-realistic accuracy
- Example structure: "photorealistic portrait of [Person's Name], an ethereal figure..."
- Blend the name seamlessly with metaphorical language
- Emphasize ultra-photorealistic quality: "lifelike skin textures", "precise facial features", "natural likeness", "hyper-realistic rendering"
- Include specific details: "capturing their distinctive [feature]", "with their characteristic [trait]"
- Ensure maximum realism through technical photography terms combined with artistic description

### 3. Photorealistic Technical Excellence
Always emphasize ultra-high-resolution photography styles and technical specifications:

- **Resolution & Format**: "8K cinematic photo", "4K ultra-high-definition", "professional Canon EOS R5 shoot", "medium format Hasselblad capture"
- **Lens & Optics**: "85mm portrait lens", "24mm wide-angle cinematic", "50mm prime lens", "soft-focus lens flare", "bokeh background blur"
- **Lighting Techniques**: "natural golden hour lighting", "Rembrandt lighting", "rim lighting", "volumetric god rays", "soft window light", "dramatic side lighting"
- **Camera Settings**: "shallow depth of field", "f/1.4 aperture", "ISO 100", "long exposure", "cinematic 2.35:1 aspect ratio"
- **Post-Processing**: "color graded", "film grain texture", "cinematic color palette", "natural skin tones", "enhanced contrast"

### 4. Structured Prompt Architecture
Every prompt must follow this precise structure:

1. **Subject & Scene** (1-2 sentences):
   - Vivid core description with exact person's name if specified
   - Primary focal point and main visual element
   - Initial atmosphere and mood establishment

2. **Details & Environment** (2-3 sentences):
   - Key elements: attire, props, environmental features
   - Textural descriptions: "flowing silk robes", "weathered stone surfaces", "intricate mechanical details"
   - Atmospheric conditions: "misty morning", "dramatic storm clouds", "serene twilight"

3. **Composition & Perspective** (1-2 sentences):
   - Camera angles: "sweeping wide-angle vista", "intimate portrait gaze", "bird's-eye view", "low-angle dramatic perspective"
   - Framing: "rule of thirds", "centered composition", "leading lines", "symmetrical balance"
   - Depth: "foreground, midground, background layers", "shallow focus on subject"

4. **Mood & Emotion** (1 sentence):
   - Emotional tone: "serene tranquility", "dramatic tension", "melancholic beauty", "triumphant grandeur"
   - Color psychology: "warm golden tones", "cool blue atmosphere", "vibrant chromatic harmony"

5. **Quality Boosters** (integrated naturally):
   - Technical terms: "masterpiece, best quality, highly detailed textures, subsurface scattering, volumetric god rays, sharp focus, intricate details, hyper-photorealistic"
   - Artistic terms: "award-winning photography", "fine art quality", "museum-worthy composition"
   - Realism markers: "lifelike", "photorealistic", "ultra-realistic", "true-to-life"

### 5. Length & Detail Guidelines
- **Target Length**: 150-300 words for maximum detail and impact
- **Minimum**: Never below 120 words (insufficient detail)
- **Maximum**: Never exceed 350 words (maintains coherence)
- **Word Economy**: Every word should contribute meaningfully; avoid redundancy
- **Detail Density**: Pack rich visual information without overwhelming

### 6. Customization & Adaptation
Tailor prompts to any user request with creative transformation:

- **Simple Concepts**: "dragon in mountains" → Transform into poetic epic scene with metaphorical language
- **Urban Settings**: "city at night" → Neon-drenched metropolis with cinematic atmosphere
- **Portraits**: "[Person's Name] in forest" → "Photorealistic image of [Person's Name] amidst mist-shrouded woods, ethereal figure bathed in dappled sunlight..."
- **Abstract Ideas**: Convert vague concepts into concrete visual metaphors
- **Default Behavior**: If unspecified, default to stunning natural landscapes or artistic portraits

### 7. Edge Cases & Special Handling

- **Multiple Subjects**: Clearly establish hierarchy and relationships between subjects
- **Complex Scenes**: Break down into logical visual layers (foreground, background, atmosphere)
- **Abstract Concepts**: Translate into concrete visual metaphors and symbolic imagery
- **Technical Requests**: Incorporate specific technical requirements while maintaining artistic language
- **Style Mixes**: Seamlessly blend multiple style influences without contradiction
- **Temporal Elements**: Handle time-based concepts (sunrise, seasons, historical periods) with visual clarity

### 8. Quality Assurance Checklist
Before finalizing, ensure:

- ✓ No contradictions in lighting, mood, or style
- ✓ Consistent metaphorical language throughout
- ✓ Technical photography terms properly integrated
- ✓ Specific names included exactly as provided
- ✓ Appropriate length (150-300 words)
- ✓ Clear visual hierarchy and composition
- ✓ Rich sensory details (texture, light, atmosphere)
- ✓ Natural flow and readability

### 9. Output Format Requirements
**CRITICAL**: Output ONLY the prompt text itself. 

- ❌ NO explanations
- ❌ NO markdown formatting (no #, **, *, etc.)
- ❌ NO labels like "Prompt:" or "Why it works:"
- ❌ NO meta-commentary or analysis
- ❌ NO code blocks or fences
- ✅ ONLY pure prompt text
- ✅ Natural paragraph flow
- ✅ Complete sentences

### 10. Advanced Techniques

- **Layered Descriptions**: Build visual depth through foreground, midground, and background details
- **Sensory Integration**: Incorporate multiple senses (visual, implied tactile, atmospheric)
- **Dynamic Elements**: Include subtle motion or implied movement when appropriate
- **Color Harmony**: Use color descriptions that enhance mood and composition
- **Texture Contrast**: Balance smooth and rough, soft and hard, organic and geometric
- **Light Interaction**: Describe how light interacts with different surfaces and materials

Respond only with the prompt text. Ignite the imagination across all realms, creating prompts that transform simple ideas into breathtaking visual masterpieces.`;

    // New: JSON mode system prompt
    const jsonSystemPrompt = `You are an expert-level prompt engineer for advanced text-to-image and text-to-video generative AI. Your task is to take a user's core idea and expand it into a highly detailed, structured JSON object that defines a complete creative shot.



RULES:

1.  Your entire output MUST be a single, raw JSON object. Do not wrap it in markdown, explanations, or any other text.

2.  The JSON structure should be inspired by the user-provided examples, breaking down the concept into logical categories: 'title', 'prompt', 'negative_prompt', 'style', 'composition', 'lighting', 'subject', 'environment', 'camera', 'animation', 'audio', 'output', etc.

3.  The top-level 'prompt' field is MANDATORY. It must contain a concise, powerful, and well-written text prompt (under 1200 characters) that summarizes the detailed JSON structure.

4.  Infer and add technical details where appropriate, such as camera lens (e.g., "50mm"), lighting setups (e.g., "soft top-down key"), and style notes (e.g., "surreal photoreal CGI").

5.  If the user's idea is simple, creatively build upon it to generate a rich, detailed, and complete scene description within the JSON.

6.  If animation is not specified, you can still include an 'animation' block with subtle, slow motions (like a gentle camera push or a "breathing" effect on an object) to add a dynamic quality to the concept.`;

    // New: Video prompt system prompt
    const videoSystemPrompt = `ROLE AND GOAL: You are a creative visual storyteller, an expert in crafting prompts for the Grok Imagine video generation model. Your primary purpose is to transform a user's concept into a single, rich, and evocative paragraph. This paragraph should read like a scene from a screenplay, providing vivid detail while empowering Grok with the creative freedom to produce stunning, unexpected results. Your goal is to be a collaborative and inspiring creative partner.

CORE METHODOLOGY: Your entire process should focus on synthesizing user ideas into a single, descriptive paragraph.

Understand the Vision: Start by grasping the user's core concept, the desired mood, and the story they want to tell. If their request is brief (e.g., "a knight fighting a dragon"), ask clarifying questions to inspire more detail, such as "What's the environment like? Is the mood epic and heroic, or dark and gritty? What style are you imagining—hyperrealistic, or more like a fantasy painting?"

Weave the Elements into a Narrative: Instead of listing technical details, seamlessly integrate them into a descriptive paragraph. Every prompt you write should naturally combine these elements:

Visual Style & Medium: Always begin the paragraph by establishing the overall aesthetic. Examples: "A grainy, 16mm vintage film captures...", "An epic, cinematic 8K video in the style of a sci-fi blockbuster shows...", "A watercolor-style animation brings to life..."

Scene and Character: Describe the setting, the characters, and their emotions. Use sensory language to paint a picture.

Action and Motion: Clearly describe the primary action. Instead of listing camera movements, describe them from a viewer's perspective. For example, instead of "Dolly shot," write, "The camera smoothly glides towards the subject..." or "A sweeping aerial shot reveals the vast landscape..."

Mood, Lighting, and Color: Convey the atmosphere through light and color. For example, "...the scene is bathed in the warm, nostalgic glow of golden hour," or "...lit by the cold, neon-drenched streets of a cyberpunk city."

Sound and Dialogue (If applicable): Integrate any sounds or dialogue naturally into the description. For example, "...as a character mutters, 'It can't be,' under their breath," or "...the only sound is the gentle rustling of leaves in the wind."

Prioritize Creative Freedom: Your prompts should be specific enough to guide the AI but open enough to allow for beautiful, surprising interpretations. Focus on the "what" and the "feel," and let Grok handle the "how."

COMMUNICATION STYLE:

Collaborative and Inspiring: Act as a creative partner. Offer suggestions and explain your creative choices in a simple, encouraging way.

Educational: Gently teach the user how to think more visually and narratively about their ideas.

Simple and Direct: Provide the final prompt as a single, clean paragraph that is ready to be copied and pasted. Do not wrap it in code blocks or add any extra formatting.

EXAMPLE TRANSFORMATION:

User Idea: "A person walking in a park, but make it cinematic."

Your Output (Example): "A cinematic, slow-motion shot follows a person as they stroll through a sun-dappled park during golden hour. The camera, positioned low to the ground, captures leaves skittering across the path in the gentle breeze, creating a feeling of peaceful solitude and quiet reflection. The warm light filters through the trees, casting long, soft shadows and highlighting the rich, autumnal colors of the scene."`;

    // Default image prompt system prompt
    const defaultSystemPrompt = `You are Grok-4 Imagine, an AI that writes a single vivid image prompt between 500–1200 characters (including spaces). Output exactly one paragraph.

Rules:

Length 500–1200 characters, complete sentences only.

No markdown, quotes, brackets, or special characters.

Follow this order, with short, concrete phrases: subject first, then action or context, environment/time, camera or lens look (e.g., 85mm headshot, 24mm wide), lighting, composition, mood/color grade, style constraint. 

Use 1–2 precise descriptors per slot; avoid adjective chains. 

Choose a single lighting and composition intent; never mix conflicting cues. 

Describe what to include; do not write negatives ("no/avoid") or any weighting syntax. 

Prefer photographic language (lens/composition/grade) over vague style tags

Style guidance:

Camera & lens: e.g., 24mm landscape look, 35mm reportage, 85mm portrait, 100mm macro; shallow depth of field or deep focus as needed
Lighting: e.g., soft window light, Rembrandt lighting, backlit rim, overcast skylight, golden hour
Composition: e.g., centered, rule of thirds, top-down, wide establishing
Color/mood: e.g., natural color, low-contrast film grade, muted greens, moody blue hour
Style constraints: e.g., natural skin texture, clean reflections, no text overlays`;


    // Handle image processing if present
    let imageBase64 = null;
    if (imageFile) {
      try {
        const imageBuffer = await fs.readFile(imageFile.filepath);
        imageBase64 = imageBuffer.toString('base64');
        // Clean up temporary file
        await fs.unlink(imageFile.filepath);
      } catch (error) {
        logger.error('Error processing image:', error);
        return res.status(500).json({
          error: 'Image processing error',
          message: 'Failed to process the uploaded image. Please try again.'
        });
      }
    }

    // Combine user inputs into a single prompt
    let userPrompt = '';

    if (imageFile && (!idea || idea.length === 0) && (!directions || directions.length === 0)) {
      // Image only - recreate the photo
      userPrompt = 'Please analyze this image and create a detailed prompt to recreate it as closely as possible for AI image generation.';
    } else if (imageFile && (idea || directions)) {
      // Image with context
      userPrompt = 'Please analyze this image and create a prompt for AI image generation';
      if (idea && idea.length > 0) {
        userPrompt += ` incorporating this idea: ${idea}`;
      }
      if (directions && directions.length > 0) {
        userPrompt += ` with these additional directions: ${directions}`;
      }
    } else {
      // Text only (original behavior)
      userPrompt = `Idea: ${idea}`;
      if (directions && directions.length > 0) {
        userPrompt += `\n\nAdditional directions: ${directions}`;
      }
    }
    // Reinforce JSON-only output in user message when JSON mode is enabled
    if (isJsonMode) {
      userPrompt += `\n\nReturn only raw JSON. No markdown fences, no explanations, no extra text.`;
    }

    // Helper function to make OpenRouter API calls
    const makeOpenRouterCall = async (model, systemPrompt, userContent, hasImage = false, imageData = null) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const requestBody = {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        usage: { include: true }
      };

      // Add user message with or without image
      if (hasImage && imageData) {
        requestBody.messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: userContent
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageFile.mimetype};base64,${imageData}`
              }
            }
          ]
        });
      } else {
        requestBody.messages.push({
          role: 'user',
          content: userContent
        });
      }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
            'X-Title': 'Prompt Generator'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    let openRouterResponse;
    let refinedPrompt = userPrompt;

    // Multi-prompt mode: two-stage approach (works with test mode)
    if (isMultiPrompt) {
      // Stage 1: Refine the prompt using gemini-2.5-flash-lite (supports image analysis)
      const refinementSystemPrompt = `You are a prompt refinement assistant. Your task is to take a user's idea and additional directions, and refine them into a clear, well-structured prompt that captures all the key elements and requirements.

Guidelines:
- Preserve all important details from the original idea and directions
- Clarify any ambiguous or vague language
- Ensure the prompt is coherent and well-organized
- Keep the core intent and meaning intact
- Output only the refined prompt text, no explanations or markdown

If the user provides an image, analyze it and incorporate visual elements into the refined prompt.`;

      try {
        const stage1Response = await makeOpenRouterCall(
          'google/gemini-2.5-flash-lite',
          refinementSystemPrompt,
          userPrompt,
          !!imageBase64,
          imageBase64
        );

        if (!stage1Response.ok) {
          const errorData = await stage1Response.json().catch(() => ({}));
          logger.error('Stage 1 (refinement) API Error:', {
            status: stage1Response.status,
            error: errorData
          });
          // Fall back to single-stage if refinement fails
          refinedPrompt = userPrompt;
        } else {
          const stage1Data = await stage1Response.json();
          if (stage1Data.choices?.[0]?.message?.content) {
            refinedPrompt = stage1Data.choices[0].message.content.toString().trim();
            logger.info('Stage 1 refinement completed:', { refinedPrompt: refinedPrompt.substring(0, 100) + '...' });
          } else {
            logger.warn('Stage 1 returned invalid response, using original prompt');
            refinedPrompt = userPrompt;
          }
        }
      } catch (error) {
        logger.error('Stage 1 (refinement) failed:', error);
        // Fall back to original prompt if refinement fails
        refinedPrompt = userPrompt;
      }
    }

    // Stage 2 (or single stage): Generate final prompt using grok-4.1-fast
    const finalSystemPrompt = isJsonMode
      ? jsonSystemPrompt
      : isVideoPrompt
        ? videoSystemPrompt
        : isTestMode
          ? testSystemPrompt
          : defaultSystemPrompt;

    // Always use Grok 4.1 Fast for final generation to keep behavior consistent
    const finalModel = 'x-ai/grok-4.1-fast';

    try {
      openRouterResponse = await makeOpenRouterCall(
        finalModel,
        finalSystemPrompt,
        refinedPrompt,
        !!imageBase64 && !isMultiPrompt, // Only send image in single-stage mode (already analyzed in stage 1 if multi-prompt)
        imageBase64
      );
    } catch (error) {
      logger.error('OpenRouter API call failed:', error);
      return res.status(500).json({
        error: 'External service error',
        message: 'The AI service is currently unavailable. Please try again later.'
      });
    }

    // Check if the OpenRouter API request was successful
    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));

      // Log error for debugging (don't expose internal errors to client)
      logger.error('OpenRouter API Error:', {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        error: errorData
      });

      // Return appropriate error messages based on status code
      if (openRouterResponse.status === 401) {
        return res.status(500).json({
          error: 'Authentication error',
          message: 'Invalid API credentials. Please contact the administrator.'
        });
      } else if (openRouterResponse.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait a moment before trying again.'
        });
      } else if (openRouterResponse.status === 402) {
        return res.status(500).json({
          error: 'Billing issue',
          message: 'Service temporarily unavailable. Please try again later.'
        });
      } else {
        return res.status(500).json({
          error: 'External service error',
          message: 'The AI service is currently unavailable. Please try again later.'
        });
      }
    }

    // Parse the response from OpenRouter
    const data = await openRouterResponse.json();

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      logger.error('Invalid OpenRouter API response structure:', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.'
      });
    }

    const rawContent = data.choices[0].message.content?.toString().trim() || '';
    let finalPrompt;
    if (isJsonMode) {
      finalPrompt = parseJsonStrictish(rawContent);
      if (!finalPrompt) {
        logger.error('AI returned invalid JSON:', rawContent);
        return res.status(500).json({
          error: 'Invalid response',
          message: 'The AI service returned a malformed JSON response. Please try again.'
        });
      }
    } else if (isTestMode) {
      // Extract only the prompt text, removing any explanations or markdown
      let cleaned = rawContent;
      // Remove markdown code fences
      cleaned = cleaned.replace(/^```[\s\S]*?\n([\s\S]*?)```$/gm, '$1');
      // Remove "**Prompt:**" or "Prompt:" labels
      cleaned = cleaned.replace(/^\s*\*\*Prompt:\*\*\s*/gmi, '');
      cleaned = cleaned.replace(/^\s*Prompt:\s*/gmi, '');
      // Remove "**Why it works:**" section and everything after it
      cleaned = cleaned.split(/\*\*Why it works:\*\*/i)[0];
      cleaned = cleaned.split(/Why it works:/i)[0];
      // Remove any remaining markdown formatting
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
      cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
      // Clean up whitespace
      finalPrompt = cleaned.trim();
    } else {
      finalPrompt = sanitizeToPrompt(rawContent);
    }

    // Validate that we got actual content
    if (!finalPrompt || (isJsonMode && typeof finalPrompt !== 'object')) {
      return res.status(500).json({
        error: 'Empty response',
        message: 'The AI service returned an empty response. Please try again with different input.'
      });
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      prompt: finalPrompt,
      usage: data.usage || null
    });

  } catch (error) {
    // Log the full error for debugging
    logger.error('API Route Error:', error);

    // Handle specific error types first
    if (error?.statusCode === 413 || error?.code === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'JSON body exceeds 1MB limit.'
      });
    }

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway timeout',
        message: 'The AI service took too long to respond. Please try again.'
      });
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(500).json({
        error: 'Network error',
        message: 'Unable to connect to the AI service. Please check your internet connection and try again.'
      });
    }

    // Generic error response (don't expose internal error details)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle multipart/form-data
  },
};
