/**
 * Background Removal Service — Web
 * Client-side background removal usando Transformers.js cargado desde CDN.
 * 
 * Usamos un Blob URL para evitar que Metro intercepte el dynamic import().
 * El script dentro del blob hace import() nativo del browser a la CDN.
 * 
 * Sin costo de servidor, sin API keys, sin tarjetas de crédito.
 */

import { Platform } from 'react-native';

// Estado del modelo
let transformersModule: any = null;
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
 * Carga el módulo @huggingface/transformers desde CDN usando un Blob URL
 * para evitar que Metro intercepte el dynamic import().
 */
function loadTransformersFromCDN(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Creamos un Blob con el código que importa la librería desde CDN
    // y la expone en window.__transformers__
    const code = `
      import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm')
        .then(mod => {
          window.__transformers__ = mod;
          window.dispatchEvent(new CustomEvent('__transformers_loaded'));
        })
        .catch(err => {
          window.dispatchEvent(new CustomEvent('__transformers_error', { detail: err.message }));
        });
    `;

    const blob = new Blob([code], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    const script = document.createElement('script');
    script.type = 'module';
    script.src = blobUrl;

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Timeout loading transformers from CDN'));
    }, 30000);

    window.addEventListener('__transformers_loaded', () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      resolve(window.__transformers__);
    }, { once: true });

    window.addEventListener('__transformers_error', ((e: CustomEvent) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      reject(new Error(e.detail));
    }) as EventListener, { once: true });

    document.head.appendChild(script);
  });
}

/**
 * Precarga el modelo de background removal en segundo plano.
 */
export function preloadBackgroundRemovalModel(): void {
  if (Platform.OS !== 'web') {
    console.log('[BackgroundRemoval] Skipping preload: not on web platform');
    return;
  }
  if (modelLoaded || loadPromise) return;

  console.log('[BackgroundRemoval] Starting model preload...');

  loadPromise = (async () => {
    try {
      onProgress?.(5);

      // Cargar la librería desde CDN via Blob URL (bypass de Metro)
      const transformers = await loadTransformersFromCDN();
      onProgress?.(20);

      // Crear pipeline de segmentación
      transformersModule = await transformers.pipeline(
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
      loadPromise = null;
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
  if (loadPromise) await loadPromise;
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

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const maskX = Math.round(x / scaleX);
      const maskY = Math.round(y / scaleY);
      const maskIndex = maskY * maskWidth + maskX;
      const pixelIndex = (y * img.width + x) * 4;

      const maskValue = maskData[maskIndex];
      if (maskValue < 128) {
        pixels[pixelIndex + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Elimina el fondo de una imagen base64.
 */
export async function removeBackground(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  if (Platform.OS !== 'web') {
    return { base64, bgRemoved: false, error: 'Only works on web' };
  }

  if (!modelLoaded) {
    const loaded = await ensureModelLoaded();
    if (!loaded) {
      return { base64, bgRemoved: false, error: `Model not available: ${loadError || 'unknown'}` };
    }
  }

  try {
    const img = await base64ToImage(base64, mimeType);
    const results = await transformersModule(img);

    const result = Array.isArray(results) ? results[0] : results;
    if (!result || !result.mask) {
      return { base64, bgRemoved: false, error: 'No mask returned' };
    }

    const mask = result.mask as { data: Uint8ClampedArray; width: number; height: number };
    const processedBase64 = applyMaskToImage(img, mask.data, mask.width, mask.height);

    console.log('[BackgroundRemoval] Background removed successfully');
    return { base64: processedBase64, bgRemoved: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundRemoval] Error:', msg);
    return { base64, bgRemoved: false, error: msg };
  }
}
