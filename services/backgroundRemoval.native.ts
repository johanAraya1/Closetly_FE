/**
 * Background Removal Service — Native implementation
 * Usa expo-background-remover con MLKit (Android) / Vision (iOS) nativo.
 * MLKit corre on-device, no necesita backend.
 */

import * as ImageManipulator from 'expo-image-manipulator';

let _modelProgress: ((progress: number) => void) | null = null;

export function onModelProgress(callback: (progress: number) => void): () => void {
  _modelProgress = callback;
  return () => { _modelProgress = null; };
}

export function isModelLoaded(): boolean {
  return true; // MLKit no necesita precarga
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
 * @param imageInput - file URI (file://) o base64 string
 * @param mimeType - tipo MIME (opcional)
 * @returns objeto con base64 del PNG sin fondo
 */
export async function removeBackground(
  imageInput: string,
  _mimeType?: string,
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  try {
    // Si es base64, guardarlo temporalmente como archivo no sería práctico sin
    // expo-file-system. Pero el flujo actual en create.tsx siempre empieza con
    // un file URI (imageUri) que se convierte a base64 via ImageManipulator.
    // Así que recibimos base64, pero necesitamos un file URI para MLKit.
    //
    // Escribimos el base64 a un archivo temporal via ImageManipulator (que puede
    // leer base64 y guardar como archivo).
    const tempFile = await ImageManipulator.manipulateAsync(
      imageInput.startsWith('data:') ? imageInput : `data:image/jpeg;base64,${imageInput}`,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 1.0 },
    );

    if (_modelProgress) _modelProgress(0.3);

    // Llamar a expo-background-remover con el file URI
    const { removeBackgroundAsync } = await import('expo-background-remover');
    const resultUri = await removeBackgroundAsync(tempFile.uri);

    if (_modelProgress) _modelProgress(0.7);

    // Leer el resultado como base64 para mantener compatibilidad con el flujo web
    const resultBase64 = await ImageManipulator.manipulateAsync(
      resultUri,
      [],
      { base64: true, format: ImageManipulator.SaveFormat.PNG },
    );

    if (_modelProgress) _modelProgress(1.0);

    return {
      base64: resultBase64.base64!,
      bgRemoved: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[backgroundRemoval.native] Error:', msg);
    // Fallback: devolver la imagen original
    return {
      base64: imageInput,
      bgRemoved: false,
      error: msg,
    };
  }
}
