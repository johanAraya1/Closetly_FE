/**
 * Chat Realtime Service
 * Subscripción Realtime para mensajes en vivo usando @supabase/realtime-js
 * - postgres_changes para INSERT en la tabla `messages`
 * - broadcast para typing indicator (sin DB)
 *
 * Uso standalone (sin store):
 *   const { unsubscribe } = createRealtimeChannel(convId, userId, onMessage);
 *   // cleanup:
 *   unsubscribe();
 *
 * Typing broadcast:
 *   import { broadcastTyping } from '@/services/chatRealtime';
 *   broadcastTyping(convId, currentUserId, true);  // empezó a escribir
 *   broadcastTyping(convId, currentUserId, false); // dejó de escribir
 */

import { RealtimeClient } from '@supabase/realtime-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/constants';
import type { Message } from '@/types';

let _client: RealtimeClient | null = null;

// Trackea canales activos por conversationId para enviar broadcasts
const _channels = new Map<string, any>();

/**
 * Retorna la instancia singleton de RealtimeClient.
 * Valida SUPABASE_URL y SUPABASE_ANON_KEY antes de inicializar.
 */
const getClient = (): RealtimeClient => {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase Realtime no está configurado. ' +
        'Define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
        'en tu archivo .env',
      );
    }
    _client = new RealtimeClient(SUPABASE_URL, {
      params: { apikey: SUPABASE_ANON_KEY },
    });
  }
  return _client;
};

/**
 * Mapea un payload de Realtime (snake_case DB row) a la interfaz Message (camelCase)
 * Incluye editedAt y deletedAt para edit/delete en tiempo real
 */
const mapPayloadToMessage = (payload: Record<string, any>): Message => ({
  id: payload.id,
  conversationId: payload.conversation_id,
  senderId: payload.sender_id,
  content: payload.content,
  createdAt: payload.created_at,
  editedAt: payload.edited_at,
  deletedAt: payload.deleted_at,
});

/**
 * Crea una subscripción Realtime para una conversación.
 *
 * @param conversationId - ID de la conversación a escuchar
 * @param currentUserId - ID del usuario actual (para filtrar sus propios mensajes)
 * @param onMessage - Callback invocado cuando llega un mensaje NUEVO de OTRO usuario
 * @param onTyping - Callback opcional invocado cuando OTRO usuario escribe (recibe isTyping)
 * @returns Objeto con función `unsubscribe` para limpiar la subscripción
 */
export const createRealtimeChannel = (
  conversationId: string,
  currentUserId: string,
  onMessage: (message: Message) => void,
  onTyping?: (isTyping: boolean) => void
): { unsubscribe: () => void } => {
  const channel = getClient().channel(`messages:conv_${conversationId}`);

  // Track para poder enviar broadcasts desde fuera
  _channels.set(conversationId, channel);

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload: any) => {
      // Ignorar mensajes enviados por el usuario actual (ya están con optimistic update)
      if (payload.new && payload.new.sender_id !== currentUserId) {
        onMessage(mapPayloadToMessage(payload.new));
      }
    }
  );

  // Broadcast listener para typing indicator
  if (onTyping) {
    channel.on('broadcast', { event: 'typing' }, (response: any) => {
      const data = response.payload || response;
      // Solo reaccionar a eventos de OTRO usuario
      if (data.senderId && data.senderId !== currentUserId) {
        onTyping(data.isTyping);
      }
    });
  }

  channel.subscribe();

  return {
    unsubscribe: () => {
      channel.unsubscribe();
      _channels.delete(conversationId);
    },
  };
};

/**
 * Envía un broadcast de typing para una conversación.
 * Úsalo desde el onChangeText del input con un debounce de 2s.
 *
 * @param conversationId - ID de la conversación
 * @param senderId - ID del usuario que está escribiendo
 * @param isTyping - true si empezó a escribir, false si dejó
 */
export const broadcastTyping = (
  conversationId: string,
  senderId: string,
  isTyping: boolean
): void => {
  const channel = _channels.get(conversationId);
  if (!channel) return;

  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { senderId, isTyping },
  });
};

/**
 * Cierra la conexión Realtime global y libera recursos.
 * Llamar solo cuando la app cierra sesión o se destruye.
 */
export const disconnectRealtime = (): void => {
  if (_client) {
    _client.disconnect();
    _client = null;
  }
};
