// Performance monitoring utilities
export const performanceMonitor = {
  // Track page load metrics
  trackPageLoad: () => {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0];
      if (navigation) {
        console.log('Page Load Metrics:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: navigation.responseStart - navigation.fetchStart,
          ttfb: navigation.responseStart - navigation.requestStart,
        });
      }
    }
  },

  // Track custom metrics
  trackCustomMetric: (name, value) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name, { detail: value });
    }
  },

  // Measure API response times
  measureApiCall: async (url, method = 'GET') => {
    const start = performance.now();
    try {
      const response = await fetch(url, { method });
      const end = performance.now();
      const duration = end - start;
      
      console.log(`API Call: ${method} ${url} took ${duration.toFixed(2)}ms`);
      
      // Send to analytics if available
      if (typeof gtag !== 'undefined') {
        gtag('event', 'timing_complete', {
          name: 'api_call',
          value: Math.round(duration),
          event_category: 'performance',
        });
      }
      
      return response;
    } catch (error) {
      const end = performance.now();
      console.error(`API Call failed: ${method} ${url} after ${end - start}ms`, error);
      throw error;
    }
  },

  // Check if browser supports performance API
  isSupported: () => {
    return typeof window !== 'undefined' && 
           window.performance && 
           window.performance.getEntriesByType;
  },

  // Get performance summary
  getSummary: () => {
    if (!performanceMonitor.isSupported()) return null;
    
    const navigation = window.performance.getEntriesByType('navigation')[0];
    const paint = window.performance.getEntriesByType('paint');
    
    return {
      navigation,
      paint,
      memory: window.performance.memory || null,
      resources: window.performance.getEntriesByType('resource').slice(-10),
    };
  }
};

// Image optimization utilities
export const imageOptimizer = {
  // Check WebP support
  supportsWebP: () => {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },

  // Get optimal image format
  getOptimalFormat: () => {
    return imageOptimizer.supportsWebP() ? 'webp' : 'jpeg';
  },

  // Preload critical images
  preloadImage: (src) => {
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.src = src;
    }
  },

  // Lazy load images
  lazyLoadImages: () => {
    if (typeof IntersectionObserver !== 'undefined') {
      const images = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    }
  }
};

// Cache utilities
export const cacheManager = {
  // Check if service worker is supported
  isServiceWorkerSupported: () => {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  },

  // Register service worker
  registerServiceWorker: async () => {
    if (cacheManager.isServiceWorkerSupported()) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  },

  // Unregister all service workers (useful in development to avoid caching issues)
  unregisterServiceWorkers: async () => {
    if (cacheManager.isServiceWorkerSupported()) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        // Also try to reload the page to detach controlled clients
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        console.log('Service Workers unregistered');
      } catch (e) {
        console.warn('Failed to unregister Service Workers', e);
      }
    }
  },

  // Clear all caches (Cache Storage API)
  clearAllCaches: async () => {
    try {
      if (typeof caches !== 'undefined') {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
        console.log('All caches cleared');
      }
    } catch (e) {
      console.warn('Failed to clear caches', e);
    }
  },

  // Cache API responses
  cacheApiResponse: async (key, data, ttl = 3600000) => { // 1 hour default
    if (typeof caches !== 'undefined') {
      const cache = await caches.open('api-cache');
      const response = new Response(JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl
      }));
      await cache.put(key, response);
    }
  },

  // Get cached response
  getCachedResponse: async (key) => {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open('api-cache');
      const response = await cache.match(key);
      if (response) {
        const cached = await response.json();
        if (Date.now() - cached.timestamp < cached.ttl) {
          return cached.data;
        }
        // prune expired entry
        await cache.delete(key);
      }
    }
    return null;
  }
};

// Export for global use
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
  window.imageOptimizer = imageOptimizer;
  window.cacheManager = cacheManager;
}
