/**
 * Chat Store
 * Store global para el sistema de mensajería
 *
 * Arquitectura: Screen → Store → Service → API
 * El store maneja el ciclo de vida de subscripciones Realtime por conversación,
 * optimistic updates para mensajes enviados, y paginación.
 *
 * Patrón de store: Zustand con closure para AbortController
 * (mismo patrón que marketplaceStore)
 */

import { create } from 'zustand';
import type { Conversation, Message, CreateConversationDTO } from '@/types';
import { chatService } from '@/services/chatService';
import { createRealtimeChannel } from '@/services/chatRealtime';
import { useAuthStore } from '@/store/authStore';

const DEFAULT_PAGE_LIMIT = 20;

interface ChatState {
  // Data
  conversations: Conversation[];
  messages: Record<string, Message[]>;

  // Pagination
  conversationPage: Record<string, number>;
  hasMoreMessages: Record<string, boolean>;

  // Loading states
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;

  // Active conversation
  activeConversationId: string | null;

  // Realtime connection status
  isConnected: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (convId: string, reset?: boolean) => Promise<void>;
  sendMessage: (convId: string, content: string) => Promise<void>;
  createConversation: (dto: CreateConversationDTO) => Promise<Conversation>;
  setActiveConversation: (convId: string | null) => void;
  subscribeToConversation: (convId: string) => void;
  unsubscribeFromConversation: () => void;
  clearError: () => void;
}

const initialState = {
  conversations: [],
  messages: {} as Record<string, Message[]>,
  conversationPage: {} as Record<string, number>,
  hasMoreMessages: {} as Record<string, boolean>,
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
  activeConversationId: null,
  isConnected: false,
};

