/**
 * Chat Service
 * Servicio para el sistema de mensajería
 * Screen → Store → Service → API
 */

import { apiClient } from '@/utils/apiClient';
import type { Conversation, Message, CreateConversationDTO } from '@/types';

/**
 * Normaliza una conversación de API (snake_case) a camelCase.
 * Misma lógica que normalizeGarment en garmentService.
 */
function normalizeConversation(raw: any): Conversation {
  const otherRaw = raw.otherParticipant || raw.other_participant;

  let userId = '';
  let username: string | undefined;
  let avatarUrl: string | undefined;

  if (otherRaw) {
    userId = otherRaw.userId || otherRaw.user_id || '';
    username = otherRaw.username || otherRaw.display_name;
    avatarUrl = otherRaw.avatarUrl || otherRaw.avatar_url;
  } else {
    // Fallback: buscar campos planos (camelCase y snake_case)
    userId = raw.otherParticipantId || raw.other_participant_id
          || raw.otherUserId || raw.other_user_id
          || raw.sellerId || raw.seller_id
          || raw.buyerId || raw.buyer_id
          || raw.otherUser?.id || raw.other_user?.id
          || '';
    username = raw.otherParticipantName || raw.other_participant_name
            || raw.otherUsername || raw.other_username
            || raw.otherDisplayName || raw.other_display_name
            || raw.otherUser?.name || raw.otherUser?.username
            || raw.other_user?.name || raw.other_user?.username
            || raw.otherUser?.displayName
            || undefined;
    avatarUrl = raw.otherParticipantAvatar || raw.other_participant_avatar
             || raw.otherAvatarUrl || raw.other_avatar_url
             || raw.otherAvatar || raw.other_avatar
             || raw.otherUser?.avatarUrl || raw.otherUser?.avatar_url
             || raw.other_user?.avatar_url
             || undefined;
  }

  const otherParticipant = { userId, username, avatarUrl };

  // Si no hay userId, mostrar genérico
  if (!otherParticipant.userId && !otherParticipant.username) {
    otherParticipant.username = 'Usuario';
  }

  // Normalizar lastMessage: puede ser objeto o string plano
  let lastMessage: Conversation['lastMessage'];
  const lastMsgRaw = raw.lastMessage || raw.last_message;
  if (typeof lastMsgRaw === 'string') {
    lastMessage = {
      content: lastMsgRaw,
      createdAt: raw.lastMessageAt || raw.last_message_at || '',
      senderId: '',
    };
  } else if (lastMsgRaw) {
    lastMessage = {
      content: lastMsgRaw.content || '',
      createdAt: lastMsgRaw.createdAt || lastMsgRaw.created_at || raw.lastMessageAt || raw.last_message_at || '',
      senderId: lastMsgRaw.senderId || lastMsgRaw.sender_id || '',
    };
  }

  return {
    id: raw.id || '',
    listingType: raw.listingType || raw.listing_type || '',
    listingGarmentId: raw.listingGarmentId || raw.listing_garment_id || '',
    listingTitle: raw.listingTitle || raw.listing_title || '',
    otherParticipant,
    lastMessage,
    unreadCount: raw.unreadCount ?? raw.unread_count ?? 0,
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
  };
}

export const chatService = {
  /**
   * Obtiene todas las conversaciones del usuario autenticado
   */
    async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<any[]>('/chat/conversations');
    return (res.data || []).map(normalizeConversation);
  },

  /**
   * Obtiene mensajes paginados de una conversación
   *
   * ATENCIÓN: apiClient.request unwraplea result.data, entonces si el backend
   * devuelve { data: [...], hasMore, total }, apiClient devuelve solo el array
   * interno. Este método maneja ambos formatos para no perder los mensajes.
   */
  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: Message[]; total: number; hasMore: boolean }> {
    const res = await apiClient.get<any>(
      `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );

    if (res.error) {
      return { data: [], total: 0, hasMore: false };
    }

    const payload = res.data;

    // Caso 1: apiClient unwrappeó → payload es el array directamente
    if (Array.isArray(payload)) {
      return { data: payload as Message[], total: payload.length, hasMore: false };
    }

    // Caso 2: payload ya viene en el formato { data: [...], hasMore, total }
    if (payload && Array.isArray((payload as any).data)) {
      return payload as { data: Message[]; total: number; hasMore: boolean };
    }

    return { data: [], total: 0, hasMore: false };
  },

  /**
   * Crea una nueva conversación con un vendedor
   */
  async createConversation(dto: CreateConversationDTO): Promise<Conversation> {
    const res = await apiClient.post<any>('/chat/conversations', dto);
    if (!res.data) throw new Error(res.error || 'No se pudo crear la conversación');
    return normalizeConversation(res.data);
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

  /**
   * Marca una conversación como leída
   */
  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.patch(`/chat/conversations/${conversationId}/read`);
  },
};
