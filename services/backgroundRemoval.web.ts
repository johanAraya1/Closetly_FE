/**
 * Background Removal Service — Web
 * Client-side background removal usando Transformers.js en un Web Worker.
 * 
 * La inferencia corre en un worker para NO bloquear el main thread.
 * El main thread se encarga de operaciones DOM (cargar imagen, aplicar
 * máscara al canvas) que son rápidas (~5ms).
 */

import { Platform } from 'react-native';

// ─── Worker Script ───────────────────────────────────────────────────────────

const WORKER_SCRIPT = `
  let transformers = null;
  let model = null;
  let processor = null;
  let modelLoaded = false;
  let modelLoading = false;

  const processorConfig = {
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

  async function loadModel() {
    if (modelLoaded || modelLoading) return;
    modelLoading = true;

    try {
      self.postMessage({ type: 'progress', progress: 5 });

      transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm');
      self.postMessage({ type: 'progress', progress: 15 });

      model = await transformers.AutoModel.from_pretrained('briaai/RMBG-1.4', {
        config: { model_type: 'custom' },
        progress_callback: function(p) {
          if (p.total > 0) {
            var pct = Math.min(50, 15 + Math.round((p.loaded / p.total) * 35));
            self.postMessage({ type: 'progress', progress: pct });
          }
        },
      });
      self.postMessage({ type: 'progress', progress: 50 });

      processor = await transformers.AutoProcessor.from_pretrained(
        'briaai/RMBG-1.4',
        { config: processorConfig },
      );
      self.postMessage({ type: 'progress', progress: 60 });

      modelLoaded = true;
      self.postMessage({ type: 'progress', progress: 100 });
      self.postMessage({ type: 'ready' });
    } catch (err) {
      modelLoading = false;
      modelLoaded = false;
      self.postMessage({ type: 'loading_error', message: (err && err.message) || String(err) });
    }
  }

  self.addEventListener('message', async function(e) {
    var msg = e.data;
    var type = msg.type;
    var id = msg.id;

    if (type === 'preload') {
      loadModel();
      return;
    }

    if (type === 'removeBackground') {
      try {
        if (!modelLoaded) await loadModel();
        if (!modelLoaded) {
          self.postMessage({ type: 'error', id: id, message: 'Model not available' });
          return;
        }

        // Create RawImage from raw RGB pixel data
        var rawImage = new transformers.RawImage(
          new Uint8Array(msg.pixels),
          msg.width,
          msg.height,
          msg.channels || 3
        );

        // Run inference
        var processed = await processor(rawImage);
        var pixelValues = processed.pixel_values;
        var outputs = await model({ input: pixelValues });
        var output = outputs.output;

        // Get mask tensor (0-1 float) → uint8 (0-255)
        var maskTensor = output[0].mul(255).to('uint8');
        var maskDims = maskTensor.dims; // [1, H, W] usually

        // maskDims shape depends on model output; typically [1, 1024, 1024]
        var maskH = maskDims[1];
        var maskW = maskDims[2];
        var maskData = maskTensor.data.buffer;

        self.postMessage(
          { type: 'result', id: id, maskData: maskData, maskWidth: maskW, maskHeight: maskH },
          [maskData]
        );
      } catch (err) {
        self.postMessage({ type: 'error', id: id, message: (err && err.message) || String(err) });
      }
    }
  });

  // Start preloading immediately
  loadModel();
`;

// ─── Main Thread ─────────────────────────────────────────────────────────────

type ProgressCallback = (progress: number) => void;

let worker: Worker | null = null;
let workerReady = false;
let workerLoading = false;
let loadError: string | null = null;
let onProgress: ProgressCallback | null = null;
let requestIdCounter = 0;
const pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>();
let pendingReady: ReturnType<typeof createDeferred> | null = null;

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
  return workerReady;
}

/**
 * Verificar si el modelo está cargando actualmente
 */
export function isModelLoading(): boolean {
  return workerLoading;
}

/**
 * Obtener el último error de carga, si hubo
 */
export function getLoadError(): string | null {
  return loadError;
}

