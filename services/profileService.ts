/**
 * Profile Service
 * Servicio para gestionar perfiles de usuario
 */

import { apiClient } from '@/utils/apiClient';
import type { Profile, ApiResponse } from '@/types';

/**
 * Obtiene el perfil de un usuario por su ID
 */
export const getProfile = async (userId: string): Promise<ApiResponse<Profile>> => {
  return apiClient.get<Profile>(`/profile/${userId}`, { timeout: 10000 });
};

/**
 * Actualiza el perfil del usuario
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ApiResponse<Profile>> => {
  return apiClient.put<Profile>(`/profile/${userId}`, updates, { timeout: 10000 });
};

/**
 * Sube una imagen de avatar
 */
export const uploadAvatar = async (
  userId: string,
  imageUri: string
): Promise<ApiResponse<string>> => {
  // Crear FormData para subir la imagen
  const formData = new FormData();
  const fileName = `avatar-${userId}-${Date.now()}.jpg`;
  
  // En React Native, necesitamos crear un objeto con uri, name y type
  formData.append('avatar', {
    uri: imageUri,
    name: fileName,
    type: 'image/jpeg',
  } as any);

  return apiClient.upload<{ url: string }>(`/profile/${userId}/avatar`, formData).then(
    (response) => {
      if (response.error) {
        return { error: response.error };
      }
      return { data: response.data?.url || '' };
    }
  );
};
