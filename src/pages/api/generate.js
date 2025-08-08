// /pages/api/generate.js
// Secure API route for OpenRouter integration
// This route handles all OpenRouter API calls server-side to protect the API key

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  try {
    const { idea, directions } = req.body;

    // Validate required input
    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'The "idea" field is required and must be a non-empty string'
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


    // Combine user inputs into a single prompt
    let userPrompt = `Idea: ${idea.trim()}`;
    if (directions && typeof directions === 'string' && directions.trim().length > 0) {
      userPrompt += `\n\nAdditional directions: ${directions.trim()}`;
    }

    // Prepare request body for OpenRouter API
    const requestBody = {
      model: 'x-ai/grok-4',
      messages: [
        {
          role: 'system',
          content: `You are GrokBot, an AI prompt generator. Your task is to create a comprehensive, vivid, and descriptive narrative prompt based on the user’s input.



- Always assume the user’s input—whether text, idea, or image description—is a request for prompt creation.
- The prompt must be rich in detail and stay under 1024 characters.
- Incorporate specific details such as colors, mood, style, medium, subject matter, composition, perspective, dynamic elements, emotion, narrative context, time period, culture, symbolism, and text integration when relevant.
- Ensure the prompt is clear, actionable, and directly aligned with the user’s intent.
- If the input contains a person’s name, include it in the prompt.
- Use creative and precise language to make the prompt ready for AI image generation or storytelling.
- Output ONLY the final prompt as plain text. Do not include any headings, labels, markdown, backticks, explanations, or extra paragraphs—just the prompt text.`
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    // Make request to OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'Prompt Generator'
      },
      body: JSON.stringify(requestBody)
    });

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
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};