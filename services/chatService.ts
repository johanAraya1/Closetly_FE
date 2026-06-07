/**
 * Chat Service
 * Servicio para el sistema de mensajería
 * Screen → Store → Service → API
 */

import { apiClient } from '@/utils/apiClient';
import type { Conversation, Message, CreateConversationDTO } from '@/types';

export const chatService = {
  /**
   * Obtiene todas las conversaciones del usuario autenticado
   */
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<Conversation[]>('/chat/conversations');
    return res.data || [];
  },

  /**
   * Obtiene mensajes paginados de una conversación
   */
  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: Message[]; total: number; hasMore: boolean }> {
    const res = await apiClient.get<{ data: Message[]; total: number; hasMore: boolean }>(
      `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return res.data || { data: [], total: 0, hasMore: false };
  },

  /**
   * Crea una nueva conversación con un vendedor
   */
  async createConversation(dto: CreateConversationDTO): Promise<Conversation> {
    const res = await apiClient.post<Conversation>('/chat/conversations', dto);
    if (!res.data) throw new Error(res.error || 'No se pudo crear la conversación');
    return res.data;
  },

  /**
   * Envía un mensaje en una conversación existente
   * @param imageUrl - URL opcional de imagen adjunta
   */
  async sendMessage(conversationId: string, content: string, imageUrl?: string): Promise<Message> {
    const body: Record<string, unknown> = {};
    if (content) body.content = content;
    if (imageUrl) body.imageUrl = imageUrl;

    const res = await apiClient.post<Message>(
      `/chat/conversations/${conversationId}/messages`,
      body
    );
    if (!res.data) throw new Error(res.error || 'No se pudo enviar el mensaje');
    return res.data;
  },

  /**
   * Sube una imagen para adjuntar a un mensaje de chat
   * Sigue el mismo patrón que garmentService.uploadGarmentImage
   */
  async uploadChatImage(uri: string): Promise<{ url: string; storagePath: string }> {
    const formData = new FormData();
    const fileName = `chat-${Date.now()}.jpg`;

    formData.append('image', {
      uri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    const res = await apiClient.upload<{ url: string; storagePath: string }>('/chat/upload', formData);
    if (res.error || !res.data) {
      throw new Error(res.error || 'No se pudo subir la imagen');
    }
    return res.data;
  },

  /**
   * Edita un mensaje existente (solo contenido)
   */
  async editMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    const res = await apiClient.patch<Message>(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
      { content }
    );
    if (!res.data) throw new Error(res.error || 'No se pudo editar el mensaje');
    return res.data;
  },

  /**
   * Elimina un mensaje (soft delete)
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const res = await apiClient.delete<void>(
      `/chat/conversations/${conversationId}/messages/${messageId}`
    );
    if (res.error) throw new Error(res.error || 'No se pudo eliminar el mensaje');
  },
};
