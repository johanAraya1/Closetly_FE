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
   */
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const res = await apiClient.post<Message>(
      `/chat/conversations/${conversationId}/messages`,
      { content }
    );
    if (!res.data) throw new Error(res.error || 'No se pudo enviar el mensaje');
    return res.data;
  },
};
