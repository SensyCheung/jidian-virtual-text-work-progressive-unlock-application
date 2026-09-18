/**
 * Utility functions for image processing and progressive unlock
 */

/**
 * Calculate which image resolution level to display based on funding progress
 * @param percentage Funding progress percentage (0-100)
 * @returns Resolution level: 10, 40, 70, or 100
 */
export function getImageResolutionLevel(percentage: number): number {
  if (percentage >= 100) return 100;
  if (percentage >= 70) return 70;
  if (percentage >= 40) return 40;
  return 10;
}

/**
 * Get image quality description for UI display
 * @param level Resolution level
 * @returns Chinese description of image quality
 */
export function getImageQualityLabel(level: number): string {
  switch (level) {
    case 10:
      return '低清晰度 (10%)';
    case 40:
      return '中等清晰度 (40%)';
    case 70:
      return '较高清晰度 (70%)';
    case 100:
      return '完整高清 (100%)';
    default:
      return '未知';
  }
}

/**
 * Resize image file to specified scale percentage
 * @param file Original image file
 * @param scalePercentage Scale percentage (10, 40, 70, 100)
 * @returns Promise resolving to resized image blob
 */
export async function resizeImageToScale(
  file: File,
  scalePercentage: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法获取canvas上下文'));
      return;
    }

    img.onload = () => {
      const scale = scalePercentage / 100;
      const width = Math.floor(img.width * scale);
      const height = Math.floor(img.height * scale);

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Use different quality settings for different scales
      let quality = 0.9;
      if (scalePercentage === 10) quality = 0.6;
      else if (scalePercentage === 40) quality = 0.75;
      else if (scalePercentage === 70) quality = 0.85;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片转换失败'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate a random hash for secure filename
 * @returns Random hash string
 */
export function generateRandomHash(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
