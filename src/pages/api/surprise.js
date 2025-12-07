import logger from '../../utils/logger';
import { SURPRISE_SYSTEM_PROMPT } from '../../config/prompts';
import { makeRateKey, rateLimiter } from '../../utils/api-helpers';

const PROMPT_ONLY_SCHEMA = {
  name: 'prompt_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      prompt: {
        type: 'string',
        description: 'Fully formatted prompt string for the user',
      },
    },
    required: ['prompt'],
  },
  strict: true,
};

const extractMessageText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }
  if (content && typeof content === 'object') {
    return JSON.stringify(content);
  }
  if (content && typeof content.text === 'string') return content.text;
  return '';
};

const parseStructuredContent = (content) => {
  const raw = extractMessageText(content);
  if (!raw) throw new Error('Empty AI response');
  return JSON.parse(raw);
};

const ensureTextPrompt = (payload) => {
  if (!payload || typeof payload !== 'object' || typeof payload.prompt !== 'string') {
    throw new Error('Invalid structured prompt payload');
  }
  return payload.prompt.trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.error('OPENROUTER_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const responseFormat = {
      type: 'json_schema',
      json_schema: PROMPT_ONLY_SCHEMA,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'Prompt Generator - Surprise Me'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4.1-fast', // Using Grok-4.1-fast
        messages: [
          {
            role: 'system',
            content: SURPRISE_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            // Simple user prompt, as all guidance is in the system prompt
            content: 'Create an extraordinary image prompt now.',
          },
        ],
        temperature: 1.2,
        max_tokens: 400,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.4,
        usage: { include: true },
        response_format: responseFormat,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OpenRouter API Error (surprise):', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      if (response.status === 401) {
        return res.status(500).json({ error: 'Authentication error', message: 'Invalid API credentials. Please contact the administrator.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded', message: 'Too many requests. Please wait a moment before trying again.' });
      }
      if (response.status === 402) {
        return res.status(500).json({ error: 'Billing issue', message: 'Service temporarily unavailable. Please try again later.' });
      }
      return res.status(500).json({ error: 'External service error', message: 'The AI service is currently unavailable. Please try again later.' });
    }

    const data = await response.json();

    if (!data?.choices?.[0]?.message?.content) {
      logger.error('Invalid OpenRouter API response structure (surprise):', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.',
      });
    }

    let parsedPayload;
    try {
      parsedPayload = parseStructuredContent(data.choices[0].message.content);
    } catch (parseError) {
      logger.error('Failed to parse structured response from OpenRouter (surprise):', parseError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned a malformed response. Please try again.',
      });
    }

    let finalPrompt;
    try {
      finalPrompt = ensureTextPrompt(parsedPayload);
    } catch (validationError) {
      logger.error('Structured response validation failed (surprise):', validationError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned an invalid response. Please try again.',
      });
    }

    if (!finalPrompt) {
      return res.status(500).json({
        error: 'Empty response',
        message: 'The AI service returned an empty response. Please try again with different input.',
      });
    }

    res.status(200).json({ prompt: finalPrompt, usage: data.usage || null });
  } catch (error) {
    logger.error('Surprise API Error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'The AI service timed out. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to generate a surprise prompt.', details: error.message });
  }
}
