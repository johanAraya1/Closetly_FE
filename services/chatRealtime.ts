/**
 * Chat Realtime Service
 * Subscripción Realtime para mensajes en vivo usando @supabase/realtime-js
 * Se subscribe a INSERT en la tabla `messages` filtrada por conversation_id
 *
 * Uso standalone (sin store):
 *   const { unsubscribe } = createRealtimeChannel(convId, userId, onMessage);
 *   // cleanup:
 *   unsubscribe();
 */

import { RealtimeClient } from '@supabase/realtime-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/constants';
import type { Message } from '@/types';

let _client: RealtimeClient | null = null;

/**
 * Retorna la instancia singleton de RealtimeClient
 */
const getClient = (): RealtimeClient => {
  if (!_client) {
    _client = new RealtimeClient(SUPABASE_URL, {
      params: { apikey: SUPABASE_ANON_KEY },
    });
  }
  return _client;
};

/**
 * Mapea un payload de Realtime (snake_case DB row) a la interfaz Message (camelCase)
 */
const mapPayloadToMessage = (payload: Record<string, any>): Message => ({
  id: payload.id,
  conversationId: payload.conversation_id,
  senderId: payload.sender_id,
  content: payload.content,
  createdAt: payload.created_at,
});

/**
 * Crea una subscripción Realtime para una conversación.
 *
 * @param conversationId - ID de la conversación a escuchar
 * @param currentUserId - ID del usuario actual (para filtrar sus propios mensajes)
 * @param onMessage - Callback invocado cuando llega un mensaje NUEVO de OTRO usuario
 * @returns Objeto con función `unsubscribe` para limpiar la subscripción
 */
export const createRealtimeChannel = (
  conversationId: string,
  currentUserId: string,
  onMessage: (message: Message) => void
): { unsubscribe: () => void } => {
  const channel = getClient().channel(`messages:conv_${conversationId}`);

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

  channel.subscribe();

  return {
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
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
