/**
 * Background Removal Service — Native stub
 * En iOS/Android el background removal se hace del lado del backend.
 * Este stub evita que Metro intente compilar @huggingface/transformers en native
 * y también evita importar librerías nativas inestables que crashean la app.
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
  return null;
}

export function preloadBackgroundRemovalModel(): void {
  // No-op: el backend hace bg removal en mobile
}

export async function ensureModelLoaded(): Promise<boolean> {
  return false;
}

export async function removeBackground(
  _imageInput: string,
  _mimeType?: string,
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  // No-op: el backend hace bg removal al recibir el file upload
  return { base64: '', bgRemoved: false, error: 'Not supported on native' };
}
