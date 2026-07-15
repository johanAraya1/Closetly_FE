/**
 * Background Removal Service — Web
 * Client-side background removal usando Transformers.js cargado desde CDN.
 * 
 * Usamos el mismo approach que el demo oficial de Xenova:
 * - AutoModel.from_pretrained() con model_type: "custom" (bypasea pipeline)
 * - AutoProcessor.from_pretrained() con config explícita
 * - Salida: tensor alpha matte → resize → aplicar como canal alfa
 * 
 * Sin costo de servidor, sin API keys, sin tarjetas de crédito.
 */

import { Platform } from 'react-native';

// Estado del modelo
let model: any = null;
let processor: any = null;
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
 * Config del procesador de imagen para RMBG-1.4
 */
function getProcessorConfig() {
  return {
    do_normalize: true,
    do_pad: false,
    do_rescale: true,
    do_resize: true,
    image_mean: [0.5, 0.5, 0.5],
    image_std: [1, 1, 1],
    resample: 2,
    rescale_factor: 0.00392156862745098,
    size: { width: 1024, height: 1024 },
    feature_extractor_type: 'ImageFeatureExtractor',
  };
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
      transformersModule = transformers;
      onProgress?.(15);

      // Cargar modelo con AutoModel (bypasea pipeline type checking)
      // model_type: "custom" le dice a Transformers.js que no valide la arquitectura
      model = await transformers.AutoModel.from_pretrained('briaai/RMBG-1.4', {
        config: { model_type: 'custom' },
        progress_callback: (progress: { loaded: number; total: number }) => {
          if (progress.total > 0) {
            const pct = Math.min(50, 15 + Math.round((progress.loaded / progress.total) * 35));
            onProgress?.(pct);
          }
        },
      });
      onProgress?.(50);

      // Cargar procesador con configuración explícita
      // (no usa preprocessor_config.json del modelo porque el modelo
      // tiene config_type custom no estándar)
      processor = await transformers.AutoProcessor.from_pretrained(
        'briaai/RMBG-1.4',
        { config: getProcessorConfig() },
      );
      onProgress?.(60);

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
 * Aplica la máscara alpha a la imagen original y devuelve
 * la imagen procesada como base64 PNG (con canal alfa).
 */
function applyMaskToImage(
  img: HTMLImageElement,
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // Dibujar imagen original
  ctx.drawImage(img, 0, 0);

  // Obtener pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Aplicar máscara: usar maskData como canal alfa
  const scaleX = img.width / maskWidth;
  const scaleY = img.height / maskHeight;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const maskX = Math.round(x / scaleX);
      const maskY = Math.round(y / scaleY);
      const pixelIndex = (y * img.width + x) * 4;
      const maskIndex = maskY * maskWidth + maskX;

      // maskData tiene valores 0-255 (0 = fondo, 255 = foreground)
      pixels[pixelIndex + 3] = maskData[maskIndex];
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
    // Cargar imagen como RawImage
    const img = await base64ToImage(base64, mimeType);
    const rawImage = await transformersModule.RawImage.fromURL(
      `data:${mimeType};base64,${base64}`,
    );

    // Preprocesar y ejecutar modelo (mismo approach que Xenova demo)
    const { pixel_values } = await processor(rawImage);
    const { output } = await model({ input: pixel_values });

    // output[0] es un tensor 0-1 → convertir a uint8 mask
    const maskTensor = output[0].mul(255).to('uint8');
    const maskImage = await transformersModule.RawImage.fromTensor(maskTensor);
    const resizedMask = await maskImage.resize(img.width, img.height);

    // Aplicar máscara como canal alfa
    const processedBase64 = applyMaskToImage(img, resizedMask.data, img.width, img.height);

    console.log('[BackgroundRemoval] Background removed successfully');
    return { base64: processedBase64, bgRemoved: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundRemoval] Error:', msg);
    return { base64, bgRemoved: false, error: msg };
  }
}
