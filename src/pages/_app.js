import '@/styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Prompt Generator - Transform Ideas into Perfect AI Prompts</title>
        <meta name="description" content="A premium AI prompt generator powered by OpenRouter's Grok-4 model. Transform your ideas into detailed, optimized prompts for AI systems." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Prompt Generator" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Prompt Generator - Transform Ideas into Perfect AI Prompts" />
        <meta property="og:description" content="A premium AI prompt generator powered by OpenRouter's Grok-4 model." />
        <meta property="og:site_name" content="Prompt Generator" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Prompt Generator - Transform Ideas into Perfect AI Prompts" />
        <meta property="twitter:description" content="A premium AI prompt generator powered by OpenRouter's Grok-4 model." />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Theme */}
        <meta name="theme-color" content="#495057" />
        <meta name="color-scheme" content="light dark" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}