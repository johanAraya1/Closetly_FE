# Tasks: Chat/Messaging — FE

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~635 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation+Data) → PR 2 (Screens+Nav) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + i18n + constants + chatService + chatStore | PR 1 | ~320 lines — data layer without UI |
| 2 | Chat list + Chat room + Tab entry + Contact button | PR 2 | ~315 lines — all screens and navigation |

## Phase 1: Foundation

- [x] 1.1 Add `Conversation`, `Message`, `CreateConversationDTO`, `SendMessageDTO` types to `types/index.ts`
- [x] 1.2 Add `SUPABASE_URL`, `SUPABASE_ANON_KEY` to `lib/constants.ts`
- [x] 1.3 Add `chat.*` i18n keys (es/en) to i18n files
- [x] 1.4 Add `@supabase/realtime-js` dependency to `package.json`

## Phase 2: Data Layer

- [x] 2.1 Create `services/chatService.ts` with `getConversations`, `getMessages`, `createConversation`, `sendMessage` using `apiClient`
- [x] 2.2 Create `store/chatStore.ts` — Zustand store with `conversations`, `messages`, loading states, actions, Realtime subscription management (`subscribeToConversation`, `unsubscribeFromConversation`), optimistic updates on send

## Phase 3: Screens

- [x] 3.1 Create `app/(tabs)/chat.tsx` — FlatList with conversations, pull-to-refresh, empty state, tap navigates to room
- [x] 3.2 Create `app/chat/[id].tsx` — FlatList with messages, auto-scroll to bottom, input bar, send button, subscribe/unsubscribe Realtime on mount/unmount, load more on pull-to-refresh

## Phase 4: Navigation

- [x] 4.1 Add Messages tab (`chatbubbles-outline` icon) to `app/(tabs)/_layout.tsx`
- [x] 4.2 Add "Contactar" button to `app/marketplace/[id].tsx` — calls `chatStore.createConversation()`, navigates to room on success

## Phase 5: Verification

- [x] 5.1 Run `tsc --noEmit` — 0 new type errors (all errors pre-existing)
- [ ] 5.2 Run `npx expo export --platform web` — verify bundle succeeds

## Phase 6: Typing Indicator

- [x] 6.1 Modify `chatRealtime.ts` — add broadcast listener for `typing` events, `broadcastTyping()` export, and `onTyping` callback to `createRealtimeChannel`
- [x] 6.2 Modify `chatStore.ts` — add `isTyping` state, `setTyping` action, wire `onTyping` in `subscribeToConversation`
- [x] 6.3 Modify `app/chat/[id].tsx` — add debounced typing broadcast on keystroke, typing indicator UI, cleanup on unmount
- [x] 6.4 Add `chat.typing` i18n key (en: "Typing...", es: "Escribiendo...")
- [x] 6.5 Update `mapPayloadToMessage` — map `edited_at` and `deleted_at` fields
