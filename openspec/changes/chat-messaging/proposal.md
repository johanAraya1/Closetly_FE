# Propuesta: Chat/Messaging para Marketplace

## Intención

Habilitar comunicación directa entre compradores y vendedores dentro del marketplace de Closetly. Hoy los usuarios no tienen forma de contactar al dueño de una prenda — el chat resuelve esto sin exponer datos personales ni salir de la app.

## Scope

### In Scope
- DB: tablas `conversations`, `conversation_participants`, `messages` + RLS para Realtime
- BE: entidades Conversation y Message (domain)
- BE: interfaces IConversationRepository e IMessageRepository (domain)
- BE: 4 use cases: CreateConversation, SendMessage, GetConversations, GetMessages (application)
- BE: controller con 4 endpoints REST autenticados + DTOs (infrastructure)
- BE: ChatModule con wiring + import en app.module.ts
- BE: migración SQL (supabase-setup.sql)
- BE: tests unitarios para cada use case
- FE: tipos Conversation, Message, CreateConversationDTO, SendMessageDTO
- FE: servicio REST chatService.ts
- FE: store Zustand chatStore.ts con estado de conversaciones y mensajes
- FE: suscripción Realtime por conversación (@supabase/realtime-js)
- FE: pantalla de lista de conversaciones (FlatList, pull-to-refresh)
- FE: pantalla de sala de chat (FlatList + input, scroll automático)
- FE: botón "Contactar" en detalle de prenda → navega a conversación
- FE: entrada en el menú de navegación (tab o ruta anidada en marketplace)
- FE: claves i18n en español e inglés

### Out of Scope (v1)
- Notificaciones push
- Indicadores de escritura
- Confirmaciones de lectura por mensaje
- Multimedia en mensajes (imágenes, videos)
- Conversaciones grupales
- Edición / eliminación de mensajes
- Herramientas de moderación o admin

## Capacidades

### Nuevas
- `chat-messaging`: Mensajería en tiempo real entre usuarios del marketplace, con historial persistente vía REST y suscripción a nuevos mensajes via Supabase Realtime.

### Modificadas
Ninguna — capacidad completamente nueva. No hay cambios de comportamiento en specs existentes.

## Enfoque

Supabase Realtime para mensajes en vivo + REST para historial y escritura. Service-client en BE (bypass RLS) — la autorización se delega a los use-cases. En FE, `@supabase/realtime-js` maneja reconexión automática; el store escucha el canal por conversación y agrega mensajes entrantes al estado.

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Tiempo real (BE) | Supabase Realtime (broadcast INSERT en messages) | Mensajes entrantes sin polling |
| Tiempo real (FE) | `@supabase/realtime-js` | Suscripción por conversación |
| REST (BE) | NestJS controller + use cases | Historial, crear conversación, enviar |
| REST (FE) | `chatService.ts` con `fetchWithTimeout` | Llamadas CRUD |

La creación de conversación es implícita: cuando el comprador toca "Contactar", el use-case busca si ya existe una conversación entre ambos usuarios para esa prenda; si no, la crea.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| BE: `src/domain/entities/conversation.entity.ts` | Nuevo | Entidad Conversation |
| BE: `src/domain/entities/message.entity.ts` | Nuevo | Entidad Message |
| BE: `src/domain/repositories/conversation.repository.interface.ts` | Nuevo | Interfaz + Symbol |
| BE: `src/domain/repositories/message.repository.interface.ts` | Nuevo | Interfaz + Symbol |
| BE: `src/application/use-cases/chat/` | Nuevo | 4 use cases |
| BE: `src/infrastructure/repositories/conversation.repository.ts` | Nuevo | Implementación Supabase |
| BE: `src/infrastructure/repositories/message.repository.ts` | Nuevo | Implementación Supabase |
| BE: `src/infrastructure/modules/chat/` | Nuevo | Controller, DTOs, Module |
| BE: `src/app.module.ts` | Modificado | Importar ChatModule |
| BE: `supabase-setup.sql` | Nuevo | Migración + RLS |
| FE: `types/index.ts` | Modificado | + Conversation, Message, DTOs |
| FE: `services/chatService.ts` | Nuevo | Llamadas REST |
| FE: `store/chatStore.ts` | Nuevo | Estado + Realtime |
| FE: `app/` | Modificado | Pantallas chat + navegación + botón Contactar |
| FE: `lib/constants.ts` | Modificado | + Supabase URL/key pública |
| FE: `i18n/` | Modificado | Claves chat en/en |
| FE: `package.json` | Modificado | + `@supabase/realtime-js` |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Reconexión Realtime inestable | Media | `@supabase/realtime-js` maneja reconexión automática; store expone `isConnected` |
| RLS mal configurada expone mensajes | Baja | Service-client bypasses RLS; autorización en use-cases es la única barrera |
| Rendimiento con muchas conversaciones | Baja | Paginación en REST (20 items); Realtime solo para último mensaje |
| Paquete `@supabase/realtime-js` agrega tamaño | Baja | Es árbol-shakeable; solo se importa en chatStore |

## Plan de Rollback

**Por fases** (sin breaking changes para features existentes):

1. **BE**: Eliminar `ChatModule` de `app.module.ts` → reiniciar servidor. No hay otros módulos dependientes.
2. **BE**: Ejecutar migración inversa (`DROP TABLE messages, conversation_participants, conversations CASCADE`).
3. **FE**: Revertir `package.json` (`@supabase/realtime-js`) y correr `npm install`.
4. **FE**: Eliminar archivos de chat (service, store, pantallas).
5. **FE**: Revertir `app/` navegación y `types/index.ts`.
6. **FE**: Restaurar archivos i18n originales.

## Dependencias

- Supabase Realtime debe estar habilitado en el proyecto Supabase (configuración del dashboard)
- `@supabase/realtime-js` en FE (no requiere `@supabase/supabase-js`, solo el subpaciente Realtime)
- BE ya tiene `@supabase/supabase-js` instalado (usado en SupabaseProvider)

## Criterios de Éxito

- [ ] Usuario A crea conversación desde detalle de prenda de Usuario B
- [ ] Usuario B recibe el mensaje en tiempo real sin recargar la pantalla
- [ ] Historial de mensajes se carga con paginación (20 por página)
- [ ] La lista de conversaciones muestra el último mensaje como preview
- [ ] Todas las rutas del chat requieren autenticación (Bearer token)
- [ ] Los tests unitarios del BE pasan con cobertura > 80%
- [ ] Las traducciones existen en español e inglés para todas las claves nuevas
