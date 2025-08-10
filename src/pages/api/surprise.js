// /pages/api/surprise.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // **OPTIMIZED SYSTEM PROMPT FOR SHORTER RESPONSES**
  const systemPrompt = `You are Grok-4 Imagine, an AI that generates creative, vivid image prompts. Your task is to create a single, detailed, and imaginative scene description that is UNDER 500 CHARACTERS (including spaces).

  **CRITICAL RULES:**
  1. Response MUST be a single paragraph, 300-500 characters long
  2. NO markdown, formatting, or special characters
  3. NO quotes, brackets, or other delimiters
  4. Complete sentences only - never cut off mid-word
  5. Focus on one clear, vivid scene or concept
  6. Include visual details, mood, and atmosphere
  7. Be creative and unexpected in your combinations

  **Example Structure (do not include these instructions in output):**
  [Vibrant/Serene/Epic] scene of [main subject] in/on/at [setting], with [key details], [lighting], [mood/atmosphere], [art style if relevant].

  **Inspiration (mix and match elements):**
  - Settings: Cyberpunk cities, alien landscapes, dream worlds, microscopic realms, cosmic vistas
  - Subjects: Mythical creatures, futuristic technology, surreal architecture, natural wonders
  - Styles: Hyperrealistic, painterly, digital art, cinematic, concept art, retro-futuristic
  - Moods: Awe, wonder, mystery, tranquility, energy, melancholy, whimsy

  **IMPORTANT:** Count your characters and ensure the final output is between 300-500 characters.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'Prompt Generator - Surprise Me'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-3', // Using Grok-3 for consistency
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            // Simple user prompt, as all guidance is in the system prompt
            content: 'Create an extraordinary image prompt now.',
          },
        ],
        temperature: 1.2, // Balanced temperature for creativity without excessive verbosity
        max_tokens: 150, // Limit tokens to keep response under 500 chars
        top_p: 0.9, // Slightly more focused than before
        frequency_penalty: 0.5, // Discourage repetition
        presence_penalty: 0.4, // Encourage topic diversity
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    const sanitizeToPrompt = (raw) => {
      try {
        let t = (raw || '').toString().trim();

        // 1. Remove any markdown or formatting
        t = t.replace(/^```(?:[a-zA-Z0-9]+)?\s*[\r\n]?([\s\S]*?)\s*```$/m, '$1').trim();
        t = t.replace(/^[#*>-]+\s*/gm, '');
        t = t.replace(/\*\*(.*?)\*\*/g, '$1');
        t = t.replace(/\*(.*?)\*/g, '$1');
        t = t.replace(/`([^`]+)`/g, '$1');
        t = t.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

        // 2. Remove common preambles and labels
        const preambles = [
          /^(?:Here's your|Your new|The requested|An amazing|A unique|Here is a|This is an?|Prepare for a|Concept|Prompt|Image Concept|Description)[:.]?\s*/i,
          /^(?:Final )?(?:Prompt|Concept|Image idea|Image Description|Generated Prompt|AI Response)[:.]?\s*/i,
          /^(?:"|'|\u201C|\u2018|\u201D|\u2019|"|'|"|'|\/|\(|\[|\{|«|»|\||\-|\*|\+|=|_|#|@|>|<|~|`|\^|\$|%|&|\?|!|;|:|\.|,|\s)*/,
          /(?:"|'|\u201C|\u2018|\u201D|\u2019|"|'|"|'|\/|\)|\]|\}|«|»|\||\-|\*|\+|=|_|#|@|>|<|~|`|\^|\$|%|&|\?|!|;|:|\.|,|\s)*$/,
          /^\s*[\r\n]+\s*/,
          /\s*[\r\n]+\s*$/,
          /\s*[\r\n]+\s*/g,
        ];
        
        preambles.forEach(regex => {
          t = t.replace(regex, '').trim();
        });

        // 3. Clean up any remaining special characters or numbers at start/end
        t = t.replace(/^[^a-zA-Z\u00C0-\u017F]+/, '').trim();
        t = t.replace(/[^a-zA-Z\u00C0-\u017F\s.,!?-]+$/, '').trim();

        // 4. Normalize whitespace
        t = t.replace(/\s+/g, ' ').trim();

        // 5. Strict length enforcement (400-500 chars)
        const MAX_LENGTH = 500;
        const MIN_LENGTH = 300;
        
        if (t.length > MAX_LENGTH) {
          t = t.slice(0, MAX_LENGTH);
          // Find last sentence end or word boundary
          const lastPeriod = t.lastIndexOf('. ');
          const lastExcl = t.lastIndexOf('! ');
          const lastQ = t.lastIndexOf('? ');
          const lastBoundary = Math.max(lastPeriod, lastExcl, lastQ);
          
          if (lastBoundary > MIN_LENGTH) {
            t = t.slice(0, lastBoundary + 1);
          } else {
            // Fallback: find last space before max length
            const lastSpace = t.lastIndexOf(' ', MAX_LENGTH);
            if (lastSpace > MIN_LENGTH) {
              t = t.slice(0, lastSpace) + '.';
            }
          }
        }

        // Final validation
        if (t.length < 100 || t.length > 500) {
          console.warn('Prompt length out of bounds:', t.length, 'characters');
          if (t.length > 500) {
            t = t.slice(0, 497) + '...';
          }
        }
        
        return t;
      } catch (e) {
        console.error("Sanitization error:", e, "Raw input:", raw);
        // Fallback: return trimmed raw string if sanitization fails, but still enforce length
        const fallback = (raw || '').toString().trim().slice(0, 500);
        return fallback.length > 100 ? fallback : 'A stunning landscape with vibrant colors and incredible detail, featuring unique natural formations and atmospheric lighting.';
      }
    };

    const raw = data?.choices?.[0]?.message?.content ?? '';
    const generatedPrompt = sanitizeToPrompt(raw);

    if (!generatedPrompt) {
      console.error('Model returned empty or malformed content after sanitization:', { raw_response: data?.choices?.[0]?.message?.content, sanitized_output: generatedPrompt });
      return res.status(500).json({ error: 'Empty or malformed response from model after processing.' });
    }

    res.status(200).json({ prompt: generatedPrompt });
  } catch (error) {
    console.error('Surprise API Error:', error);
    res.status(500).json({ error: 'Failed to generate a surprise prompt.', details: error.message });
  }
}