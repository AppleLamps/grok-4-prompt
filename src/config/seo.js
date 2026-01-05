// Centralized SEO configuration for GROKIFY_PROMPT v2.0.
// Keep this file as the single source of truth for titles, descriptions, and keyword targeting.

export const SEO_SITE_NAME = 'GROKIFY_PROMPT';
export const SEO_APP_NAME = 'GROKIFY_PROMPT v2.0';

// Prefer setting this in production (e.g. Vercel Project → Environment Variables).
// If missing, pages will fall back to relative canonicals/OG URLs.
export const SEO_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

export const SEO_DEFAULT_TITLE = `${SEO_APP_NAME} — AI Prompt Generator & Image Prompt Maker`;
export const SEO_TITLE_TEMPLATE = `%s | ${SEO_SITE_NAME}`;

export const SEO_DEFAULT_DESCRIPTION =
  'Create production-grade Grok-4 prompts in seconds. GROKIFY_PROMPT is an AI prompt generator and image prompt maker for prompt engineering, text-to-image, and text-to-video workflows.';

export const SEO_KEYWORDS = [
  'AI prompt generator',
  'image prompt maker',
  'Grok-4 prompts',
  'prompt engineering tool',
  'text to image prompt',
  'text to video prompt',
  'OpenRouter',
  'Grok prompt generator',
];

export const SEO_TWITTER_HANDLE = '@lamps_apple';

// Social share image (1200x630). Place at public/og.png.
export const SEO_OG_IMAGE_PATH = '/og.png';
export const SEO_OG_IMAGE_ALT =
  'GROKIFY_PROMPT v2.0 — AI prompt generator and image prompt maker';

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
      'GROKIFY_PROMPT is an AI prompt generator and image prompt maker that turns ideas (and optional reference images) into detailed Grok-4 prompts for AI generation workflows.',
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
];

