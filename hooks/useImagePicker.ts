/**
 * useImagePicker Hook
 * Hook personalizado para seleccionar y optimizar imágenes
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { pickImageFromGallery, takePhoto } from '@/utils/imageUtils';
import type { ImagePickOptions } from '@/utils/imageUtils';
import * as garmentService from '@/services/garmentService';
import * as profileService from '@/services/profileService';

interface UseImagePickerReturn {
  imageUri: string | null;
  isUploading: boolean;
  pickImage: (crop?: boolean) => Promise<void>;
  capturePhoto: (crop?: boolean) => Promise<void>;
  uploadGarmentImage: (userId: string) => Promise<string | null>;
  uploadAvatarImage: (userId: string) => Promise<string | null>;
  resetImage: () => void;
}

export const useImagePicker = (): UseImagePickerReturn => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async (crop: boolean = false) => {
    try {
      const uri = await pickImageFromGallery({ crop });
      if (uri) {
        setImageUri(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const capturePhoto = async (crop: boolean = false) => {
    try {
      const uri = await takePhoto({ crop });
      if (uri) {
        setImageUri(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const uploadGarmentImage = async (userId: string): Promise<string | null> => {
    if (!imageUri) return null;

    setIsUploading(true);
    try {
      const result = await garmentService.uploadGarmentImage(userId, imageUri);
      setIsUploading(false);

      if (result.error) {
        Alert.alert('Error', result.error);
        return null;
      }

      return result.data || null;
    } catch (error) {
      setIsUploading(false);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    }
  };

  const uploadAvatarImage = async (userId: string): Promise<string | null> => {
    if (!imageUri) return null;

    setIsUploading(true);
    try {
      const result = await profileService.uploadAvatar(userId, imageUri);
      setIsUploading(false);

      if (result.error) {
        Alert.alert('Error', result.error);
        return null;
      }

      return result.data || null;
    } catch (error) {
      setIsUploading(false);
      Alert.alert('Error', 'Failed to upload avatar');
      return null;
    }
  };

  const resetImage = () => {
    setImageUri(null);
  };

  return {
    imageUri,
    isUploading,
    pickImage,
    capturePhoto,
    uploadGarmentImage,
    uploadAvatarImage,
    resetImage,
  };
};
