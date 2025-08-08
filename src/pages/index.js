import { useState, useCallback } from 'react'
import Head from 'next/head'

// Copy icon component
const CopyIcon = ({ className }) => (
  <svg 
    className={className} 
    width="18" 
    height="18" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
)

// Check icon for copy success
const CheckIcon = ({ className }) => (
  <svg 
    className={className} 
    width="18" 
    height="18" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
)

export default function Home() {
  const [idea, setIdea] = useState('')
  const [directions, setDirections] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [copied, setCopied] = useState(false)

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    // Validate input
    if (!idea.trim()) {
      setError('Please describe your idea first.')
      return
    }

    setIsLoading(true)
    setError('')
    setShowOutput(false)
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idea: idea.trim(),
          directions: directions.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate prompt')
      }

      setGeneratedPrompt(data.prompt)
      setShowOutput(true)
      
      // Scroll to output after a short delay
      setTimeout(() => {
        document.getElementById('output-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        })
      }, 100)

    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setShowOutput(true)
    } finally {
      setIsLoading(false)
    }
  }, [idea, directions])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!generatedPrompt || error) return

    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = generatedPrompt
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
    }
  }, [generatedPrompt, error])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isLoading) {
        handleSubmit(e)
      }
    }
  }, [handleSubmit, isLoading])

  return (
    <>
      <Head>
        <title>Grok 4 Imagine Prompt Generator - Transform your ideas into vivid, high-quality prompts for Grok 4 Imagine</title>
      </Head>

      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Card */}
          <div className="glass-card p-12 animate-fade-in-up">
            {/* Header */}
            <header className="text-center mb-16">
              <div className="animate-fade-in-up">
                <h1 className="text-6xl font-bold text-gradient mb-4 tracking-tight">
                  Grok 4 Imagine <br /> Prompt Generator
                </h1>
                <p className="text-xl text-primary-600 font-medium opacity-90">
                  Transform your ideas into vivid, high-quality prompts for Grok 4 Imagine
                </p>
              </div>
            </header>

            {/* Form */}
            <main>
              <form onSubmit={handleSubmit} className="space-y-8 mb-12" onKeyDown={handleKeyDown}>
                {/* Idea Input */}
                <div className="animate-fade-in-up-delay-1">
                  <label htmlFor="idea" className="label-text">
                    Describe your idea
                  </label>
                  <textarea
                    id="idea"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    className="input-field resize-y min-h-[120px]"
                    placeholder="Enter your idea or concept here..."
                    required
                    rows={4}
                  />
                </div>

                {/* Directions Input */}
                <div className="animate-fade-in-up-delay-2">
                  <label htmlFor="directions" className="label-text">
                    Additional directions <span className="optional-text">(optional)</span>
                  </label>
                  <textarea
                    id="directions"
                    value={directions}
                    onChange={(e) => setDirections(e.target.value)}
                    className="input-field resize-y min-h-[100px]"
                    placeholder="Add any specific requirements, style preferences, or constraints..."
                    rows={3}
                  />
                </div>

                {/* Generate Button */}
                <div className="animate-fade-in-up-delay-3">
                  <button
                    type="submit"
                    disabled={isLoading || !idea.trim()}
                    className="premium-button min-h-[64px] relative"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner absolute"></div>
                        <span className="opacity-0">Generate Prompt</span>
                      </div>
                    ) : (
                      <span>Generate Prompt</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Output Section */}
              {showOutput && (
                <div 
                  id="output-section" 
                  className="animate-fade-in mb-12"
                >
                  <div className="output-card">
                    {/* Output Header */}
                    <div className="flex justify-between items-center p-6 border-b border-black/5 bg-white/50 backdrop-blur-sm">
                      <h3 className="text-lg font-semibold text-primary-800 tracking-wide">
                        Generated Prompt
                      </h3>
                      {!error && generatedPrompt && (
                        <button
                          onClick={handleCopy}
                          className={`copy-button ${copied ? 'copied' : ''}`}
                          title="Copy to clipboard"
                          type="button"
                        >
                          {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      )}
                    </div>

                    {/* Output Content */}
                    <div className="p-8">
                      {error ? (
                        <div className="error-content p-6">
                          {error}
                        </div>
                      ) : generatedPrompt ? (
                        <div className="text-base leading-relaxed text-primary-800 whitespace-pre-wrap font-medium">
                          {generatedPrompt}
                        </div>
                      ) : (
                        <div className="text-primary-400 italic opacity-70">
                          Your generated prompt will appear here...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="text-center pt-12 border-t border-primary-200/30">
              <p className="text-sm text-primary-500 opacity-80 font-medium">
                Powered by OpenRouter API – Model: x-ai/grok-4
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  )
}