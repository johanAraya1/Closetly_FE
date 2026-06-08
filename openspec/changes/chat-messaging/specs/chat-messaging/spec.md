# Chat/Messaging — FE Specification

## chat-conversations (New)

### Purpose
Users SHALL view and navigate their marketplace conversations.

### Requirements

#### REQ-CONV-1: Conversation list screen
The app MUST display conversations via FlatList ordered by most recent activity.

##### Scenario: Has conversations
- GIVEN the user has 3 conversations
- WHEN they navigate to the chat tab
- THEN a list shows 3 items, each with avatar, username, last message preview, timestamp, unread indicator

##### Scenario: Empty state
- GIVEN the user has no conversations
- WHEN they navigate to the chat tab
- THEN "No conversations yet" is displayed

##### Scenario: Pull to refresh
- GIVEN the conversation list is visible
- WHEN the user pulls down
- THEN the list refreshes from GET /conversations

#### REQ-CONV-2: Navigate to conversation
Tapping a conversation SHALL navigate to the chat room screen.

##### Scenario: Open conversation
- GIVEN the list shows conversation C
- WHEN the user taps C
- THEN the app navigates to C's chat room with message history loaded

#### REQ-CONV-3: "Contactar" button
Garment detail SHALL show a "Contactar" button that creates or opens a conversation.

##### Scenario: First contact
- GIVEN user A viewing garment G from seller B
- WHEN A taps "Contactar"
- THEN chatStore.createConversation(garmentId) is called
- AND the app navigates to the new or existing conversation

##### Scenario: Existing conversation
- GIVEN a conversation already exists between A and B for G
- WHEN A taps "Contactar"
- THEN the existing conversation is reopened

---

## chat-messages (New)

### Purpose
Users SHALL send and receive text messages in real-time within a conversation.

### Requirements

#### REQ-MSG-1: Message list
Messages SHALL display in a FlatList with auto-scroll to newest.

##### Scenario: Load history
- GIVEN user A opens conversation with B
- WHEN the chat room mounts
- THEN the 20 most recent messages are loaded and displayed, scrolled to bottom

##### Scenario: Load more
- GIVEN A scrolls to the top of the list
- WHEN hasMore is true
- THEN the next 20 messages are prepended; previous scroll position preserved

#### REQ-MSG-2: Send message
The input bar SHALL allow sending text.

##### Scenario: Send text
- GIVEN A typed "Hola" in the input
- WHEN A taps Send
- THEN the message appears immediately (optimistic update)
- AND chatService.sendMessage is called
- AND the input clears

##### Scenario: Empty disabled
- GIVEN the input is empty
- THEN the Send button is disabled

#### REQ-MSG-3: Real-time incoming messages
The app MUST subscribe via Realtime to receive new messages without polling.

##### Scenario: Other user sends
- GIVEN A is in the chat room with B
- WHEN B sends a message
- THEN it appears in A's list within 1s without manual refresh

##### Scenario: Background update
- GIVEN A is on the conversation list
- WHEN a new message arrives in any conversation
- THEN the list updates the last message preview and unread count

### Constraints
- Zustand chatStore: conversations, messages, subscription state (`isConnected`)
- Realtime channel per conversation; cleanup on unmount
- i18n keys in es and en for all UI strings
- Navigation entry: tab or nested route within marketplace
