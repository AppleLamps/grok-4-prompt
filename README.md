# GROKIFY_PROMPT v2.0 - AI Prompt Generator

A premium AI prompt generator powered by OpenRouter's Grok-4.1 Fast model. Transform your ideas into detailed, optimized prompts for AI image generation with a cyberpunk terminal-style interface.

## 🚀 Features

- **Secure API Integration**: Server-side API calls to protect API keys
- **Cyberpunk Terminal UI**: Dark theme with glowing amber accents and monospace typography
- **Multi-Input Support**: Text input, voice dictation, and image uploads
- **Emily's JSON Mode**: Structured JSON output format for advanced workflows
- **Test Mode (Elysian Visions)**: Alternative prompt generation style
- **Video Prompt Mode**: Generate text-to-video scene descriptions
- **Style Presets**: Quick-apply style modifiers (cinematic, cyberpunk, etc.)
- **History Tracking**: Local storage of generated prompts with favorites
- **Real-time Generation**: Instant prompt generation with loading states
- **Copy to Clipboard**: One-click copying of generated prompts (JSON/Scene options)
- **Surprise Me**: Random creative prompt generation
- **Responsive Design**: Optimized for desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## 🛡️ Security

- API keys are never exposed to the client-side
- Server-side API route handles all OpenRouter requests
- Comprehensive input validation and sanitization
- Security headers and CSRF protection
- Rate limiting and error handling

## 🎨 Design

- **Dark terminal aesthetic** with near-black backgrounds (#0a0a0a)
- **JetBrains Mono** monospace typography
- **Glowing amber accents** (#F59E0B) with text-shadow effects
- **Numbered sections**: 01 // PRIMARY_INPUT_DATA, 02 // MODIFIERS, etc.
- **System status indicator** with glowing green dot
- **Corner bracket decorations** on upload areas
- **Responsive grid layout** with mobile-first approach

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- OpenRouter API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys))

### Local Development

1. **Clone and install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   # Copy the example environment file
   cp .env.local.example .env.local
   
   # Edit .env.local and add your OpenRouter API key
   OPENROUTER_API_KEY=your_actual_api_key_here

   # Set the canonical site URL for SEO (no trailing slash)
   NEXT_PUBLIC_SITE_URL=https://www.grokifyprompt.com
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000) in your browser**

### Production Build

```bash
npm run build
npm start
```

## 📦 Deployment on Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/prompt-generator)

### Manual Deployment

1. **Push your code to GitHub**

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure project settings

3. **Set Environment Variables:**
   - Go to your project settings in Vercel
   - Navigate to "Environment Variables"
   - Add `OPENROUTER_API_KEY` with your API key
   - Make sure to add it for Production, Preview, and Development

4. **Deploy:**
   - Vercel will automatically build and deploy your app
   - Your app will be available at `https://your-project.vercel.app`

### Environment Variables for Vercel

In your Vercel dashboard, add these environment variables:

| Key | Value | Environment |
|-----|--------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://www.grokifyprompt.com` | Production |

## 🛠️ Project Structure

```
src/
├── components/
│   ├── IconComponents.jsx   # SVG icon components
│   ├── HelpModal.jsx        # Help/instructions modal
│   └── HistoryModal.jsx     # Prompt history modal
├── config/
│   ├── prompts.js           # System prompts and presets
│   └── styles.ts            # Style preset definitions
├── hooks/
│   ├── usePromptGenerator.js    # Main generation logic
│   ├── useSpeechRecognition.js  # Voice input hook
│   └── useHistory.js            # History management hook
├── pages/
│   ├── _app.js              # App configuration
│   ├── index.js             # Main page component
│   └── api/
│       └── generate.js      # Secure API route for OpenRouter
├── services/
│   └── imageCompression.js  # Image compression utilities
├── styles/
│   └── globals.css          # Global styles with neural theme
└── utils/
    └── ErrorBoundary.jsx    # Error boundary component

├── .env.local.example       # Environment variables template
├── tailwind.config.js       # Tailwind CSS with neural theme
├── vercel.json              # Vercel deployment configuration
└── README.md                # This file
```

## 🔧 API Route Details

The `/api/generate` endpoint:

- **Method:** POST
- **Body:** `{ idea: string, directions?: string, image?: string, isJsonMode?: boolean, isTestMode?: boolean, isVideoPrompt?: boolean }`
- **Response:** `{ success: boolean, prompt: string }`
- **Security:** API key handled server-side only
- **Error Handling:** Comprehensive error responses
- **Rate Limiting:** Built-in protection

## 🎯 Usage

1. **Enter your idea** in the PRIMARY_INPUT_DATA section (or upload an image)
2. **Add modifiers** in the MODIFIERS section (optional style/mood directions)
3. **Select style presets** from the STYLE_MATRIX dropdown (optional)
4. **Upload a reference image** in the IMG_REFERENCE section (optional)
5. **Configure flags**: Toggle EMILY_JSON_MODE, TEST_ELYSIAN, or VIDEO_SEQ as needed
6. **Click EXECUTE** or use Ctrl/Cmd + Enter to generate
7. **Copy the result** using the COPY button (or COPY_JSON/COPY_SCENE in JSON mode)

## 🔒 Security Best Practices

- ✅ API keys stored as environment variables
- ✅ Server-side API calls only
- ✅ Input validation and sanitization
- ✅ Error handling without exposing internals
- ✅ Security headers configured
- ✅ No sensitive data in client-side code

## 🌟 Features

- **Terminal-style interface** with numbered sections
- **Glowing text effects** on branding and status indicators
- **Voice dictation** for hands-free input
- **Image compression** with progress indicator
- **History with favorites** stored locally
- **Randomize seed** for creative inspiration
- **Responsive grid layout** for all screen sizes

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📞 Support

If you have any questions or need help with deployment, please open an issue or contact the maintainers.

---

**Built with ❤️ using Next.js 14, Tailwind CSS, and OpenRouter's Grok-4.1 Fast model.**

Created by [@lamps_apple](https://x.com/lamps_apple)
