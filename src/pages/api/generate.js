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

    // Prepare request body for OpenRouter API
    const requestBody = {
      model: 'x-ai/grok-4',
      messages: [
        {
          role: 'system',
          content: `You are Grok-4 Imagine, an AI that writes a single vivid image prompt under 500 characters (including spaces). Output exactly one paragraph.

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

    const generatedPromptRaw = data.choices[0].message.content?.toString().trim() || '';
    const generatedPrompt = sanitizeToPrompt(generatedPromptRaw);

    // Validate that we got actual content
    if (!generatedPrompt) {
      return res.status(500).json({
        error: 'Empty response',
        message: 'The AI service returned an empty response. Please try again with different input.'
      });
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      prompt: generatedPrompt,
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