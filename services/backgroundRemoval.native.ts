/**
 * Background Removal Service — Native stub
 * En iOS/Android el background removal se hace del lado del backend (soft-fail).
 * Este stub evita que Metro intente compilar @huggingface/transformers en native.
 */

export function onModelProgress(_callback: (progress: number) => void): () => void {
  return () => {};
}

export function isModelLoaded(): boolean {
  return false;
}

export function isModelLoading(): boolean {
  return false;
}

export function getLoadError(): string | null {
  return 'Not supported on native';
}

export function preloadBackgroundRemovalModel(): void {
  // No-op: background removal se hace del lado del backend en native
}

export async function ensureModelLoaded(): Promise<boolean> {
  return false;
}

export async function removeBackground(
  base64: string,
  _mimeType?: string,
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  return { base64, bgRemoved: false, error: 'Not supported on native' };
}
