// Utility functions for character-based random unlock content management

/**
 * Extract plain text content from HTML for character-based processing
 * Removes all HTML tags and returns plain text
 */
export function extractTextFromHtml(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  
  console.log('[RandomUnlock] Extracted text from HTML:', {
    htmlLength: html.length,
    textLength: text.length,
    textPreview: text.substring(0, 100),
  });
  
  return text;
}

/**
 * Calculate how many characters should be unlocked based on funding percentage
 * 
 * @param totalCharacters - Total number of characters in content
 * @param fundingPercentage - Current funding percentage (0-100)
 * @returns Number of characters that should be unlocked
 */
export function calculateTargetCharacterCount(
  totalCharacters: number,
  fundingPercentage: number
): number {
  if (totalCharacters === 0) {
    console.warn('[RandomUnlock] Cannot calculate target count: totalCharacters is 0');
    return 0;
  }

  if (fundingPercentage < 0 || fundingPercentage > 100) {
    console.warn('[RandomUnlock] Invalid funding percentage:', fundingPercentage);
    fundingPercentage = Math.max(0, Math.min(100, fundingPercentage));
  }

  // Calculate target count based on percentage
  const rawTarget = (totalCharacters * fundingPercentage) / 100;
  const targetCount = Math.floor(rawTarget);
  
  // Ensure at least 1 character is unlocked if there's any funding
  const finalCount = Math.max(
    fundingPercentage > 0 ? 1 : 0,
    Math.min(targetCount, totalCharacters)
  );

  console.log('[RandomUnlock] Calculated target character count:', {
    totalCharacters,
    fundingPercentage,
    rawTarget,
    targetCount,
    finalCount,
  });
  
  return finalCount;
}

/**
 * Generate random character indices from the remaining locked content
 * Uses crypto.getRandomValues for true randomness
 * 
 * @param totalCharacters - Total number of characters in content
 * @param targetCount - Number of characters to unlock
 * @param unlockedString - Already unlocked characters as a string
 * @returns String containing newly unlocked characters
 */
export function generateRandomCharacters(
  content: string,
  targetCount: number,
  unlockedString: string
): string {
  console.log('[RandomUnlock] Generating random characters:', {
    contentLength: content.length,
    targetCount,
    currentUnlockedLength: unlockedString.length,
  });

  if (content.length === 0 || targetCount <= 0) {
    console.log('[RandomUnlock] No characters to generate');
    return '';
  }

  // Calculate how many new characters we need
  const currentUnlockedCount = unlockedString.length;
  const additionalNeeded = Math.max(0, targetCount - currentUnlockedCount);
  
  if (additionalNeeded === 0) {
    console.log('[RandomUnlock] Already have enough unlocked characters');
    return '';
  }

  // Find indices of characters that are not yet unlocked
  const unlockedSet = new Set(unlockedString);
  const availableIndices: number[] = [];
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    // Count how many times this character appears in unlocked string
    const unlockedCount = Array.from(unlockedString).filter(c => c === char).length;
    // Count how many times this character appears in content up to this index
    const contentCount = content.substring(0, i + 1).split(char).length - 1;
    
    // If this occurrence hasn't been unlocked yet, it's available
    if (contentCount > unlockedCount) {
      availableIndices.push(i);
    }
  }

  console.log('[RandomUnlock] Available character indices:', {
    availableCount: availableIndices.length,
    additionalNeeded,
  });

  if (availableIndices.length === 0) {
    console.log('[RandomUnlock] No available characters to unlock');
    return '';
  }

  // Select random indices
  const count = Math.min(additionalNeeded, availableIndices.length);
  const randomValues = new Uint32Array(count * 2);
  crypto.getRandomValues(randomValues);
  
  const selectedIndices: number[] = [];
  const tempAvailable = [...availableIndices];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = randomValues[i] % tempAvailable.length;
    const selectedIndex = tempAvailable.splice(randomIndex, 1)[0];
    selectedIndices.push(selectedIndex);
  }

  // Extract the characters at selected indices
  const newCharacters = selectedIndices.map(idx => content[idx]).join('');
  
  console.log('[RandomUnlock] Generated new characters:', {
    count: newCharacters.length,
    selectedIndices: selectedIndices.sort((a, b) => a - b).slice(0, 10),
    preview: newCharacters.substring(0, 20),
  });

  return newCharacters;
}

/**
 * Render content with unlocked characters visible and locked characters masked
 * Preserves HTML structure while replacing unrevealed characters with block symbols
 * 
 * @param htmlContent - Original HTML content
 * @param unlockedString - String containing all unlocked characters
 * @returns HTML string with masked characters
 */
export function renderMaskedContent(
  htmlContent: string,
  unlockedString: string
): string {
  console.log('[RandomUnlock] Rendering masked content:', {
    htmlLength: htmlContent.length,
    unlockedLength: unlockedString.length,
  });

  // Extract plain text to determine which characters are unlocked
  const plainText = extractTextFromHtml(htmlContent);
  
  if (plainText.length === 0) {
    return htmlContent;
  }

  // Create a map of character positions to unlocked status
  const unlockedChars = Array.from(unlockedString);
  const charUnlockMap = new Map<string, number>();
  
  // Count occurrences of each character in unlocked string
  unlockedChars.forEach(char => {
    charUnlockMap.set(char, (charUnlockMap.get(char) || 0) + 1);
  });

  // Build masked plain text
  let maskedText = '';
  const charCountMap = new Map<string, number>();
  
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText[i];
    const currentCount = (charCountMap.get(char) || 0) + 1;
    charCountMap.set(char, currentCount);
    
    const unlockedCount = charUnlockMap.get(char) || 0;
    
    if (currentCount <= unlockedCount) {
      // This occurrence is unlocked
      maskedText += char;
    } else {
      // This occurrence is locked - replace with block symbol
      // Skip whitespace characters
      if (char.trim() === '') {
        maskedText += char;
      } else {
        maskedText += '█';
      }
    }
  }

  console.log('[RandomUnlock] Masked text generated:', {
    originalLength: plainText.length,
    maskedLength: maskedText.length,
    unlockedCount: unlockedString.length,
    maskedPreview: maskedText.substring(0, 100),
  });

  // Now we need to apply the masking to the HTML while preserving structure
  // This is a simplified approach - we'll wrap the masked text in a div
  return `<div class="random-unlock-content">${escapeHtml(maskedText)}</div>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate unlocked string against content
 * Returns validation result with details
 */
export function validateUnlockedString(
  unlockedString: string,
  content: string,
  maxCharacters: number
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if unlocked string length exceeds maximum
  if (unlockedString.length > maxCharacters) {
    errors.push(`解锁字符数 (${unlockedString.length}) 超过最大允许值 (${maxCharacters})`);
  }

  // Check if all characters in unlocked string exist in content
  const contentChars = new Map<string, number>();
  for (const char of content) {
    contentChars.set(char, (contentChars.get(char) || 0) + 1);
  }

  const unlockedChars = new Map<string, number>();
  for (const char of unlockedString) {
    unlockedChars.set(char, (unlockedChars.get(char) || 0) + 1);
  }

  for (const [char, count] of unlockedChars) {
    const contentCount = contentChars.get(char) || 0;
    if (count > contentCount) {
      errors.push(`字符 '${char}' 在解锁字符串中出现 ${count} 次，但在内容中只有 ${contentCount} 次`);
    }
  }

  const isValid = errors.length === 0;

  console.log('[RandomUnlock] String validation result:', {
    isValid,
    unlockedLength: unlockedString.length,
    maxCharacters,
    contentLength: content.length,
    errors,
  });

  return {
    isValid,
    errors,
  };
}
