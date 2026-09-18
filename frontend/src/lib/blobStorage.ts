/**
 * Blob Storage utility for handling large file uploads
 * 
 * IMPORTANT: This is a client-side implementation using blob URLs.
 * For production with files >2MB, implement proper ICP blob storage backend.
 * 
 * Current approach:
 * - Files are converted to blob:// URLs (browser-managed)
 * - These URLs are temporary and work only in the current browser session
 * - No binary data is sent in createWork/updateWork requests
 * - Files are served directly from browser memory
 */

export class ExternalBlob {
  private bytes: Uint8Array | null = null;
  private url: string | null = null;
  private progressCallback: ((percentage: number) => void) | null = null;

  private constructor() {}

  /**
   * Create ExternalBlob from bytes
   */
  static fromBytes(blob: Uint8Array): ExternalBlob {
    const externalBlob = new ExternalBlob();
    externalBlob.bytes = blob;
    return externalBlob;
  }

  /**
   * Create ExternalBlob from URL
   */
  static fromURL(url: string): ExternalBlob {
    const externalBlob = new ExternalBlob();
    externalBlob.url = url;
    return externalBlob;
  }

  /**
   * Set upload progress callback
   */
  withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
    this.progressCallback = onProgress;
    return this;
  }

  /**
   * Get bytes from blob
   */
  async getBytes(): Promise<Uint8Array> {
    if (this.bytes) {
      return this.bytes;
    }
    if (this.url) {
      const response = await fetch(this.url);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
    throw new Error('No bytes or URL available');
  }

  /**
   * Get direct URL for streaming/caching
   * Returns blob:// URL that doesn't embed binary data
   */
  getDirectURL(): string {
    if (this.url) {
      return this.url;
    }
    if (this.bytes) {
      // Convert bytes to blob URL for browser caching
      // This creates a temporary URL that doesn't embed the data
      const buffer = this.bytes.slice().buffer as ArrayBuffer;
      const blob = new Blob([buffer]);
      return URL.createObjectURL(blob);
    }
    throw new Error('No URL or bytes available');
  }

  /**
   * Upload blob to storage
   * Returns a blob:// URL instead of data URL to avoid 2MB request limit
   */
  async upload(): Promise<string> {
    if (!this.bytes) {
      throw new Error('No bytes to upload');
    }

    // Simulate upload progress
    if (this.progressCallback) {
      this.progressCallback(0);
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      this.progressCallback(50);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create blob URL instead of data URL
    // This avoids embedding binary data in the request payload
    const buffer = this.bytes.slice().buffer as ArrayBuffer;
    const blob = new Blob([buffer]);
    this.url = URL.createObjectURL(blob);

    if (this.progressCallback) {
      this.progressCallback(100);
    }

    console.log('[ExternalBlob] Created blob URL (no binary data embedded):', this.url.substring(0, 50) + '...');
    
    return this.url;
  }
}

/**
 * Convert File to Uint8Array
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Upload file to blob storage and return URL
 * 
 * IMPORTANT: Returns blob:// URL (not data URL) to avoid 2MB request limit
 * The blob:// URL is a browser-managed reference that doesn't embed binary data
 * 
 * For production with persistent storage, implement ICP blob storage backend:
 * 1. Upload file chunks to dedicated storage canister
 * 2. Return canister URL (e.g., https://<canister-id>.raw.ic0.app/<blob-id>)
 * 3. Serve files via HTTP query calls
 */
export async function uploadFileToBlobStorage(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<string> {
  console.log('[uploadFileToBlobStorage] Processing file:', file.name, file.size, 'bytes');
  
  const bytes = await fileToUint8Array(file);
  const externalBlob = ExternalBlob.fromBytes(bytes);
  
  if (onProgress) {
    externalBlob.withUploadProgress(onProgress);
  }
  
  const blobUrl = await externalBlob.upload();
  
  console.log('[uploadFileToBlobStorage] File processed, URL type:', blobUrl.startsWith('blob:') ? 'blob URL (no binary data)' : 'other');
  console.log('[uploadFileToBlobStorage] URL length:', blobUrl.length, 'characters');
  
  return blobUrl;
}
