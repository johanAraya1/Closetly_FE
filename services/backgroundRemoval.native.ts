/**
 * Background Removal Service — Native (Android)
 * 
 * On-device background removal usando MLKit Selfie Segmentation via
 * react-native-image-selfie-segmentation. Corre 100% en el dispositivo,
 * cero backend, cero costos.
 * 
 * Flujo:
 *   1. Guardar la imagen base64 en un archivo temporal
 *   2. Crear una imagen blanca temporal (1x1, el native module la escala)
 *   3. Llamar a replaceBackground(input, whiteBg, 1024)
 *   4. Leer el resultado (persona sobre fondo blanco) como base64
 *   5. Limpiar archivos temporales
 *   6. Retornar base64
 */

import * as FileSystem from 'expo-file-system';

// ─── Constants ───────────────────────────────────────────────────────────────

/** 1×1 white PNG en base64 */
const WHITE_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

/** Límite de resolución para procesamiento */
const MAX_SIZE = 1024;

// ─── Helprs ──────────────────────────────────────────────────────────────────

function cacheDir(): string {
  return FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
}

async function saveBase64ToFile(base64: string, prefix: string): Promise<string> {
  const uri = `${cacheDir()}${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

async function cleanUpFiles(...uris: (string | null | undefined)[]) {
  for (const uri of uris) {
    if (!uri) continue;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignorar errores de limpieza
    }
  }
}

// ─── API pública (misma firma que la versión web) ────────────────────────────

export function onModelProgress(_callback: (progress: number) => void): () => void {
  return () => {};
}

export function isModelLoaded(): boolean {
  return true; // No hay modelo que cargar, siempre listo
}

export function isModelLoading(): boolean {
  return false;
}

export function getLoadError(): string | null {
  return null;
}

export function preloadBackgroundRemovalModel(): void {
  // No-op: MLKit está linkeado en el APK
}

export async function ensureModelLoaded(): Promise<boolean> {
  return true;
}

/**
 * Elimina el fondo de una imagen base64 usando MLKit Selfie Segmentation.
 * Devuelve la imagen procesada como base64 PNG (persona sobre fondo blanco).
 */
export async function removeBackground(
  imageInput: string,
  _mimeType?: string,
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  let inputUri: string | null = null;
  let whiteBgUri: string | null = null;
  let resultUri: string | null = null;

  try {
    // 1. Guardar la imagen de entrada como archivo temporal
    inputUri = await saveBase64ToFile(imageInput, 'bg_input');

    // 2. Crear la imagen de fondo blanco (1×1, el native la escala al tamaño correcto)
    whiteBgUri = await saveBase64ToFile(WHITE_1X1_BASE64, 'bg_white');

    // 3. Llamar al native module (MLKit Selfie Segmentation)
    const { replaceBackground } = await import(
      'react-native-image-selfie-segmentation'
    );

    resultUri = await replaceBackground(inputUri, whiteBgUri, MAX_SIZE);

    if (!resultUri) {
      throw new Error('MLKit returned empty result');
    }

    // 4. Leer el resultado como base64
    const resultBase64 = await FileSystem.readAsStringAsync(
      resultUri.replace('file://', ''),
      { encoding: FileSystem.EncodingType.Base64 },
    );

    console.log('[BackgroundRemoval] Background removed successfully (native)');
    return { base64: resultBase64, bgRemoved: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundRemoval] Native error:', msg);
    return { base64: imageInput, bgRemoved: false, error: msg };
  } finally {
    // Limpiar archivos temporales (asíncrono, no bloqueamos el return)
    cleanUpFiles(inputUri, whiteBgUri, resultUri);
  }
}
