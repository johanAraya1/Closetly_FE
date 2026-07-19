/**
 * Background Removal Service — Native implementation
 * Usa expo-background-remover con MLKit (Android) / Vision (iOS) nativo.
 *
 * IMPORTANTE: imageInput debe ser un file URI (file:// o content://),
 * NO base64. MLKit necesita un archivo local para procesar.
 */

let _modelProgress: ((progress: number) => void) | null = null;

export function onModelProgress(callback: (progress: number) => void): () => void {
  _modelProgress = callback;
  return () => { _modelProgress = null; };
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
  // MLKit se descarga automáticamente la primera vez
}

export async function ensureModelLoaded(): Promise<boolean> {
  return true;
}

/**
 * Saca el fondo de una imagen usando MLKit nativo.
 * Devuelve el file URI del PNG procesado sin fondo.
 * La conversión a base64 se hace al guardar, no acá, para evitar
 * crashes de memoria con el ImageManipulator post-procesamiento.
 */
export async function removeBackground(
  imageInput: string,
  _mimeType?: string,
): Promise<{
  base64: string;
  bgRemoved: boolean;
  error?: string;
  processedUri?: string;
}> {
  try {
    if (_modelProgress) _modelProgress(0.1);

    const { removeBackgroundAsync } = await import('expo-background-remover');
    const resultUri = await removeBackgroundAsync(imageInput);

    if (_modelProgress) _modelProgress(0.8);

    if (!resultUri) {
      throw new Error('expo-background-remover returned empty URI');
    }

    if (_modelProgress) _modelProgress(1.0);

    return {
      base64: '', // se convierte al guardar desde processedUri
      bgRemoved: true,
      processedUri: resultUri,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[backgroundRemoval.native] Error:', msg);
    return {
      base64: '',
      bgRemoved: false,
      error: msg,
    };
  }
}
