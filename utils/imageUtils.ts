/**
 * Image Utils
 * Utilidades para optimizar y procesar imágenes
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { IMAGE_CONFIG } from '@/lib/constants';

/**
 * Optimiza una imagen reduciendo su tamaño y calidad
 */
export const optimizeImage = async (uri: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: { width: IMAGE_CONFIG.MAX_WIDTH },
        },
      ],
      {
        compress: IMAGE_CONFIG.QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return uri; // Devolver la URI original si falla
  }
};

/**
 * Opciones para selección de imagen
 */
export interface ImagePickOptions {
  /** Si se debe mostrar el editor de recorte después de seleccionar */
  crop?: boolean;
  /** Relación de aspecto para el recorte (solo si crop=true) */
  aspect?: [number, number];
}

/**
 * Abre el selector de imágenes de la galería
 */
export const pickImageFromGallery = async (
  options: ImagePickOptions = {}
): Promise<string | null> => {
  try {
    const { crop = false, aspect } = options;

    // En web, expo-image-picker usa <input type="file"> del browser
    // No necesita permisos especiales, pero requestMediaLibraryPermissionsAsync
    // puede devolver 'undetermined' en algunos contextos
    // En web, expo-image-picker usa <input type="file"> del browser
    // No necesita permisos especiales, pero requestMediaLibraryPermissionsAsync
    // puede devolver 'undetermined' en algunos contextos

    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      // En web, el permiso puede no estar soportado; intentar de todas formas
      if (Platform.OS !== 'web') {
        throw new Error('Permission to access gallery was denied');
      }
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: crop,
      ...(aspect ? { aspect } : {}),
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Optimizar imagen antes de devolverla
      const optimized = await optimizeImage(result.assets[0].uri);
      return optimized;
    }

    return null;
  } catch (error) {
    console.error('[ImageUtils] Error picking image:', error);
    return null;
  }
};

/**
 * Abre la cámara para tomar una foto
 */
export const takePhoto = async (
  options: ImagePickOptions = {}
): Promise<string | null> => {
  try {
    const { crop = false } = options;

    // Solicitar permisos
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    // Abrir cámara
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: crop,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Optimizar imagen antes de devolverla
      return await optimizeImage(result.assets[0].uri);
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};
