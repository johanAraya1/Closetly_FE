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
  // El backend espera camelCase, no snake_case
  const body: Record<string, any> = {};
  if (updates.username !== undefined) body.username = updates.username;
  if (updates.full_name !== undefined) body.fullName = updates.full_name;
  if (updates.bio !== undefined) body.bio = updates.bio;
  if (updates.avatar_url !== undefined) body.avatarUrl = updates.avatar_url;
  if (updates.is_public !== undefined) body.isPublic = updates.is_public;

  return apiClient.put<Profile>(`/users/me`, body, { timeout: 10000 });
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
