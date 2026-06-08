/**
 * Image Utils
 * Utilidades para optimizar y procesar imágenes
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
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
          resize: {
            width: IMAGE_CONFIG.MAX_WIDTH,
            height: IMAGE_CONFIG.MAX_HEIGHT,
          },
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

    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access gallery was denied');
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: crop,
      aspect: aspect ?? [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Optimizar imagen antes de devolverla
      return await optimizeImage(result.assets[0].uri);
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
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
