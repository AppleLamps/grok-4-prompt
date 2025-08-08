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
          content: 'You are a prompt generator that creates detailed, optimized prompts for AI systems. Transform the user\'s idea into a comprehensive, well-structured prompt that will produce the best possible results. Make the prompt clear, specific, and actionable.'
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

    const generatedPrompt = data.choices[0].message.content.trim();

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