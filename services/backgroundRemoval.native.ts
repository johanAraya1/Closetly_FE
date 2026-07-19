/**
 * Background Removal Service — Native (Android/iOS)
 * 
 * En mobile el background removal se hace del lado del backend con Sharp.
 * Este módulo es un placeholder que retorna la imagen original sin modificar,
 * ya que MLKit Selfie Segmentation no funciona para segmentar prendas.
 * 
 * El backend recibe la imagen original via FormData y aplica el recorte.
 * En web sí se usa RMBG-1.4 on-device con Transformers.js.
 */

// ─── API pública (misma firma que la versión web) ────────────────────────────

export function onModelProgress(_callback: (progress: number) => void): () => void {
  return () => {};
}

export function isModelLoaded(): boolean {
  return true;
}

export function isModelLoading(): boolean {
  return false;
}

export function getLoadError(): string | null {
  return null;
}

export function preloadBackgroundRemovalModel(): void {
  // No-op: el bg removal se hace en el backend
}

export async function ensureModelLoaded(): Promise<boolean> {
  return true;
}

/**
 * En mobile no hacemos bg removal del lado del cliente.
 * Retornamos la imagen original sin modificar.
 * El backend se encarga al recibir la imagen via FormData.
 */
export async function removeBackground(
  imageInput: string,
  _mimeType?: string,
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  console.log('[BackgroundRemoval] Native: no-op, backend handles bg removal');
  return { base64: imageInput, bgRemoved: false };
}
