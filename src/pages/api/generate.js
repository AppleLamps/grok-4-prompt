// /pages/api/generate.js
// Secure API route for OpenRouter integration
// This route handles all OpenRouter API calls server-side to protect the API key

import { IncomingForm } from 'formidable';
import fs from 'fs';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({ points: 5, duration: 60 }); // 5 requests per minute

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  // Rate limiting - 5 requests per minute per IP
  try {
    await rateLimiter.consume(req.headers['x-forwarded-for'] || 'anonymous', 1);
  } catch {
    return res.status(429).json({ 
      error: 'Too many requests', 
      message: 'Please wait before trying again.' 
    });
  }

  // Parse form data (including files)
  const form = new IncomingForm({
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
    keepExtensions: true,
  });

  try {
    const [fields, files] = await form.parse(req);
    
    const idea = fields.idea ? fields.idea[0] : '';
    const directions = fields.directions ? fields.directions[0] : '';
    const imageFile = files.image ? files.image[0] : null;
    // New: JSON mode flag from form fields (string -> boolean)
    const isJsonMode = fields.isJsonMode?.[0] === 'true';

    // Validate that we have either an idea or an image
    if ((!idea || idea.trim().length === 0) && !imageFile) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Either an "idea" or an image must be provided'
      });
    }

    // Check for API key in environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key is not configured. Please contact the administrator.'
      });
    }

    // Ensure the response is a single, clean prompt without markdown/preambles
    const sanitizeToPrompt = (raw) => {
      try {
        let t = (raw || '').toString().trim();

        // Remove code fences if present
        t = t.replace(/^```(?:[a-zA-Z0-9]+)?\s*[\r\n]?([\s\S]*?)\s*```$/m, '$1').trim();

        // If there are horizontal rule separators, take the last section
        if (t.includes('---')) {
          const parts = t.split(/\n?---+\n?/g).map(p => p.trim()).filter(Boolean);
          if (parts.length) t = parts[parts.length - 1];
        }

        // If there is a label like "Final Prompt:" or "Prompt for AI Image Generation:", take text after it
        const labelMatch = t.match(/(?:^|\n)\s*(?:final\s*)?prompt[^:]*:\s*/i);
        if (labelMatch) {
          t = t.slice(labelMatch.index + labelMatch[0].length).trim();
        }

        // Strip common markdown decorations
        t = t
          .replace(/^#+\s*/gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/^[>\-\s]*\*/gm, '')
          .replace(/^>\s*/gm, '');

        // Collapse whitespace to single spaces
        t = t.replace(/\s+/g, ' ').trim();

        // Enforce 1024 characters max, cut at word boundary
        if (t.length > 1024) {
          t = t.slice(0, 1024);
          const lastSpace = t.lastIndexOf(' ');
          if (lastSpace > 0) t = t.slice(0, lastSpace);
        }

        return t;
      } catch {
        return (raw || '').toString().trim();
      }
    };

    // Helper: extract and parse JSON robustly from model output
    const parseJsonStrictish = (raw) => {
      if (!raw || typeof raw !== 'string') return null;
      const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

      let candidate = raw.trim().replace(/^\uFEFF/, '');

      // 1) direct parse
      let parsed = tryParse(candidate);
      if (parsed) return parsed;

      // 2) fenced code block
      const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) {
        candidate = fenceMatch[1].trim();
        parsed = tryParse(candidate);
        if (parsed) return parsed;
      }

      // 3) extract between first { and last }
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        candidate = candidate.slice(firstBrace, lastBrace + 1).trim();
        parsed = tryParse(candidate);
        if (parsed) return parsed;
      }

      // 4) normalize curly quotes and remove common artifacts
      candidate = candidate.replace(/[\u201C\u201D]/g, '"');
      candidate = candidate.replace(/\r\n/g, '\n');
      candidate = candidate.replace(/,\s*([}\]])/g, '$1'); // trailing commas

      parsed = tryParse(candidate);
      if (parsed) return parsed;

      // 5) attempt to close unbalanced braces by appending '}' a few times
      for (let i = 1; i <= 6; i++) {
        parsed = tryParse(candidate + '}'.repeat(i));
        if (parsed) return parsed;
      }

      // 6) progressive trimming: try to find the largest prefix that parses (also try adding braces)
      const maxAttempts = Math.min(candidate.length, 2000);
      for (let end = candidate.length; end > Math.max(0, candidate.length - maxAttempts); end--) {
        const snippet = candidate.slice(0, end).trim();
        // skip obviously too short snippets
        if (snippet.length < 10) break;
        let p = tryParse(snippet);
        if (p) return p;
        // try closing braces
        for (let j = 1; j <= 4; j++) {
          p = tryParse(snippet + '}'.repeat(j));
          if (p) return p;
        }
      }

      // 7) as a last resort, try to remove last incomplete key/value pairs (naive regex)
      // remove trailing '"key":' or '"key": <incomplete>' patterns
      let fallback = candidate.replace(/\s*"[^"]+"\s*:\s*[^,}\]]+$/s, '').trim();
      // ensure it ends with a brace before parsing attempts
      if (!fallback.endsWith('}')) fallback += '}';
      parsed = tryParse(fallback);
      if (parsed) return parsed;

      return null;
    };

    // New: JSON mode system prompt
    const jsonSystemPrompt = `You are an expert-level prompt engineer for advanced text-to-image and text-to-video generative AI. Your task is to take a user's core idea and expand it into a highly detailed, structured JSON object that defines a complete creative shot.



RULES:

1.  Your entire output MUST be a single, raw JSON object. Do not wrap it in markdown, explanations, or any other text.

2.  The JSON structure should be inspired by the user-provided examples, breaking down the concept into logical categories: 'title', 'prompt', 'negative_prompt', 'style', 'composition', 'lighting', 'subject', 'environment', 'camera', 'animation', 'audio', 'output', etc.

3.  The top-level 'prompt' field is MANDATORY. It must contain a concise, powerful, and well-written text prompt (under 500 characters) that summarizes the detailed JSON structure.

4.  Infer and add technical details where appropriate, such as camera lens (e.g., "50mm"), lighting setups (e.g., "soft top-down key"), and style notes (e.g., "surreal photoreal CGI").

5.  If the user's idea is simple, creatively build upon it to generate a rich, detailed, and complete scene description within the JSON.

6.  If animation is not specified, you can still include an 'animation' block with subtle, slow motions (like a gentle camera push or a "breathing" effect on an object) to add a dynamic quality to the concept.`;


    // Handle image processing if present
    let imageBase64 = null;
    if (imageFile) {
      try {
        const imageBuffer = fs.readFileSync(imageFile.filepath);
        imageBase64 = imageBuffer.toString('base64');
        // Clean up temporary file
        fs.unlinkSync(imageFile.filepath);
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({
          error: 'Image processing error',
          message: 'Failed to process the uploaded image. Please try again.'
        });
      }
    }

    // Combine user inputs into a single prompt
    let userPrompt = '';
    
    if (imageFile && (!idea || idea.trim().length === 0) && (!directions || directions.trim().length === 0)) {
      // Image only - recreate the photo
      userPrompt = 'Please analyze this image and create a detailed prompt to recreate it as closely as possible for AI image generation.';
    } else if (imageFile && (idea || directions)) {
      // Image with context
      userPrompt = 'Please analyze this image and create a prompt for AI image generation';
      if (idea && idea.trim().length > 0) {
        userPrompt += ` incorporating this idea: ${idea.trim()}`;
      }
      if (directions && directions.trim().length > 0) {
        userPrompt += ` with these additional directions: ${directions.trim()}`;
      }
    } else {
      // Text only (original behavior)
      userPrompt = `Idea: ${idea.trim()}`;
      if (directions && directions.trim().length > 0) {
        userPrompt += `\n\nAdditional directions: ${directions.trim()}`;
      }
    }
    // Reinforce JSON-only output in user message when JSON mode is enabled
    if (isJsonMode) {
      userPrompt += `\n\nReturn only raw JSON. No markdown fences, no explanations, no extra text.`;
    }

    // Prepare request body for OpenRouter API
    const requestBody = {
      model: 'x-ai/grok-4',
      messages: [
        {
          role: 'system',
          content: isJsonMode ? jsonSystemPrompt : `You are Grok-4 Imagine, an AI that writes a single vivid image prompt under 500 characters (including spaces). Output exactly one paragraph.

Rules:

Length 300–500 characters, complete sentences only.

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
Style constraints: e.g., natural skin texture, clean reflections, no text overlays`
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
    if (imageBase64) {
      requestBody.messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageFile.mimetype};base64,${imageBase64}`
            }
          }
        ]
      });
    } else {
      requestBody.messages.push({
        role: 'user',
        content: userPrompt
      });
    }

    // Make request to OpenRouter API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

    // Check if the OpenRouter API request was successful
    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));

      // Log error for debugging (don't expose internal errors to client)
      console.error('OpenRouter API Error:', {
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
      console.error('Invalid OpenRouter API response structure:', data);
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
        console.error('AI returned invalid JSON:', rawContent);
        return res.status(500).json({
          error: 'Invalid response',
          message: 'The AI service returned a malformed JSON response. Please try again.'
        });
      }
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
    console.error('API Route Error:', error);

    // Check for specific error types
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