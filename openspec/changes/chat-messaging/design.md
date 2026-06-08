# Design: Chat/Messaging — FE

## Technical Approach

React Native + Expo Router + Zustand + `@supabase/realtime-js`. Patrón Screen → Store → Service → API. Store maneja el ciclo de vida de subscripciones Realtime por conversación. Optimistic updates para mensajes enviados.

## Architecture Decisions

### Decision: Store-native Realtime (no hook separado)

| Opción | Tradeoff |
|--------|----------|
| Hook `useRealtime` separado | Más tests, más archivos, ciclo de vida duplicado |
| **Store maneja subscripción** | Una fuente de verdad; cleanup en store actions |

**Elección**: `chatStore` expone `subscribeToConversation(convId)` y `unsubscribeFromConversation(convId)`. Las screens llaman subscribe en mount, unsubscribe en unmount.

### Decision: `@supabase/realtime-js` standalone (no `@supabase/supabase-js`)

**Rationale**: Evitar cargar todo el client Supabase solo para Realtime. `realtime-js` es tree-shakeable y más liviano.

### Decision: Conversación como tab en navegación

**Rationale**: Match con el patrón existente de tabs en `(tabs)/_layout.tsx`. Se agrega un nuevo `Tabs.Screen` con icono `chatbubbles-outline`.

## Data Flow

```
1. Contactar → createConversation → POST /chat/conversations → navigate to room

2. Send message → optimistic append to messages[] → POST /chat/conversations/:id/messages
   → Realtime INSERT broadcast → other participant's subscription appends message

3. Open chat list → GET /chat/conversations → render FlatList
   Tap one → GET /chat/conversations/:id/messages?page=1 → subscribe Realtime
```

## Types (types/index.ts)

```typescript
export interface Conversation {
  id: string;
  listingType: ListingType;
  listingGarmentId: string;
  listingTitle: string;
  otherParticipant: { userId: string; username?: string; avatarUrl?: string };
  lastMessage?: { content: string; createdAt: string; senderId: string };
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface CreateConversationDTO {
  sellerId: string;
  listingType: ListingType;
  listingGarmentId: string;
  listingTitle: string;
}

export interface SendMessageDTO {
  content: string;
}
```

## Service (services/chatService.ts)

```typescript
export const getConversations(): Promise<Conversation[]>
export const getMessages(conversationId: string, page: number): Promise<PaginatedApiResponse<Message>>
export const createConversation(data: CreateConversationDTO): Promise<Conversation>
export const sendMessage(conversationId: string, content: string): Promise<Message>
```

Usa `apiClient` (`get`, `post`) — autenticación automática vía Bearer token.

## Store (store/chatStore.ts)

```typescript
interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  activeConversationId: string | null;
  isConnected: boolean; // Realtime connection status

  loadConversations: () => Promise<void>;
  loadMessages: (convId: string, reset?: boolean) => Promise<void>;
  sendMessage: (convId: string, content: string) => Promise<void>;
  createConversation: (data: CreateConversationDTO) => Promise<Conversation>;
  subscribeToConversation: (convId: string) => void;
  unsubscribeFromConversation: (convId: string) => void;
  setActiveConversation: (convId: string | null) => void;
}
```

- `_abortController` pattern (clase closure) para cancelación de requests.
- `subscribeToConversation`: crea `RealtimeChannel` con `{ event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }`.
- En callback: si `payload.new.sender_id !== currentUserId`, agrega a `messages[convId]`.
- `sendMessage`: optimistic push a `messages[convId]` con ID temporal, luego reemplaza con respuesta del server.

## Realtime Integration

```typescript
import { RealtimeClient } from '@supabase/realtime-js';

const client = new RealtimeClient(SUPABASE_URL, {
  params: { apikey: SUPABASE_ANON_KEY },
});

const channel = client.channel(`messages:conv_${convId}`);
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  filter: `conversation_id=eq.${convId}`,
}, (payload) => { /* append to store */ });
channel.subscribe();
```

Supabase URL y anon key en `lib/constants.ts` via `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Screens

**Chat List** — `app/(tabs)/chat.tsx`
- FlatList con conversations del store
- Cada row: avatar + username + last message preview + timestamp + unread badge
- Pull-to-refresh → `loadConversations()`
- Empty state: `t('chat.emptyList')`
- Tap → `router.push(\`/chat/${convId}\`)`

**Chat Room** — `app/chat/[id].tsx`
- `useLocalSearchParams()` obtiene `id`
- `useEffect`: `setActiveConversation(id)` → `loadMessages(id, true)` → `subscribeToConversation(id)`
- Cleanup: `unsubscribeFromConversation(id)`
- FlatList invertido (inverted), messages desde `store.messages[id]`
- Input + Send button (deshabilitado si vacío)
- Auto-scroll a bottom en nuevo mensaje
- Pull-to-refresh → `loadMessages(id, false)` (append page)

**"Contactar" button** en `app/marketplace/[id].tsx`:
- Llama `chatStore.createConversation({ sellerId, listingType, listingGarmentId, listingTitle })`
- En éxito: `router.push(\`/chat/${convId}\`)`

## Navigation

```typescript
// (tabs)/_layout.tsx — add after marketplace tab
<Tabs.Screen
  name="chat"
  options={{
    title: t('chat.tabTitle'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="chatbubbles-outline" size={size} color={color} />
    ),
  }}
/>
```

## i18n Keys

```typescript
chat: {
  tabTitle: 'Messages' | 'Mensajes',
  title: 'Messages' | 'Mensajes',
  inputPlaceholder: 'Write a message...' | 'Escribí un mensaje...',
  send: 'Send' | 'Enviar',
  emptyList: 'No conversations yet' | 'No tenés conversaciones aún',
  emptyRoom: 'Send the first message' | 'Enviá el primer mensaje',
  unread: '{{count}} unread' | '{{count}} sin leer',
  contactar: 'Contact' | 'Contactar',
}
```

## File Changes

| File | Acción |
|------|--------|
| `types/index.ts` | Modificar + Conversation, Message, DTOs |
| `lib/constants.ts` | Modificar + SUPABASE_URL, SUPABASE_ANON_KEY |
| `lib/i18n.ts` | Modificar + chat.* keys en/es |
| `services/chatService.ts` | Crear |
| `store/chatStore.ts` | Crear |
| `app/(tabs)/chat.tsx` | Crear |
| `app/(tabs)/_layout.tsx` | Modificar + chat tab |
| `app/chat/[id].tsx` | Crear |
| `app/marketplace/[id].tsx` | Modificar + botón Contactar |
| `package.json` | Modificar + `@supabase/realtime-js` |

## Open Questions

- [ ] ¿Cómo obtener `otherParticipant` (username/avatar) en `GET /chat/conversations`? El BE debe resolverlo con un join a `users` o exponer endpoint separado.
- [ ] ¿Manejo de errores de Realtime (reconexión)? `RealtimeClient` lo maneja automáticamente, pero store expone `isConnected` para UI feedback.
