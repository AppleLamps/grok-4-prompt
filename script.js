class PromptGenerator {
    constructor() {
        this.apiKey = '';
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'x-ai/grok-4';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkApiKey();
    }
    
    checkApiKey() {
        // Check if API key is stored in localStorage
        const storedKey = localStorage.getItem('openrouter_api_key');
        if (storedKey) {
            this.apiKey = storedKey;
        } else {
            this.promptForApiKey();
        }
    }
    
    promptForApiKey() {
        const key = prompt(
            'Please enter your OpenRouter API key:\n\n' +
            'You can get one at https://openrouter.ai/keys\n' +
            '(This will be stored locally in your browser)'
        );
        
        if (key && key.trim()) {
            this.apiKey = key.trim();
            localStorage.setItem('openrouter_api_key', this.apiKey);
        } else {
            this.showError('API key is required to use this tool. Please refresh the page and enter your key.');
        }
    }
    
    bindEvents() {
        const form = document.getElementById('promptForm');
        const copyBtn = document.getElementById('copyBtn');
        
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        copyBtn.addEventListener('click', () => this.copyToClipboard());
        
        // Add keyboard shortcut (Ctrl/Cmd + Enter to generate)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit(e);
            }
        });
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.apiKey) {
            this.promptForApiKey();
            if (!this.apiKey) return;
        }
        
        const ideaInput = document.getElementById('idea');
        const directionsInput = document.getElementById('directions');
        const generateBtn = document.getElementById('generateBtn');
        
        const idea = ideaInput.value.trim();
        const directions = directionsInput.value.trim();
        
        if (!idea) {
            this.showError('Please describe your idea first.');
            ideaInput.focus();
            return;
        }
        
        // Combine inputs into a single prompt
        let userPrompt = `Idea: ${idea}`;
        if (directions) {
            userPrompt += `\n\nAdditional directions: ${directions}`;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            const response = await this.callOpenRouterAPI(userPrompt);
            this.displayResult(response);
        } catch (error) {
            console.error('API Error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoadingState(false);
        }
    }
    
    async callOpenRouterAPI(userPrompt) {
        const requestBody = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a prompt generator that creates detailed, optimized prompts for AI systems. Transform the user\'s idea into a comprehensive, well-structured prompt that will produce the best possible results. Make the prompt clear, specific, and actionable.'
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };
        
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Prompt Generator'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from API');
        }
        
        return data.choices[0].message.content;
    }
    
    setLoadingState(loading) {
        const generateBtn = document.getElementById('generateBtn');
        const form = document.getElementById('promptForm');
        
        if (loading) {
            generateBtn.classList.add('loading');
            generateBtn.disabled = true;
            form.classList.add('loading');
        } else {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
            form.classList.remove('loading');
        }
    }
    
    displayResult(content) {
        const outputSection = document.getElementById('outputSection');
        const outputContent = document.getElementById('outputContent');
        
        // Hide placeholder text and show actual content
        outputContent.innerHTML = '';
        outputContent.textContent = content;
        outputContent.classList.remove('error');
        
        // Show the output section with animation
        outputSection.classList.add('visible');
        
        // Scroll to output section
        outputSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
    
    showError(message) {
        const outputSection = document.getElementById('outputSection');
        const outputContent = document.getElementById('outputContent');
        
        // Hide placeholder text and show error
        outputContent.innerHTML = '';
        outputContent.textContent = message;
        outputContent.classList.add('error');
        
        outputSection.classList.add('visible');
        
        // Scroll to output section
        outputSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
    
    async copyToClipboard() {
        const outputContent = document.getElementById('outputContent');
        const copyBtn = document.getElementById('copyBtn');
        
        if (!outputContent.textContent || outputContent.classList.contains('error')) {
            return;
        }
        
        try {
            await navigator.clipboard.writeText(outputContent.textContent);
            
            // Show success feedback
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                Copied!
            `;
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy:', error);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = outputContent.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Show success feedback
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                Copied!
            `;
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    }
    
    getErrorMessage(error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            localStorage.removeItem('openrouter_api_key');
            this.apiKey = '';
            return 'Invalid API key. Please refresh the page and enter a valid OpenRouter API key.';
        } else if (error.message.includes('429')) {
            return 'Rate limit exceeded. Please wait a moment before trying again.';
        } else if (error.message.includes('500')) {
            return 'Server error. Please try again in a moment.';
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        } else {
            return `Error: ${error.message}`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PromptGenerator();
});

// Add some utility functions for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Auto-resize textareas
    const textareas = document.querySelectorAll('.textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 100) + 'px';
        });
    });
    
    // Add focus indicators for better accessibility
    const focusableElements = document.querySelectorAll('input, textarea, button');
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => {
            element.classList.add('focused');
        });
        
        element.addEventListener('blur', () => {
            element.classList.remove('focused');
        });
    });
    
    // Add API key management button
    const footer = document.querySelector('.footer');
    const keyManagementBtn = document.createElement('button');
    keyManagementBtn.innerHTML = '⚙️ Manage API Key';
    keyManagementBtn.style.cssText = `
        background: none;
        border: none;
        color: #999;
        font-size: 0.875rem;
        cursor: pointer;
        margin-left: 1rem;
        text-decoration: underline;
    `;
    
    keyManagementBtn.addEventListener('click', () => {
        const currentKey = localStorage.getItem('openrouter_api_key');
        const message = currentKey 
            ? `Current API key: ${currentKey.substring(0, 8)}...\n\nEnter a new key to replace it, or click Cancel to keep the current one:`
            : 'Enter your OpenRouter API key:';
        
        const newKey = prompt(message);
        if (newKey && newKey.trim()) {
            localStorage.setItem('openrouter_api_key', newKey.trim());
            alert('API key updated successfully!');
        }
    });
    
    footer.appendChild(keyManagementBtn);
});