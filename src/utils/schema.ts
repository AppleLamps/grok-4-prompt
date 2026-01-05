import organizationTemplate from '@/config/schema/organization.json';
import webApplicationTemplate from '@/config/schema/webApplication.json';
import webSiteTemplate from '@/config/schema/webSite.json';
import howToTemplate from '@/config/schema/howTo.json';
import { SEO_FAQ } from '@/config/seo';
import { getSiteUrl, replacePlaceholdersDeep, toCanonicalUrl } from '@/utils/seo';

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function getSchemaSiteUrl(): string {
  // JSON-LD strongly prefers absolute URLs. In development this fallback is acceptable.
  return getSiteUrl() || 'http://localhost:3000';
}

export function getBaseSchemas(siteUrl: string) {
  const replacements = { '{{SITE_URL}}': siteUrl };
  return {
    organization: replacePlaceholdersDeep(organizationTemplate, replacements),
    webSite: replacePlaceholdersDeep(webSiteTemplate, replacements),
    webApplication: replacePlaceholdersDeep(webApplicationTemplate, replacements),
    howTo: replacePlaceholdersDeep(howToTemplate, replacements),
  };
}

export function buildFaqSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${siteUrl}/#faq`,
    mainEntity: SEO_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(siteUrl: string, items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${siteUrl}/#breadcrumbs`,
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: toCanonicalUrl(item.path, siteUrl),
    })),
  };
}

export function buildWebPageSchema(args: {
  siteUrl: string;
  path: string;
  title: string;
  description: string;
  includeSpeakable?: boolean;
}) {
  const canonical = toCanonicalUrl(args.path, args.siteUrl);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonical,
    url: canonical,
    name: args.title,
    description: args.description,
    isPartOf: { '@id': `${args.siteUrl}/#website` },
    publisher: { '@id': `${args.siteUrl}/#organization` },
    inLanguage: 'en',
  };

  // Add speakable specification for voice search optimization
  if (args.includeSpeakable) {
    schema.speakable = {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#about', '#faq'],
    };
  }

  return schema;
}

