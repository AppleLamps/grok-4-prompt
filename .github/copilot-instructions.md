# Copilot Instructions

## Project Overview
This is a premium AI prompt generator for Grok-4 Imagine, built with Next.js 14 using pages router. The app transforms user ideas into optimized prompts via OpenRouter's Grok-4 model, featuring image upload, voice input, and "Emily's JSON Mode" for structured outputs.

## Architecture Patterns

### Client-Server Security Model
- **API keys NEVER exposed to client**: All OpenRouter calls happen server-side in `/pages/api/*`
- **Rate limiting**: Uses `rate-limiter-flexible` with IP+User-Agent hashing in `makeRateKey()` 
- **Image processing**: Client compresses with `browser-image-compression`, server parses with `formidable`
- **Security headers**: Centralized in `next.config.js` with CSP allowing only necessary origins

### Data Flow Architecture
```
Client Form → API Route → OpenRouter → Response Processing → Client Display
              ↓
         Rate Limiter + Input Sanitization (he.encode)
              ↓
         JSON Mode vs Text Mode Processing
```

### Key Components
- `src/pages/index.js`: Main UI with React hooks for state management
- `src/pages/api/generate.js`: Core API route with multipart/JSON handling
- `src/pages/api/surprise.js`: Alternative endpoint for random prompts
- `src/utils/imageCompression.js`: Client-side image optimization utilities
- `src/hooks/useParallax.js`: Browser-only parallax effects

## Critical Development Patterns

### API Route Structure (`/pages/api/generate.js`)
```javascript
// Always check method first
if (req.method !== 'POST') return res.status(405).json({...});

// Rate limit with IP+UA hash
const key = makeRateKey(req);
await rateLimiter.consume(key, 1);

// Parse multipart OR JSON based on content-type
const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

// Sanitize all user inputs
const idea = he.encode(fields.idea[0]?.trim() || '');
```

### JSON Mode vs Text Mode
- **JSON Mode**: Uses `parseJsonStrictish()` with robust fallback parsing
- **Text Mode**: Uses `sanitizeToPrompt()` to clean markdown/formatting  
- Toggle controlled by `isJsonMode` boolean from form data

### Image Upload Pipeline
1. Client: Compress with `browser-image-compression` (max 1.5MB, 2000px)
2. Server: Parse with `formidable` (10MB limit), convert to base64
3. OpenRouter: Send as `image_url` in message content array
4. Cleanup: Always `fs.unlink()` temp files

### Browser-Only Features
- **Speech Recognition**: Dynamically imported `web-speech-cognitive-services` polyfill
- **LocalStorage**: History stored as `pg_history` array (max 50 entries)
- **Object URLs**: Managed with refs, cleaned up in `useEffect` cleanup

## Environment & Build

### Required Environment Variables
- `OPENROUTER_API_KEY`: Required for all API functionality
- `VERCEL_URL`: Optional, used for HTTP-Referer header

### Build Commands
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

### Key Dependencies
- **Core**: `next@14.2.7`, `react@18.3.1`
- **API**: `rate-limiter-flexible`, `formidable`, `he`
- **Client**: `browser-image-compression`, `web-speech-cognitive-services`
- **Styling**: `tailwindcss`, custom CSS animations for glass morphism

## Common Modification Patterns

### Adding New API Endpoints
1. Create in `/pages/api/` with same rate limiting pattern
2. Add CORS headers if needed, keep CSP restrictive
3. Always sanitize inputs with `he.encode()`
4. Include proper error handling with user-friendly messages

### UI State Management
- Use `useState` + `useCallback` for performance
- Store persistent data in `localStorage` with try/catch
- Guard browser APIs with `typeof window !== 'undefined'`
- Use `useRef` for DOM manipulation and cleanup

### Image Feature Changes
- Client compression options in `src/utils/imageCompression.js`
- Server parsing config in API route's `IncomingForm` options
- Always handle both success and error paths for file operations

### Security Considerations
- Never expose API keys to client-side code
- All user inputs must go through `he.encode()` or similar sanitization
- Keep security headers in sync between `next.config.js` and deployment config
- Test rate limiting with `test-rate-limit.js` script

## Testing & Debugging
- **Development**: Use `npm run dev` and test all form combinations
- **Rate limiting**: Run `node test-rate-limit.js` to verify IP-based throttling
- **Image uploads**: Test compression with large files (>5MB originals)
- **Speech input**: Test in different browsers for polyfill behavior
- **JSON mode**: Verify both valid and malformed responses are handled

## Performance Notes
- Components are memoized (`memo`, `useCallback`, `useMemo`)
- Dynamic imports used for modals and speech recognition
- Service worker caches static assets but excludes `/api/*`
- Image compression runs in web worker when available