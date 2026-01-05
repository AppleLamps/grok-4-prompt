import {
  extractMessageText,
  parseStructuredContent,
  ensureTextPrompt,
  ensureJsonPrompt,
  isTextPrompt,
  isJsonPrompt,
  type PromptTextPayload,
  type JsonPromptPayload,
} from '../utils/openRouterParsers';

describe('extractMessageText', () => {
  it('should return string content as-is', () => {
    expect(extractMessageText('hello world')).toBe('hello world');
  });

  it('should extract text from array content', () => {
    const content = [
      { text: 'Hello ' },
      { text: 'world' },
    ];
    expect(extractMessageText(content)).toBe('Hello world');
  });

  it('should handle mixed array content', () => {
    const content = [
      { text: 'Hello' },
      { type: 'image' }, // no text property
      { text: ' world' },
    ];
    expect(extractMessageText(content)).toBe('Hello world');
  });

  it('should extract text property from object', () => {
    expect(extractMessageText({ text: 'hello' })).toBe('hello');
  });

  it('should JSON stringify object without text property', () => {
    const obj = { foo: 'bar' };
    expect(extractMessageText(obj)).toBe(JSON.stringify(obj));
  });

  it('should return empty string for null/undefined', () => {
    expect(extractMessageText(null)).toBe('');
    expect(extractMessageText(undefined)).toBe('');
  });

  it('should return empty string for non-string primitives', () => {
    expect(extractMessageText(123)).toBe('');
    expect(extractMessageText(true)).toBe('');
  });
});

describe('parseStructuredContent', () => {
  it('should parse valid JSON string content', () => {
    const content = JSON.stringify({ prompt: 'test prompt' });
    const result = parseStructuredContent<PromptTextPayload>(content);
    expect(result.prompt).toBe('test prompt');
  });

  it('should parse content from array format', () => {
    const content = [{ text: JSON.stringify({ prompt: 'array test' }) }];
    const result = parseStructuredContent<PromptTextPayload>(content);
    expect(result.prompt).toBe('array test');
  });

  it('should throw error for empty content', () => {
    expect(() => parseStructuredContent('')).toThrow('Empty AI response');
  });

  it('should throw error for invalid JSON', () => {
    expect(() => parseStructuredContent('not valid json')).toThrow();
  });
});

describe('ensureTextPrompt', () => {
  it('should return prompt string from valid payload', () => {
    const payload = { prompt: 'test prompt' };
    expect(ensureTextPrompt(payload)).toBe('test prompt');
  });

  it('should trim whitespace from prompt', () => {
    const payload = { prompt: '  trimmed  ' };
    expect(ensureTextPrompt(payload)).toBe('trimmed');
  });

  it('should throw for missing prompt property', () => {
    expect(() => ensureTextPrompt({} as PromptTextPayload)).toThrow('Invalid structured prompt payload');
  });

  it('should throw for non-string prompt', () => {
    expect(() => ensureTextPrompt({ prompt: 123 } as unknown as PromptTextPayload)).toThrow('Invalid structured prompt payload');
  });

  it('should throw for null payload', () => {
    expect(() => ensureTextPrompt(null as unknown as PromptTextPayload)).toThrow('Invalid structured prompt payload');
  });
});

describe('ensureJsonPrompt', () => {
  const validJsonPayload: JsonPromptPayload = {
    scene: 'A beautiful sunset',
    subjects: [{ description: 'sun', position: 'center', action: 'setting', color_palette: ['orange'] }],
    style: 'photorealistic',
    color_palette: ['orange', 'red', 'purple'],
    lighting: 'golden hour',
    mood: 'peaceful',
    background: 'mountains',
    composition: 'rule of thirds',
    camera: { angle: 'low', lens: '24mm', 'f-number': 'f/2.8', ISO: 100, depth_of_field: 'shallow' },
  };

  it('should return valid JSON payload', () => {
    const result = ensureJsonPrompt(validJsonPayload);
    expect(result.scene).toBe('A beautiful sunset');
    expect(result.subjects).toHaveLength(1);
  });

  it('should throw for missing required fields', () => {
    const incomplete = { scene: 'test' };
    expect(() => ensureJsonPrompt(incomplete as JsonPromptPayload)).toThrow('Invalid structured JSON payload');
  });

  it('should throw for null payload', () => {
    expect(() => ensureJsonPrompt(null as unknown as JsonPromptPayload)).toThrow('Invalid structured JSON payload');
  });
});

describe('type guards', () => {
  it('isTextPrompt should return true for text prompts', () => {
    expect(isTextPrompt({ prompt: 'test' })).toBe(true);
  });

  it('isTextPrompt should return false for JSON prompts', () => {
    expect(isTextPrompt({ scene: 'test' } as JsonPromptPayload)).toBe(false);
  });

  it('isJsonPrompt should return true for JSON prompts', () => {
    expect(isJsonPrompt({ scene: 'test' } as JsonPromptPayload)).toBe(true);
  });

  it('isJsonPrompt should return false for text prompts', () => {
    expect(isJsonPrompt({ prompt: 'test' })).toBe(false);
  });
});
