/**
 * Background Removal Service — Native implementation
 * Usa expo-background-remover con MLKit (Android) / Vision (iOS) nativo.
 * MLKit corre on-device, no necesita backend.
 *
 * IMPORTANTE: imageInput debe ser un file URI (file:// o content://),
 * NO base64. MLKit necesita un archivo local para procesar.
 */

import * as ImageManipulator from 'expo-image-manipulator';

let _modelProgress: ((progress: number) => void) | null = null;

export function onModelProgress(callback: (progress: number) => void): () => void {
  _modelProgress = callback;
  return () => { _modelProgress = null; };
}

export function isModelLoaded(): boolean {
  return true; // MLKit se descarga automáticamente
}

export function isModelLoading(): boolean {
  return false;
}

export function getLoadError(): string | null {
  return null;
}

export function preloadBackgroundRemovalModel(): void {
  // MLKit se descarga automáticamente la primera vez que se usa
}

export async function ensureModelLoaded(): Promise<boolean> {
  return true;
}

/**
 * Saca el fondo de una imagen usando MLKit nativo.
 * @param imageInput - file URI (file:// o content://) de la imagen original
 * @param _mimeType - tipo MIME (opcional)
 * @returns objeto con base64 del PNG sin fondo
 */
export async function removeBackground(
  imageInput: string,
  _mimeType?: string,
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  try {
    if (_modelProgress) _modelProgress(0.1);

    // Llamar a expo-background-remover con el file URI directamente
    const { removeBackgroundAsync } = await import('expo-background-remover');
    const resultUri = await removeBackgroundAsync(imageInput);

    if (_modelProgress) _modelProgress(0.6);

    // Leer el resultado como base64 para mantener compatibilidad con el service
    const resultImg = await ImageManipulator.manipulateAsync(
      resultUri,
      [],
      { base64: true, format: ImageManipulator.SaveFormat.PNG },
    );

    if (_modelProgress) _modelProgress(1.0);

    return {
      base64: resultImg.base64!,
      bgRemoved: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[backgroundRemoval.native] Error:', msg);
    // Fallback: devolver la imagen original (no podemos devolver base64 si
    // recibimos file URI, así que tiramos error y create.tsx usa el base64 original)
    return {
      base64: '',
      bgRemoved: false,
      error: msg,
    };
  }
}
