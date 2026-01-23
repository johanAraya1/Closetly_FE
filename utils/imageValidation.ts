/**
 * Image Validation Utils
 * Valida tipo y tamaño de imágenes para prevenir abusos
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida que una imagen sea de tipo y tamaño permitido
 */
export const validateImage = (blob: Blob): ImageValidationResult => {
  // Validar tipo
  if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Validar tamaño
  if (blob.size > MAX_IMAGE_SIZE) {
    const maxMB = MAX_IMAGE_SIZE / 1024 / 1024;
    return {
      valid: false,
      error: `Imagen demasiado grande. Tamaño máximo: ${maxMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Valida una URI de imagen y retorna el blob validado
 */
export const validateImageUri = async (imageUri: string): Promise<{
  blob?: Blob;
  error?: string;
}> => {
  try {
    const response = await fetch(imageUri);
    
    if (!response.ok) {
      return { error: 'No se pudo cargar la imagen' };
    }

    const blob = await response.blob();
    const validation = validateImage(blob);

    if (!validation.valid) {
      return { error: validation.error };
    }

    return { blob };
  } catch (error) {
    return { error: 'Error al procesar la imagen' };
  }
};

/**
 * Obtiene información de una imagen
 */
export const getImageInfo = (blob: Blob): {
  type: string;
  sizeMB: number;
  sizeKB: number;
} => {
  return {
    type: blob.type,
    sizeMB: parseFloat((blob.size / 1024 / 1024).toFixed(2)),
    sizeKB: parseFloat((blob.size / 1024).toFixed(2)),
  };
};
