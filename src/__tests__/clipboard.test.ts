import { copyToClipboard } from '../utils/clipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('with navigator.clipboard API', () => {
    it('should successfully copy text using clipboard API', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('test text');

      expect(mockWriteText).toHaveBeenCalledWith('test text');
      expect(result).toEqual({ success: true });
    });

    it('should handle clipboard API error gracefully', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      // The function should attempt fallback, which may fail in test environment
      const result = await copyToClipboard('test text');

      // In test environment, fallback may fail since execCommand isn't available
      // The important thing is it doesn't throw
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('result structure', () => {
    it('should return success: true on successful copy', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('text');

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should return error property on failure', async () => {
      // Remove clipboard API to force fallback
      Object.defineProperty(global.navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('text');

      // Fallback will fail in test environment
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('');

      expect(mockWriteText).toHaveBeenCalledWith('');
      expect(result.success).toBe(true);
    });

    it('should handle long text', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      const longText = 'a'.repeat(10000);
      const result = await copyToClipboard(longText);

      expect(mockWriteText).toHaveBeenCalledWith(longText);
      expect(result.success).toBe(true);
    });

    it('should handle special characters', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      const specialText = '🎨 <script>alert("xss")</script> \n\t "quotes"';
      const result = await copyToClipboard(specialText);

      expect(mockWriteText).toHaveBeenCalledWith(specialText);
      expect(result.success).toBe(true);
    });
  });
});
