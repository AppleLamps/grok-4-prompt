import { useState, useCallback, useEffect } from 'react'
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

// Help icon for the floating help button
const HelpIcon = ({ className }) => (
  <svg 
    className={className} 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <point cx="12" cy="17" r="1"></point>
  </svg>
)

// Close icon for modal
const CloseIcon = ({ className }) => (
  <svg 
    className={className} 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

// Help Modal Component
const HelpModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-premium-800 text-premium">
            How to Use
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-premium-100 transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>
        
        <div className="space-y-4 text-premium-700 leading-relaxed">
          <div>
            <h4 className="font-semibold text-premium-800 mb-2">📝 Describe Your Idea</h4>
            <p>Enter your creative concept, project idea, or vision in the first text area. Be as detailed as you'd like!</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-premium-800 mb-2">🎯 Add Directions (Optional)</h4>
            <p>Provide specific requirements, style preferences, constraints, or any additional context to refine your prompt.</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-premium-800 mb-2">✨ Generate & Copy</h4>
            <p>Click "Generate Prompt" to create your optimized prompt, then use the copy button to save it to your clipboard.</p>
          </div>
          
          <div className="bg-premium-50 rounded-xl p-4 border border-premium-200/30">
            <h4 className="font-semibold text-premium-800 mb-2">⌨️ Keyboard Shortcut</h4>
            <p className="text-sm">Press <kbd className="px-2 py-1 bg-premium-200 rounded text-premium-700 font-mono">Ctrl + Enter</kbd> (or <kbd className="px-2 py-1 bg-premium-200 rounded text-premium-700 font-mono">Cmd + Enter</kbd> on Mac) to generate your prompt quickly!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [idea, setIdea] = useState('')
  const [directions, setDirections] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle component mounting for animations
  useEffect(() => {
    setMounted(true)
  }, [])

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
        <title>Grok 4 Imagine Prompt Generator - Transform your ideas into vivid, high-quality prompts</title>
        <meta name="description" content="Create professional, optimized prompts for AI image generation with our premium Grok 4 Imagine prompt generator. Fast, intuitive, and powerful." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      <div className="min-h-screen py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Card */}
          <div className={`glass-card p-8 sm:p-12 ${mounted ? 'animate-slide-in' : 'opacity-0'}`}>
            {/* Header */}
            <header className="text-center mb-12 sm:mb-16">
              <div className={`${mounted ? 'animate-fade-in-up-delay-1' : 'opacity-0'}`}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gradient mb-4 sm:mb-6 tracking-tight text-premium leading-tight">
                  Grok 4 Imagine <br className="hidden sm:block" /> 
                  <span className="block sm:inline">Prompt Generator</span>
                </h1>
                <p className="text-lg sm:text-xl text-premium-600 font-medium opacity-90 max-w-3xl mx-auto leading-relaxed">
                  Transform your ideas into vivid, high-quality prompts for Grok 4 Imagine
                </p>
              </div>
            </header>

            {/* Form */}
            <main>
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 mb-8 sm:mb-12" onKeyDown={handleKeyDown}>
                {/* Idea Input */}
                <div className={`${mounted ? 'animate-fade-in-up-delay-1' : 'opacity-0'}`}>
                  <label htmlFor="idea" className="label-text">
                    Describe your idea
                  </label>
                  <textarea
                    id="idea"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    className="input-field resize-y min-h-[120px] sm:min-h-[140px]"
                    placeholder="Enter your idea or concept here..."
                    required
                    rows={4}
                    style={{ fontSize: '16px' }} // Prevents iOS zoom
                  />
                </div>

                {/* Directions Input */}
                <div className={`${mounted ? 'animate-fade-in-up-delay-2' : 'opacity-0'}`}>
                  <label htmlFor="directions" className="label-text">
                    Additional directions <span className="optional-text">(optional)</span>
                  </label>
                  <textarea
                    id="directions"
                    value={directions}
                    onChange={(e) => setDirections(e.target.value)}
                    className="input-field resize-y min-h-[100px] sm:min-h-[120px]"
                    placeholder="Add any specific requirements, style preferences, or constraints..."
                    rows={3}
                    style={{ fontSize: '16px' }} // Prevents iOS zoom
                  />
                </div>

                {/* Generate Button */}
                <div className={`${mounted ? 'animate-fade-in-up-delay-3' : 'opacity-0'}`}>
                  <button
                    type="submit"
                    disabled={isLoading || !idea.trim()}
                    className="premium-button min-h-[56px] sm:min-h-[64px] relative text-base sm:text-lg font-semibold"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner absolute"></div>
                        <span className="opacity-0">Generate Prompt</span>
                      </div>
                    ) : (
                      <span className="relative z-10">Generate Prompt</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Output Section */}
              {showOutput && (
                <div 
                  id="output-section" 
                  className="animate-fade-in mb-8 sm:mb-12"
                >
                  <div className="output-card">
                    {/* Output Header */}
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-premium-200/20 bg-premium-50/50 backdrop-blur-sm">
                      <h3 className="text-base sm:text-lg font-semibold text-premium-800 tracking-wide text-premium">
                        Generated Prompt
                      </h3>
                      {!error && generatedPrompt && (
                        <button
                          onClick={handleCopy}
                          className={`copy-button ${copied ? 'copied' : ''}`}
                          title={copied ? 'Copied!' : 'Copy to clipboard'}
                          type="button"
                        >
                          {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      )}
                    </div>

                    {/* Output Content */}
                    <div className="p-4 sm:p-6 lg:p-8">
                      {error ? (
                        <div className="error-content">
                          {error}
                        </div>
                      ) : generatedPrompt ? (
                        <div className="text-sm sm:text-base leading-relaxed text-premium-800 whitespace-pre-wrap font-medium">
                          {generatedPrompt}
                        </div>
                      ) : (
                        <div className="text-premium-400 italic opacity-70 text-sm sm:text-base">
                          Your generated prompt will appear here...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="text-center pt-8 sm:pt-12 border-t border-premium-200/20">
              <p className="text-xs sm:text-sm text-premium-500 opacity-80 font-medium">
                Powered by OpenRouter API – Model: x-ai/grok-4
              </p>
            </footer>
          </div>
        </div>

        {/* Floating Help Button */}
        <button
          onClick={() => setShowHelp(true)}
          className="help-button animate-float"
          aria-label="Open help"
          title="How to use"
        >
          <HelpIcon />
        </button>

        {/* Help Modal */}
        <HelpModal 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
        />
      </div>
    </>
  )
}