function getWorkerUrl(): string {
  const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

function createWorker(): Worker {
  const url = getWorkerUrl();
  const w = new Worker(url);

  w.onmessage = (e: MessageEvent) => {
    handleWorkerMessage(w, e.data);
  };

  w.onerror = (e: ErrorEvent) => {
    console.error('[BackgroundRemoval] Worker error:', e.message);
  };

  return w;
}

function handleWorkerMessage(_worker: Worker, msg: any) {
  const { type, id, ...data } = msg;

  switch (type) {
    case 'ready':
      workerReady = true;
      workerLoading = false;
      loadError = null;
      pendingReady?.resolve();
      pendingReady = null;
      break;

    case 'progress':
      onProgress?.(data.progress);
      break;

    case 'loading_error':
      workerReady = false;
      workerLoading = false;
      loadError = data.message || 'Unknown loading error';
      pendingReady?.reject(new Error(loadError!));
      pendingReady = null;
      // Reject all pending requests
      for (const [, pending] of pendingRequests) {
        pending.reject(new Error(loadError!));
      }
      pendingRequests.clear();
      break;

    case 'result': {
      const pending = pendingRequests.get(id);
      if (pending) {
        pending.resolve({ maskData: data.maskData, maskWidth: data.maskWidth, maskHeight: data.maskHeight });
        pendingRequests.delete(id);
      }
      break;
    }

    case 'error': {
      const pending = pendingRequests.get(id);
      if (pending) {
        pending.reject(new Error(data.message || 'Worker error'));
        pendingRequests.delete(id);
      }
      break;
    }
  }
}

function ensureWorker(): Worker {
  if (!worker) {
    workerLoading = true;
    worker = createWorker();
  }
  return worker;
}

function postToWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestIdCounter++;
    pendingRequests.set(id, { resolve, reject });
    const w = ensureWorker();
    try {
      w.postMessage({ ...message, id });
    } catch (err) {
      pendingRequests.delete(id);
      reject(err);
    }
  });
}

/**
 * Precarga el modelo de background removal en segundo plano.
 */
export function preloadBackgroundRemovalModel(): void {
  if (Platform.OS !== 'web') return;
  if (workerReady || workerLoading) return;
  ensureWorker();
}

/**
 * Fuerza la carga del modelo y espera a que termine.
 * No necesita round-trip al worker — usa una promise local
 * que se resuelve cuando el worker manda 'ready'.
 */
export async function ensureModelLoaded(): Promise<boolean> {
  if (workerReady) return true;
  if (!workerLoading) preloadBackgroundRemovalModel();
  if (workerLoading) {
    if (!pendingReady) {
      pendingReady = createDeferred();
    }
    try {
      await pendingReady.promise;
    } catch {
      return false;
    }
  }
  return workerReady;
}

/** Promise externa simple */
function createDeferred<T = void>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: any) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
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
 * La inferencia corre en un Web Worker para no bloquear el main thread.
 */
export async function removeBackground(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<{ base64: string; bgRemoved: boolean; error?: string }> {
  if (Platform.OS !== 'web') {
    return { base64, bgRemoved: false, error: 'Only works on web' };
  }

  try {
    // 1. Cargar imagen en el main thread (DOM API necesario)
    const img = await base64ToImage(base64, mimeType);

    // 2. Extraer pixels RGB desde canvas (rápido, ~5ms)
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = imageData.data;

    // Convertir RGBA → RGB (el procesador espera 3 canales)
    const pixelCount = img.width * img.height;
    const pixels = new Uint8Array(pixelCount * 3);
    for (let i = 0; i < pixelCount; i++) {
      const s = i * 4;
      const d = i * 3;
      pixels[d] = rgba[s];
      pixels[d + 1] = rgba[s + 1];
      pixels[d + 2] = rgba[s + 2];
    }

    // 3. Enviar pixels al worker (la inferencia corre en background)
    const result = await postToWorker({
      type: 'removeBackground',
      pixels: pixels.buffer,
      width: img.width,
      height: img.height,
      channels: 3,
    });

    // 4. Aplicar máscara en el main thread (rápido, ~5ms)
    const mask = new Uint8Array(result.maskData);
    const processedBase64 = applyMaskToImage(img, mask, result.maskWidth, result.maskHeight);

    console.log('[BackgroundRemoval] Background removed successfully');
    return { base64: processedBase64, bgRemoved: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundRemoval] Error:', msg);
    return { base64, bgRemoved: false, error: msg };
  }
}
