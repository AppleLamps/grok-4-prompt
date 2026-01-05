import Head from 'next/head';
import {
  SEO_APP_NAME,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  SEO_KEYWORDS,
  SEO_LOCALE,
  SEO_OG_IMAGE_ALT,
  SEO_OG_IMAGE_PATH,
  SEO_SITE_NAME,
  SEO_TWITTER_HANDLE,
} from '@/config/seo';
import { getSiteUrl, stringifyJsonLd, toCanonicalUrl } from '@/utils/seo';

export type SeoHeadProps = {
  /** Page-specific title. If omitted, uses site default. */
  title?: string;
  /** Page-specific description. If omitted, uses site default. */
  description?: string;
  /** Path for canonical URL generation, e.g. "/" or "/privacy". */
  path?: string;
  /** Explicit canonical URL override (absolute or relative). */
  canonical?: string;
  /** Open Graph image (absolute or relative). Defaults to a dynamic OG image route. */
  ogImage?: string;
  /** Alt text for Open Graph image. */
  ogImageAlt?: string;
  /** Whether to prevent indexing. Useful for error pages. */
  noindex?: boolean;
  /** Whether to prevent following links. Rarely needed. */
  nofollow?: boolean;
  /** One or more JSON-LD objects to embed in <head>. */
  jsonLd?: unknown | unknown[];
};

function buildTitle(title?: string): string {
  if (!title) return SEO_DEFAULT_TITLE;
  // If the page title already contains the site name, don't template it again.
  if (title.toLowerCase().includes(SEO_SITE_NAME.toLowerCase())) return title;
  return `${title} | ${SEO_SITE_NAME}`;
}

export default function SeoHead({
  title,
  description,
  path,
  canonical,
  ogImage,
  ogImageAlt,
  noindex = false,
  nofollow = false,
  jsonLd,
}: SeoHeadProps) {
  const siteUrl = getSiteUrl();
  const fullTitle = buildTitle(title);
  const metaDescription = description || SEO_DEFAULT_DESCRIPTION;

  const canonicalUrl = toCanonicalUrl(canonical || path || '/', siteUrl);

  const ogImageUrl = toCanonicalUrl(ogImage || SEO_OG_IMAGE_PATH, siteUrl);
  const ogAlt = ogImageAlt || SEO_OG_IMAGE_ALT;

  const robotsDirectives = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow',
    // Encourage richer previews where allowed.
    'max-snippet:-1',
    'max-image-preview:large',
    'max-video-preview:-1',
  ].join(', ');

  const jsonLdList = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={SEO_KEYWORDS.join(', ')} />
      <meta name="application-name" content={SEO_APP_NAME} />
      <meta name="author" content={SEO_SITE_NAME} />
      <meta name="robots" content={robotsDirectives} />
      <meta name="googlebot" content={robotsDirectives} />

      {/* Canonical */}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {/* hreflang for internationalization */}
      {canonicalUrl ? (
        <>
          <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
          <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        </>
      ) : null}

      {/* Open Graph */}
      <meta property="og:site_name" content={SEO_SITE_NAME} />
      <meta property="og:locale" content={SEO_LOCALE} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {ogImageUrl ? <meta property="og:image" content={ogImageUrl} /> : null}
      {ogAlt ? <meta property="og:image:alt" content={ogAlt} /> : null}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {SEO_TWITTER_HANDLE ? <meta name="twitter:site" content={SEO_TWITTER_HANDLE} /> : null}
      {SEO_TWITTER_HANDLE ? <meta name="twitter:creator" content={SEO_TWITTER_HANDLE} /> : null}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {ogImageUrl ? <meta name="twitter:image" content={ogImageUrl} /> : null}
      {ogAlt ? <meta name="twitter:image:alt" content={ogAlt} /> : null}

      {/* JSON-LD */}
      {jsonLdList.map((item, idx) => (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(item) }}
          key={`jsonld-${idx}`}
          type="application/ld+json"
        />
      ))}
    </Head>
  );
}

