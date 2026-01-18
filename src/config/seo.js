// Centralized SEO configuration for GROKIFY_PROMPT v2.0.
// Keep this file as the single source of truth for titles, descriptions, and keyword targeting.

export const SEO_SITE_NAME = 'GROKIFY_PROMPT';
export const SEO_APP_NAME = 'GROKIFY_PROMPT v2.0';

// Prefer setting this in production (e.g. Vercel Project → Environment Variables).
// If missing, pages will fall back to relative canonicals/OG URLs.
export const SEO_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

export const SEO_DEFAULT_TITLE = `${SEO_APP_NAME} — Grok Imagine JSON Prompt Generator`;
export const SEO_TITLE_TEMPLATE = `%s | ${SEO_SITE_NAME}`;

export const SEO_DEFAULT_DESCRIPTION =
  'Generate Grok Imagine JSON prompts instantly. GROKIFY_PROMPT is an AI prompt generator for xAI Grok Imagine—create structured JSON prompts, image-to-video prompts, and text-to-image workflows with full parameter control.';

export const SEO_KEYWORDS = [
  'AI prompt generator',
  'image prompt maker',
  'GROK IMAGINE PROMPTS',
  'prompt engineering tool',
  'text to image prompt',
  'text to video prompt',
  'OpenRouter',
  'Grok prompt generator',
  'grok imagine json prompt',
  'grok ai prompts generator',
  'grok imagine image to video json prompt parameters',
  // Additional keywords from GSC data
  'grok imagine prompt generator',
  'grok imagine prompt format json',
  'grok imagine image to video frame rate',
  'grok xai',
  'xAI grok imagine',
  'grok imagine api',
  '30 fps json prompt',
  'image to video fps',
  'grok imagine json prompt video',
  'grok imagine json prompt parameters',
];

export const SEO_TWITTER_HANDLE = '@lamps_apple';

// Social share image (1200x630). Place at public/og.png.
export const SEO_OG_IMAGE_PATH = '/og.png';
export const SEO_OG_IMAGE_ALT =
  'GROKIFY_PROMPT v2.0 — Grok Imagine JSON prompt generator for xAI image and video workflows';

export const SEO_THEME_COLOR = '#0a0a0a';
export const SEO_LOCALE = 'en_US';
export const SEO_LANG = 'en';

export const SEO_PAGES = {
  home: {
    path: '/',
    title: SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
  },
  privacy: {
    path: '/privacy',
    title: `Privacy Policy`,
    description: 'Learn how GROKIFY_PROMPT handles data, local history storage, and OpenRouter requests.',
  },
  terms: {
    path: '/terms',
    title: `Terms of Service`,
    description: 'Terms of service for using GROKIFY_PROMPT, including acceptable use and limitations.',
  },
};

export const SEO_FAQ = [
  {
    question: 'What is GROKIFY_PROMPT v2.0?',
    answer:
      'GROKIFY_PROMPT is an AI prompt generator and image prompt maker that turns ideas (and optional reference images) into detailed GROK IMAGINE PROMPTS for AI generation workflows.',
  },
  {
    question: 'Can it generate prompts for AI image generation?',
    answer:
      'Yes. It creates structured, high-signal prompts optimized for common text-to-image patterns, including style, lighting, mood, camera, and composition guidance.',
  },
  {
    question: 'Can I upload a reference image?',
    answer:
      'Yes. You can upload a reference image to recreate it closely, or combine an image with text directions to remix and enhance it.',
  },
  {
    question: 'Does the app store my prompts?',
    answer:
      'Generated prompts can be saved to a local history in your browser. GROKIFY_PROMPT does not require an account to use.',
  },
  {
    question: 'Is my API key exposed in the browser?',
    answer:
      'No. OpenRouter API calls are made server-side via Next.js API routes so your API key is not shipped to the client.',
  },
  {
    question: 'What makes this a prompt engineering tool?',
    answer:
      'It helps you standardize prompt structure (subject, style, composition, constraints) and quickly iterate variants to improve output quality and consistency.',
  },
  {
    question: 'Does GROKIFY_PROMPT generate JSON prompts for Grok Imagine?',
    answer:
      'Yes. GROKIFY_PROMPT outputs structured JSON prompts compatible with Grok Imagine, including all parameters for style, composition, lighting, and mood in a ready-to-use format.',
  },
  {
    question: 'Can I generate image to video JSON prompt parameters?',
    answer:
      'Yes. GROKIFY_PROMPT supports generating JSON prompt parameters for both image generation and image-to-video workflows, making it easy to create animated content from static concepts.',
  },
  {
    question: 'What is the JSON prompt format for Grok Imagine?',
    answer:
      'GROKIFY_PROMPT generates structured JSON prompts in the Grok Imagine format, including fields for scene, subjects, style, color_palette, lighting, mood, background, composition, and camera parameters. The JSON output is ready to use with xAI Grok image generation.',
  },
  {
    question: 'Can I set frame rate and fps for image to video generation?',
    answer:
      'Yes. When generating image-to-video prompts, GROKIFY_PROMPT creates scene descriptions optimized for video generation workflows. Frame rate settings like 30 fps are typically configured in your video generation tool (such as xAI Grok Imagine) rather than in the prompt itself.',
  },
  {
    question: 'Does this work with xAI Grok Imagine API?',
    answer:
      'Yes. GROKIFY_PROMPT generates prompts compatible with xAI Grok Imagine. The structured JSON format and detailed scene descriptions work seamlessly with the Grok Imagine API for both image and video generation.',
  },
  {
    question: 'Is GROKIFY_PROMPT a Grok Imagine prompt generator?',
    answer:
      'Yes. GROKIFY_PROMPT is designed specifically as a Grok Imagine prompt generator. It creates detailed, production-ready prompts optimized for xAI Grok image and video generation, with support for JSON format output.',
  },
];

