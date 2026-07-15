/**
 * Background Removal Service — Web
 * Client-side background removal usando Transformers.js cargado desde CDN.
 * 
 * Cargamos la librería desde esm.sh para evitar que Metro intente compilar
 * @huggingface/transformers y sus dependencias (onnxruntime-web).
 * esm.sh resuelve los bare imports server-side y sirve un bundle ESM listo.
 * 
 * Sin costo de servidor, sin API keys, sin tarjetas de crédito.
 */

import { Platform } from 'react-native';
import { pipeline as hfPipeline } from '@huggingface/transformers/dist/transformers.min.js';

// Estado del modelo
let pipelineInstance: any = null;
let modelLoaded = false;
let loadPromise: Promise<void> | null = null;
let loadError: string | null = null;

type ProgressCallback = (progress: number) => void;
let onProgress: ProgressCallback | null = null;

/**
 * Suscribirse al progreso de carga del modelo (0-100)
 */
export function onModelProgress(callback: ProgressCallback): () => void {
  onProgress = callback;
  return () => {
    if (onProgress === callback) onProgress = null;
  };
}

/**
 * Verificar si el modelo ya está cargado
 */
export function isModelLoaded(): boolean {
  return modelLoaded;
}

/**
 * Verificar si el modelo está cargando actualmente
 */
export function isModelLoading(): boolean {
  return loadPromise !== null && !modelLoaded;
}

/**
 * Obtener el último error de carga, si hubo
 */
export function getLoadError(): string | null {
  return loadError;
}

/**
 * Precarga el modelo de background removal en segundo plano.
 * Llamar esto temprano (apenas el usuario entra al home) para que esté
 * listo cuando necesite crear una prenda.
 */
export function preloadBackgroundRemovalModel(): void {
  // Solo en web
  if (Platform.OS !== 'web') {
    console.log('[BackgroundRemoval] Skipping preload: not on web platform');
    return;
  }

  // Ya cargado o cargando
  if (modelLoaded || loadPromise) return;

  console.log('[BackgroundRemoval] Starting model preload...');

  loadPromise = (async () => {
    try {
      onProgress?.(10);

      // transformers.min.js es un bundle self-contained sin imports externos
      // Compatible con Metro (no tiene bare imports como onnxruntime-web/webgpu)
      pipelineInstance = await hfPipeline(
        'image-segmentation',
        'briaai/RMBG-1.4',
        {
          quantized: true,
          progress_callback: (progress: { loaded: number; total: number }) => {
            if (progress.total > 0) {
              const pct = Math.min(90, 20 + Math.round((progress.loaded / progress.total) * 70));
              onProgress?.(pct);
            }
          },
        },
      );

      modelLoaded = true;
      loadError = null;
      onProgress?.(100);
      console.log('[BackgroundRemoval] Model loaded successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      loadError = msg;
      loadPromise = null; // permitir reintentar
      modelLoaded = false;
      onProgress?.(0);
      console.error('[BackgroundRemoval] Failed to load model:', msg);
    }
  })();
}

/**
 * Fuerza la carga del modelo y espera a que termine.
 */
export async function ensureModelLoaded(): Promise<boolean> {
  if (modelLoaded) return true;
  if (!loadPromise) preloadBackgroundRemovalModel();
  if (loadPromise) {
    await loadPromise;
  }
  return modelLoaded;
}

/**
 * Convierte una imagen base64 a un elemento HTML Image.
 */
function base64ToImage(base64: string, mimeType: string = 'image/jpeg'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from base64'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Aplica la máscara de segmentación a la imagen original y devuelve
 * la imagen procesada como base64 PNG (con canal alfa).
 */
function applyMaskToImage(
  img: HTMLImageElement,
  maskData: Uint8ClampedArray,
  maskWidth: number,
  maskHeight: number,
): string {
  const canvas = document.createElement('canvas');
  const scaleX = img.width / maskWidth;
  const scaleY = img.height / maskHeight;

  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // Dibujar imagen original
  ctx.drawImage(img, 0, 0);

  // Obtener datos de píxeles
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Aplicar máscara escalando al tamaño de la imagen original
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const maskX = Math.round(x / scaleX);
      const maskY = Math.round(y / scaleY);
      const maskIndex = maskY * maskWidth + maskX;
      const pixelIndex = (y * img.width + x) * 4;

      // La máscara de RMBG-1.4 es binaria/normalizada 0-255
      // Valores altos = foreground, bajos = background
      const maskValue = maskData[maskIndex];
      if (maskValue < 128) {
        // Background: transparente
        pixels[pixelIndex + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Exportar como PNG (con transparencia) y extraer solo base64
  return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Elimina el fondo de una imagen base64.
 * 
 * @param base64 - Imagen en base64 (sin prefijo data:)
 * @param mimeType - Tipo MIME original (image/jpeg, image/png, etc.)
 * @returns Imagen procesada en base64, o la original si falla
 */
export async function removeBackground(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  // Solo en web
  if (Platform.OS !== 'web') {
    return { base64, bgRemoved: false, error: 'Client-side background removal only works on web' };
  }

  // Asegurar que el modelo esté cargado
  if (!modelLoaded) {
    const loaded = await ensureModelLoaded();
    if (!loaded) {
      return { base64, bgRemoved: false, error: `Model not available: ${loadError || 'unknown error'}` };
    }
  }

  try {
    // Cargar la imagen en el navegador
    const img = await base64ToImage(base64, mimeType);

    // Ejecutar segmentación
    const results = await pipelineInstance(img);

    // Buscar el resultado foreground (primer mask válido)
    const result = Array.isArray(results) ? results[0] : results;
    if (!result || !result.mask) {
      return { base64, bgRemoved: false, error: 'No mask returned from model' };
    }

    const mask = result.mask as { data: Uint8ClampedArray; width: number; height: number };

    // Aplicar máscara
    const processedBase64 = applyMaskToImage(img, mask.data, mask.width, mask.height);

    console.log('[BackgroundRemoval] Background removed successfully');
    return { base64: processedBase64, bgRemoved: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundRemoval] Error removing background:', msg);
    return { base64, bgRemoved: false, error: msg };
  }
}
