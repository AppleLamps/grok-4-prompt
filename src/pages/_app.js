import '@/styles/globals.css'
import { useEffect } from 'react'
import { cacheManager } from '@/utils/performance'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Only run this in browser
    if (typeof window !== 'undefined') {
      if (process.env.NODE_ENV === 'production') {
        // Only register SW in production
        cacheManager.registerServiceWorker()
        
        // Performance monitoring in production only
        if (window.performanceMonitor) {
          window.performanceMonitor.trackPageLoad()
        }
        
        // Image optimization in production only
        if (window.imageOptimizer) {
          window.imageOptimizer.lazyLoadImages()
        }
      } else {
        // In development, aggressively clean up any caches/SWs that might interfere
        const id = setTimeout(async () => {
          try {
            await cacheManager.unregisterServiceWorkers?.()
            await cacheManager.clearAllCaches?.()
          } catch (e) {
            // Silently ignore errors to avoid breaking development
          }
        }, 100) // Small delay to avoid race conditions
        return () => clearTimeout(id)
      }
    }
  }, [])

  return <Component {...pageProps} />
}