export const useChatStore = create<ChatState>((set, get) => {
  // AbortController para cancelación de requests
  let _abortController: AbortController | null = null;

  const abortPrevious = (): AbortSignal => {
    _abortController?.abort();
    _abortController = new AbortController();
    return _abortController.signal;
  };

  // Referencia al channel de Realtime activo
  let _realtimeSubscription: { unsubscribe: () => void } | null = null;

  return {
    ...initialState,

    /**
     * Carga la lista de conversaciones del usuario
     */
    loadConversations: async () => {
      const signal = abortPrevious();
      set({ isLoading: true, error: null });

      const result = await chatService.getConversations();

      if (signal.aborted) return;

      // Verificar si hay error (duck typing: si no es array, puede ser response con error)
      if (!Array.isArray(result)) {
        const errorResponse = result as unknown as { error?: string };
        set({ isLoading: false, error: errorResponse.error || 'Error al cargar conversaciones' });
        return;
      }

      set({ conversations: result, isLoading: false });
    },

    /**
     * Carga mensajes de una conversación con paginación
     * @param convId - ID de la conversación
     * @param reset - Si true, reemplaza los mensajes existentes; si false, agrega al final
     */
    loadMessages: async (convId: string, reset: boolean = true) => {
      const { isLoadingMessages, conversationPage } = get();
      if (isLoadingMessages) return;

      const page = reset ? 0 : (conversationPage[convId] || 0);
      const signal = abortPrevious();
      set({ isLoadingMessages: true, error: null });

      const result = await chatService.getMessages(convId, page + 1, DEFAULT_PAGE_LIMIT);

      if (signal.aborted) return;

      // Verificar si hay error
      if (!result || (!Array.isArray(result.data) && (result as any).error)) {
        const errorResponse = result as unknown as { error?: string };
        set({ isLoadingMessages: false, error: errorResponse.error || 'Error al cargar mensajes' });
        return;
      }

      const { data: newMessages, hasMore } = result;

      set((state) => ({
        messages: {
          ...state.messages,
          [convId]: reset
            ? newMessages
            : [...(state.messages[convId] || []), ...newMessages],
        },
        conversationPage: {
          ...state.conversationPage,
          [convId]: page + 1,
        },
        hasMoreMessages: {
          ...state.hasMoreMessages,
          [convId]: hasMore,
        },
        isLoadingMessages: false,
      }));
    },

    /**
     * Envía un mensaje con optimistic update
     * 1. Agrega el mensaje inmediatamente al store con ID temporal
     * 2. Llama a la API
     * 3. Reemplaza el mensaje temporal con la respuesta del server
     * 4. En caso de error, remueve el mensaje temporal
     */
    sendMessage: async (convId: string, content: string) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const { user } = useAuthStore.getState();
      const senderId = user?.id || 'unknown';

      const optimisticMessage: Message = {
        id: tempId,
        conversationId: convId,
        senderId,
        content,
        createdAt: new Date().toISOString(),
      };

      // Optimistic append
      set((state) => ({
        messages: {
          ...state.messages,
          [convId]: [...(state.messages[convId] || []), optimisticMessage],
        },
        isSending: true,
      }));

      try {
        const sentMessage = await chatService.sendMessage(convId, content);

        // Reemplazar el mensaje temporal con el real del server
        set((state) => {
          const currentMessages = state.messages[convId] || [];
          return {
            messages: {
              ...state.messages,
              [convId]: currentMessages.map((msg) =>
                msg.id === tempId ? sentMessage : msg
              ),
            },
            isSending: false,
          };
        });
      } catch (err) {
        // Error: remover el mensaje temporal
        set((state) => {
          const currentMessages = state.messages[convId] || [];
          return {
            messages: {
              ...state.messages,
              [convId]: currentMessages.filter((msg) => msg.id !== tempId),
            },
            isSending: false,
            error: err instanceof Error ? err.message : 'Error al enviar mensaje',
          };
        });
      }
    },

    /**
     * Crea una nueva conversación
     * @returns La conversación creada
     */
    createConversation: async (dto: CreateConversationDTO): Promise<Conversation> => {
      set({ error: null });

      try {
        const conversation = await chatService.createConversation(dto);

        // Agregar la conversación al listado existente
        set((state) => ({
          conversations: [conversation, ...state.conversations],
        }));

        return conversation;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear conversación';
        set({ error: errorMessage });
        throw err;
      }
    },

    /**
     * Establece la conversación activa y gestiona subscripción Realtime
     * Al llamar con un convId: subscribe a Realtime
     * Al llamar con null: unsubscribe del channel activo
     */
    setActiveConversation: (convId: string | null) => {
      const { activeConversationId, unsubscribeFromConversation } = get();

      // Si ya estaba en esa conversación, no hacer nada
      if (convId === activeConversationId) return;

      // Unsubscribe de la conversación anterior
      if (activeConversationId) {
        unsubscribeFromConversation();
      }

      set({ activeConversationId: convId });

      // Subscribe a la nueva conversación
      if (convId) {
        get().subscribeToConversation(convId);
      }
    },

    /**
     * Subscribe a Realtime para una conversación
     */
    subscribeToConversation: (convId: string) => {
      const { user } = useAuthStore.getState();
      const currentUserId = user?.id;

      if (!currentUserId) return;

      // Cleanup previous subscription
      if (_realtimeSubscription) {
        _realtimeSubscription.unsubscribe();
        _realtimeSubscription = null;
      }

      _realtimeSubscription = createRealtimeChannel(convId, currentUserId, (message) => {
        // Append incoming message to messages array
        set((state) => {
          const currentMessages = state.messages[convId] || [];
          // Evitar duplicados por si el mensaje ya llegó vía API response
          if (currentMessages.some((m) => m.id === message.id)) {
            return state;
          }
          return {
            messages: {
              ...state.messages,
              [convId]: [...currentMessages, message],
            },
          };
        });
      });

      set({ isConnected: true });
    },

    /**
     * Unsubscribe del channel Realtime activo
     */
    unsubscribeFromConversation: () => {
      if (_realtimeSubscription) {
        _realtimeSubscription.unsubscribe();
        _realtimeSubscription = null;
      }
      set({ isConnected: false });
    },

    clearError: () => set({ error: null }),
  };
});
