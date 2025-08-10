import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before upload
 * @param {File} imageFile - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = async (imageFile, options = {}) => {
  try {
    // Default compression options
    const defaultOptions = {
      maxSizeMB: 1, // Maximum file size in MB (after compression)
      maxWidthOrHeight: 2000, // Maximum width or height
      useWebWorker: true, // Use web worker for better performance
      maxIteration: 10, // Maximum number of iterations to find the best compression
      fileType: 'image/jpeg', // Output format
      initialQuality: 0.8, // Initial quality (0-1)
    };

    // Merge default options with user options
    const compressionOptions = { ...defaultOptions, ...options };
    
    // Skip compression for small files (< 500KB)
    if (imageFile.size < 500 * 1024) {
      console.log('File is small, skipping compression');
      return imageFile;
    }

    console.log('Original file size:', (imageFile.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Compress the image
    const compressedFile = await imageCompression(
      imageFile,
      compressionOptions
    );
    
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Convert back to File if needed (browser-image-compression returns a Blob)
    if (compressedFile instanceof Blob && !(compressedFile instanceof File)) {
      return new File(
        [compressedFile],
        imageFile.name,
        { type: compressionOptions.fileType }
      );
    }
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails
    return imageFile;
  }
};

/**
 * Gets image dimensions
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>} - Image dimensions
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
      URL.revokeObjectURL(objectUrl);
    };
    
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(objectUrl);
    };
    
    img.src = objectUrl;
  });
};
