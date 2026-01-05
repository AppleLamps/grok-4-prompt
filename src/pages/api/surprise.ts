import type { NextApiHandler } from 'next';
import logger from '../../utils/logger';
import { SURPRISE_SYSTEM_PROMPT } from '../../config/prompts';
import { OPENROUTER_MODELS } from '../../config/constants';
import { makeRateKey, rateLimiter } from '../../utils/api-helpers';
import {
  makeOpenRouterCall,
  mapOpenRouterError,
  sendOpenRouterError,
  type JsonSchemaWrapper,
  type JsonSchemaResponseFormat,
  type OpenRouterRequestBody,
} from '../../services/openRouterService';
import {
  parseStructuredContent,
  ensureTextPrompt,
  type PromptTextPayload,
  type StructuredPayload,
  type ChatCompletionResponse,
} from '../../utils/openRouterParsers';

type SurpriseResponse =
  | { prompt: string; usage: unknown }
  | { error: string; message?: string };

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
} satisfies JsonSchemaWrapper;

const handler: NextApiHandler<SurpriseResponse> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = makeRateKey(req);
    await rateLimiter.consume(key, 1);
  } catch {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before trying again.',
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.error('OPENROUTER_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const responseFormat: JsonSchemaResponseFormat = {
      type: 'json_schema',
      json_schema: PROMPT_ONLY_SCHEMA,
    };

    const requestBody: OpenRouterRequestBody = {
      model: OPENROUTER_MODELS.PRIMARY,
      messages: [
        {
          role: 'system',
          content: SURPRISE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
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
    };

    const response = await makeOpenRouterCall({
      apiKey,
      body: requestBody,
      title: 'Prompt Generator - Surprise Me',
    });

    if (!response.ok) {
      const errorInfo = await mapOpenRouterError(response);
      logger.error('OpenRouter API Error (surprise):', {
        status: response.status,
        details: errorInfo.details,
      });
      return sendOpenRouterError(res, errorInfo);
    }

    const data = (await response.json()) as ChatCompletionResponse;

    if (!data?.choices?.[0]?.message?.content) {
      logger.error('Invalid OpenRouter API response structure (surprise):', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.',
      });
    }

    let parsedPayload: StructuredPayload;
    try {
      parsedPayload = parseStructuredContent(data.choices[0].message.content);
    } catch (parseError) {
      logger.error('Failed to parse structured response from OpenRouter (surprise):', parseError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned a malformed response. Please try again.',
      });
    }

    let finalPrompt: string;
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

    return res.status(200).json({ prompt: finalPrompt, usage: data.usage || null });
  } catch (error: any) {
    logger.error('Surprise API Error:', error);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'The AI service timed out. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to generate a surprise prompt.', message: error?.message });
  }
};

export default handler;

