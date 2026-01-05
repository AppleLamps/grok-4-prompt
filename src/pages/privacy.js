import { useMemo } from 'react';
import Link from 'next/link';
import SeoHead from '../components/SeoHead';
import { SEO_PAGES } from '../config/seo';
import { buildBreadcrumbSchema, buildWebPageSchema, getBaseSchemas, getSchemaSiteUrl } from '../utils/schema';

export default function PrivacyPage() {
  const seoJsonLd = useMemo(() => {
    const siteUrl = getSchemaSiteUrl();
    const base = getBaseSchemas(siteUrl);
    return [
      base.organization,
      base.webSite,
      buildBreadcrumbSchema(siteUrl, [
        { name: 'Home', path: '/' },
        { name: 'Privacy Policy', path: SEO_PAGES.privacy.path },
      ]),
      buildWebPageSchema({
        siteUrl,
        path: SEO_PAGES.privacy.path,
        title: SEO_PAGES.privacy.title,
        description: SEO_PAGES.privacy.description,
      }),
    ];
  }, []);

  return (
    <>
      <SeoHead
        title={SEO_PAGES.privacy.title}
        description={SEO_PAGES.privacy.description}
        path={SEO_PAGES.privacy.path}
        jsonLd={seoJsonLd}
      />

      <div className="min-h-screen py-8 px-4 lg:px-6 relative z-10 flex items-start justify-center bg-neural-bg">
        <div className="max-w-3xl w-full mx-auto">
          <div className="glass-ui">
            <header className="neural-header">
              <div className="flex flex-col gap-1">
                <Link href="/" className="neural-brand font-mono hover:text-neural-accent transition-colors">
                  <span className="text-neural-muted">{'// '}</span>GROKIFY_PROMPT <span className="text-neural-accent">v2.0</span>
                </Link>
                <p className="text-xs text-neural-dim font-mono uppercase tracking-wider">
                  Privacy policy and data handling
                </p>
              </div>
              <div className="neural-status">
                <span className="neural-status-dot" />
                SYSTEM ONLINE
              </div>
            </header>

            <main className="p-6 space-y-6">
              <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-wider text-neural-dim">
                <ol className="flex flex-wrap items-center gap-2">
                  <li>
                    <Link href="/" className="hover:text-neural-accent transition-colors">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-neural-white">
                    Privacy
                  </li>
                </ol>
              </nav>

              <div className="neural-section">
                <h1 className="neural-section-header">01 // PRIVACY_POLICY</h1>
                <div className="space-y-3 text-sm leading-relaxed text-neural-muted">
                  <p>
                    Last updated: <time dateTime="2026-01-05">January 5, 2026</time>
                  </p>
                  <p>
                    This page explains what data GROKIFY_PROMPT processes, where it is stored, and what third-party
                    services are involved when you generate prompts.
                  </p>
                </div>
              </div>

              <div className="neural-section">
                <h2 className="neural-section-header">02 // DATA_WE_COLLECT</h2>
                <div className="space-y-3 text-sm leading-relaxed text-neural-muted">
                  <p>
                    GROKIFY_PROMPT does not require an account. We do not ask for your name, email, or other identifying
                    information.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Prompt inputs:</strong> your idea text, modifier text, and optional reference image are
                      used to generate a prompt.
                    </li>
                    <li>
                      <strong>Local history:</strong> generated prompts may be stored in your browser&apos;s local
                      storage if you use the history feature.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="neural-section">
                <h2 className="neural-section-header">03 // THIRD_PARTY_SERVICES</h2>
                <div className="space-y-3 text-sm leading-relaxed text-neural-muted">
                  <p>
                    Prompt generation is performed by a third-party AI provider through OpenRouter. Your inputs are sent
                    to the provider to produce the output prompt.
                  </p>
                  <p>
                    Voice dictation uses your browser&apos;s speech recognition when available. If a polyfill is used,
                    speech processing may be performed by the underlying vendor. GROKIFY_PROMPT does not store audio.
                  </p>
                </div>
              </div>

              <div className="neural-section">
                <h2 className="neural-section-header">04 // SECURITY</h2>
                <div className="space-y-3 text-sm leading-relaxed text-neural-muted">
                  <p>
                    API keys are handled server-side via Next.js API routes. Your OpenRouter API key is not shipped to
                    the browser.
                  </p>
                  <p>
                    For additional safety, avoid submitting sensitive personal data in prompts. Treat prompts like
                    content you would be comfortable sharing with an AI service provider.
                  </p>
                </div>
              </div>

              <div className="neural-section">
                <h2 className="neural-section-header">05 // CONTACT</h2>
                <div className="space-y-2 text-sm leading-relaxed text-neural-muted">
                  <p>
                    Questions about this privacy policy? Return to the{' '}
                    <Link href="/" className="text-neural-accent hover:underline">
                      prompt generator
                    </Link>{' '}
                    or review the{' '}
                    <Link href="/terms" className="text-neural-accent hover:underline">
                      terms of service
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </main>
          </div>

          <footer className="text-center py-6 space-y-2">
            <div className="neural-divider mb-4" />
            <nav aria-label="Footer links" className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono uppercase tracking-wider text-neural-dim">
              <Link href="/" className="hover:text-neural-accent transition-colors">
                HOME
              </Link>
              <Link href="/terms" className="hover:text-neural-accent transition-colors">
                TERMS
              </Link>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/sitemap.xml" className="hover:text-neural-accent transition-colors">
                SITEMAP
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
}

