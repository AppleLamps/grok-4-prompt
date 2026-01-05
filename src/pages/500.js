import Link from 'next/link';
import SeoHead from '../components/SeoHead';

export default function Custom500() {
  return (
    <>
      <SeoHead
        title="Server error"
        description="An unexpected error occurred. Return to the GROKIFY_PROMPT AI prompt generator and try again."
        canonical="/"
        noindex
      />

      <div className="min-h-screen py-10 px-4 lg:px-6 relative z-10 flex items-center justify-center bg-neural-bg">
        <div className="max-w-2xl w-full mx-auto">
          <div className="glass-ui">
            <header className="neural-header">
              <div className="neural-brand font-mono">
                <span className="text-neural-muted">{'// '}</span>GROKIFY_PROMPT <span className="text-neural-accent">v2.0</span>
              </div>
              <div className="neural-status">
                <span className="neural-status-dot" />
                SYSTEM ONLINE
              </div>
            </header>

            <main className="p-6 space-y-4">
              <div className="neural-section">
                <h1 className="neural-section-header">500 // SYSTEM_ERROR</h1>
                <p className="text-sm leading-relaxed text-neural-muted">
                  Something went wrong on our side. Please retry in a moment.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/" className="neural-btn">
                    RETURN_HOME
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

