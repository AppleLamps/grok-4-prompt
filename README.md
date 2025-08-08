# Prompt Generator - Next.js 14 App

A premium AI prompt generator powered by OpenRouter's Grok-4 model. Transform your ideas into detailed, optimized prompts for AI systems with a high-end, modern interface.

## 🚀 Features

- **Secure API Integration**: Server-side API calls to protect API keys
- **Premium UI**: High-end, modern design with glass morphism effects
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Generation**: Instant prompt generation with loading states
- **Copy to Clipboard**: One-click copying of generated prompts
- **Error Handling**: Comprehensive error handling and user feedback
- **Accessibility**: Full keyboard navigation and screen reader support

## 🛡️ Security

- API keys are never exposed to the client-side
- Server-side API route handles all OpenRouter requests
- Comprehensive input validation and sanitization
- Security headers and CSRF protection
- Rate limiting and error handling

## 🎨 Design

- Light gray / black / dark gray theme
- Inter typography for premium feel
- Subtle shadows and rounded corners
- Smooth animations and micro-interactions
- Glass morphism effects with backdrop blur
- Responsive design with mobile-first approach

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

## 🛠️ Project Structure

```
src/
├── pages/
│   ├── _app.js          # App configuration and global styles
│   ├── index.js         # Main page component
│   └── api/
│       └── generate.js  # Secure API route for OpenRouter
├── styles/
│   └── globals.css      # Global styles with Tailwind CSS
└── ...

├── .env.local.example   # Environment variables template
├── .env.local          # Local environment variables (not committed)
├── .gitignore          # Git ignore rules
├── next.config.js      # Next.js configuration
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind CSS configuration
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

## 🔧 API Route Details

The `/api/generate` endpoint:

- **Method:** POST
- **Body:** `{ idea: string, directions?: string }`
- **Response:** `{ success: boolean, prompt: string }`
- **Security:** API key handled server-side only
- **Error Handling:** Comprehensive error responses
- **Rate Limiting:** Built-in protection

## 🎯 Usage

1. **Enter your idea** in the first textarea (required)
2. **Add directions** in the second textarea (optional)
3. **Click "Generate Prompt"** or use Ctrl/Cmd + Enter
4. **Copy the result** using the copy button
5. **Use the generated prompt** in your AI applications

## 🔒 Security Best Practices

- ✅ API keys stored as environment variables
- ✅ Server-side API calls only
- ✅ Input validation and sanitization
- ✅ Error handling without exposing internals
- ✅ Security headers configured
- ✅ No sensitive data in client-side code

## 🌟 Premium Features

- **Glass morphism effects** with backdrop blur
- **Smooth animations** with cubic-bezier timing
- **Hover effects** with subtle transforms
- **Loading states** with elegant spinners
- **Copy feedback** with visual confirmation
- **Responsive design** for all screen sizes
- **Dark mode support** via system preferences

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📞 Support

If you have any questions or need help with deployment, please open an issue or contact the maintainers.

---

**Built with ❤️ using Next.js 14, Tailwind CSS, and OpenRouter's Grok-4 model.**