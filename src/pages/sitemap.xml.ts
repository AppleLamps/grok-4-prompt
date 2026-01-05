import type { GetServerSideProps } from 'next';
import { SEO_PAGES } from '@/config/seo';
import { getSiteUrl, toCanonicalUrl } from '@/utils/seo';

// Static lastmod dates for better crawl signals
const PAGES_LASTMOD: Record<string, string> = {
  '/': '2026-01-05',
  '/privacy': '2026-01-05',
  '/terms': '2026-01-05',
};

function buildSitemapXml(urls: { loc: string; lastmod: string }[]): string {
  const items = urls
    .map(
      (u) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}
</urlset>
`;
}

function SitemapXml() {
  // getServerSideProps sends the XML response; this component never renders.
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const siteUrl = getSiteUrl() || 'https://www.grokifyprompt.com';

  const urlList = [
    SEO_PAGES.home.path,
    SEO_PAGES.privacy.path,
    SEO_PAGES.terms.path,
  ].map((path) => ({
    loc: toCanonicalUrl(path, siteUrl),
    lastmod: PAGES_LASTMOD[path] || new Date().toISOString().split('T')[0],
  }));

  const xml = buildSitemapXml(urlList);

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  // Cache at the edge; refresh daily, allow SWR for resilience.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default SitemapXml;

