import { Html, Head, Main, NextScript } from 'next/document';
import { SEO_LANG, SEO_THEME_COLOR } from '../config/seo';

export default function Document() {
  return (
    <Html lang={SEO_LANG}>
      <Head>
        <meta name="theme-color" content={SEO_THEME_COLOR} />
        <meta name="google-site-verification" content="6kiXAxVTCoZs1RvIo5ESuVqmfz3jG1qPnTdLmdFuSSU" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* Resource hints */}
        <link rel="preconnect" href="https://openrouter.ai" />
        <link rel="dns-prefetch" href="https://openrouter.ai" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

