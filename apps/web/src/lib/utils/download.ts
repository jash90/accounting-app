/**
 * Result of a download operation
 */
export interface DownloadResult {
  success: boolean;
  error?: string;
}

/**
 * Downloads a Blob as a file without DOM manipulation side effects.
 * Creates a temporary anchor element, triggers download, and cleans up.
 *
 * Includes browser compatibility checks and error handling.
 *
 * @param blob - The Blob to download
 * @param filename - The filename for the downloaded file
 * @returns DownloadResult indicating success or failure with error message
 */
export function downloadBlob(blob: Blob, filename: string): DownloadResult {
  // Feature detection for required APIs
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window object not available (SSR context)' };
  }

  if (!window.URL?.createObjectURL) {
    return { success: false, error: 'Browser does not support URL.createObjectURL' };
  }

  if (!document?.createElement || !document?.body) {
    return { success: false, error: 'Document API not available' };
  }

  let url: string | null = null;
  let anchor: HTMLAnchorElement | null = null;

  try {
    // Validate inputs
    if (!(blob instanceof Blob)) {
      return { success: false, error: 'Invalid blob provided' };
    }

    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid filename provided' };
    }

    url = window.URL.createObjectURL(blob);
    anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
    console.error('Download failed:', errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    // Clean up in finally block to ensure cleanup even on error
    if (url) {
      try {
        window.URL.revokeObjectURL(url);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (anchor?.parentNode) {
      try {
        document.body.removeChild(anchor);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Legacy function signature for backwards compatibility.
 * Logs warning if download fails but doesn't throw.
 *
 * @deprecated Use downloadBlob() and check the result instead
 */
export function downloadBlobUnsafe(blob: Blob, filename: string): void {
  const result = downloadBlob(blob, filename);
  if (!result.success) {
    console.warn(`Download failed: ${result.error}`);
  }
}
