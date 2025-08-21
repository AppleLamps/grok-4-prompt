Project: Grok 4 Imagine  Prompt Generator

Purpose
-------
This file helps AI assistants (Copilot-like agents, LLM helpers, or human collaborators guided by AI) understand the project quickly and act confidently when adding, fixing, or changing code.

Quick facts
-----------
- Framework: Next.js 14 (pages/ routing)
- Language: JavaScript (React)
- Styling: Tailwind CSS
- Entry pages: `src/pages/index.js`
- API routes: `src/pages/api/generate.js`, `src/pages/api/surprise.js`
- Helpful utilities: `src/utils/imageCompression.js`, `src/hooks/useParallax.js`, `src/components/SpaceBackground.jsx`
- External services: OpenRouter (uses `OPENROUTER_API_KEY` env var)

Primary goals for AI helpers
----------------------------
- Make minimal, well-scoped changes unless asked to implement large features.
- Preserve existing behavior and UX unless tests or the user request a behavior change.
- Keep server-side secrets out of the client. API keys must remain in env vars and only used in server-side code (`/pages/api/*`).
- Prefer small PRs with clear intent and a short test or smoke check.

What to know before editing
---------------------------
- The app is a prompt generator with optional image upload and a JSON "Emily's JSON Mode". The heavy work is in `src/pages/api/generate.js`.
- The API routes enforce rate limits using `rate-limiter-flexible` (Memory). Keep changes compatible with this.
- Image uploads are parsed using `formidable` server-side and compressed client-side with `browser-image-compression`.
- The UI stores history in `localStorage` under key `pg_history`.
- The code uses some client-only browser APIs (Clipboard, SpeechRecognition). Guard any server-side access with `typeof window !== 'undefined'` or move logic into useEffect/useCallback accordingly.

Common tasks and how to approach them
------------------------------------
- Add a small UI change (text, class): edit `src/pages/index.js`. Keep JSX structure and CSS class names. No server restart required for dev.
- Change prompt formatting or sanitization: edit `sanitizeToPrompt` in `src/pages/api/generate.js` or the helper in `src/pages/api/surprise.js`. Add unit tests when logic is non-trivial.
- Add new API feature requiring third-party keys: add env var checks and clear error messages in API route. Never commit keys.
- Fix CORS/headers: API calls are server-to-server (OpenRouter). If you modify headers, ensure you don't leak secrets in responses.
- Add image-related features: client uses `compressImage` from `src/utils/imageCompression.js`. Server expects `multipart/form-data` parsing via `formidable` with `bodyParser: false` in the API config.

Data shapes and important values
--------------------------------
- Frontend -> `/api/generate` form-data fields:
  - idea: string
  - directions: string (optional)
  - image: file (optional, max 10MB)
  - isJsonMode: 'true' | 'false' (string)

- Server -> returns JSON:
  - Success (status 200): { success: true, prompt: string|object, usage: object|null }
  - Error (status >= 400): { error: string, message?: string }

- Rate limiting: 5 requests per minute per IP (RateLimiterMemory). Be careful when adding automated tests that invoke the API often; stub or bypass the limiter in tests.

Environment variables
---------------------
- OPENROUTER_API_KEY (required for `/api/generate` and `/api/surprise`)
- VERCEL_URL (optional; used to build referer header)

Run / build notes
-----------------
- Dev server: `npm run dev` (Next dev server)
- Build: `npm run build` then `npm run start`
- Node engine in `package.json` requires Node >=18

Testing and quick verification
------------------------------
Minimal local checks to perform after changes:
- Start dev server and exercise the UI: generate with text only, with image, and with "Surprise Me".
- Check console logs for unhandled errors. Server errors appear in terminal where Next runs.
- For API logic changes, run small node-based tests or add Jest tests. If you add tests, keep them fast and mock external network calls.

Guidance for AI agents (step-by-step)
-----------------------------------
1) Read this file, then open `src/pages/api/generate.js` and `src/pages/index.js`.
2) If changing server logic, run the dev server locally and reproduce the issue. Check logs.
3) Make the smallest change possible that satisfies the user request. Keep changes behind feature flags or toggles when risky.
4) Add unit tests for parsing/sanitization and utility functions. Do not create long-running or flaky tests.
5) Run the dev server and perform the smoke tests above.
6) Create a single PR with a clear title and description listing the files changed and the verification steps.

Edge cases and pitfalls
----------------------
- SpeechRecognition: polyfill `web-speech-cognitive-services` is imported dynamically; it's client-only. Don't try to import it server-side.
- File uploads: `formidable` produces file objects with `.filepath` on server  remove temp files after reading to avoid disk accumulation.
- JSON mode: When `isJsonMode` is enabled, the API expects a single JSON object from the model; the route contains robust parsing helpers  prefer reusing them over replacing unless necessary.
- Rate limiter: During development tests, the memory rate limiter can block you  either increase points/duration or mock the limiter.
- API timeouts: OpenRouter calls have AbortController timeouts (20s and 15s). If you change timeouts, test under slow network.

Files of interest (short map)
----------------------------
- `src/pages/index.js` - main UI, upload, state, history, JSON mode toggle
- `src/pages/api/generate.js` - main server logic for prompt generation, sanitization, and JSON-mode parsing
- `src/pages/api/surprise.js` - 'Surprise Me' route; has its own prompt sanitization
- `src/utils/imageCompression.js` - client-side image compression helper
- `src/hooks/useParallax.js` - parallax hook; client-only
- `src/components/SpaceBackground.jsx` - decorative background

Helpful developer commands
-------------------------
Use powershell (pwsh) on Windows as the workspace default. Example dev commands:

```
npm install
npm run dev
```

Notes for PR reviewers (AI and humans)
-------------------------------------
- Expect string-heavy parsing. Unit tests for sanitization and JSON parsing are high value.
- Watch for accidental client-side exposure of env vars. Only server code should use `process.env.OPENROUTER_API_KEY`.
- Prefer functional, readable changes with comments explaining non-trivial heuristics (e.g., JSON recovery steps).

If you get stuck
--------------
- Re-run the dev server and check terminal logs.
- Grep for symbols used across files (e.g., `isJsonMode`, `pg_history`, `compressImage`).
- Ask the repo owner for intended behavior before large refactors.

Last updated: 2025-08-20
