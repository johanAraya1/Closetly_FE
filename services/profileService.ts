/**
 * Profile Service
 * Servicio para gestionar perfiles de usuario
 */

import { apiClient } from '@/utils/apiClient';
import type { Profile, ApiResponse } from '@/types';

/**
 * Obtiene el perfil del usuario autenticado
 */
export const getProfile = async (userId: string): Promise<ApiResponse<Profile>> => {
  return apiClient.get<Profile>(`/users/me`, { timeout: 10000 });
};

/**
 * Actualiza el perfil del usuario autenticado
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ApiResponse<Profile>> => {
  return apiClient.put<Profile>(`/users/me`, updates, { timeout: 10000 });
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
  formData.append('file', {
    uri: imageUri,
    name: fileName,
    type: 'image/jpeg',
  } as any);

  return apiClient.upload<{ url: string }>(`/users/me/avatar`, formData).then(
    (response) => {
      if (response.error) {
        return { error: response.error };
      }
      return { data: response.data?.url || '' };
    }
  );
};
