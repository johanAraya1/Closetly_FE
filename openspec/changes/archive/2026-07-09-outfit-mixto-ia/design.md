# Design: Outfit Mixto IA

## Technical Approach

Nuevo store independiente (`mixOutfitStore.ts`) + sección en `create.tsx` + extensión de `OutfitPreview` con badge base/sugerida. Reusa `GET /outfits/suggestions?preferredGarmentIds=` vía `apiClient.get`.

Mapeo a requisitos del spec:
- **R2, R10** → reusa `apiClient.get` con endpoint existente
- **R8** → estado aislado en store separado + flag `isMixMode` local
- **R5** → prop opcional `baseGarmentIds` en OutfitPreview

## Architecture Decisions

| Decisión | Alternativas | Elegido | Razón |
|----------|-------------|---------|-------|
| Store | Extender `suggestionsStore` | **Nuevo `mixOutfitStore.ts`** | El store existente maneja sugerencias por clima con caché diario, 3 suggestions, pinning — lógica distinta. Mezclarlos viola SRP. Store nuevo es ~60 líneas sin acoplamiento. |
| Estado UI | Store vs local state | **Local state** | `isMixMode`, `baseGarments[]` son específicos del Create screen. Store solo para acción `mixOutfit` y resultado. |
| Preview diff | Componente separado vs prop | **Prop `baseGarmentIds`** | Mínimo impacto: OutfitPreview filtra por Set, muestra badge. Sin romper contrato existente. |

## Data Flow

```
create.tsx                    mixOutfitStore.ts                API
   │                              │                          │
   │  mixOutfit([id1, id2])       │                          │
   │────────────────────────────→│                          │
   │                              │  apiClient.get(          │
   │                              │   /outfits/suggestions   │
   │                              │   ?preferredGarmentIds=  │
   │                              │   id1,id2&locale=es)     │
   │                              │────────────────────────→│
   │                              │                          │
   │                              │ ←──── SuggestionsResponse│
   │  { suggestion, garments,     │                          │
   │    isLoading: false,         │                          │
   │    error: null }             │                          │
   │←────────────────────────────│                          │
   │                              │                          │
   │  User → "Aceptar"                                        │
   │  setSelectedGarments(merged)                             │
   │  → sticky "Guardar" habilitado                          │
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `store/mixOutfitStore.ts` | **Crear** | Store con acción `mixOutfit()`, estado `{suggestion, garments, isLoading, error}` |
| `app/outfits/create.tsx` | Modificar | +6 vars de estado mix, sección "Outfit Mixto IA", modal loading/error, handlers |
| `components/OutfitPreview.tsx` | Modificar | +prop `baseGarmentIds`, badge visual "BASE" / "IA" |
| `lib/i18n/**` | Modificar | Keys `create.mixMode`, `create.mixSelectHint`, `create.mixComplete`, `create.mixMaxBase`, `create.mixError` |

## Interfaces / Contracts

**mixOutfitStore.ts** — store independiente que replica el patrón de `suggestionsStore.ts` pero sin acoplamiento:

```typescript
interface MixOutfitState {
  suggestion: Suggestion | null;
  garments: Garment[];
  isLoading: boolean;
  error: string | null;
  mixOutfit: (baseGarmentIds: string[]) => Promise<void>;
  resetMix: () => void;
}
```

**OutfitPreview** — nuevo prop opcional:

```typescript
interface OutfitPreviewProps {
  selectedGarments: Garment[];
  onGarmentPress?: (garment: Garment) => void;
  pinnedGarmentIds?: Set<string>;
  onTogglePin?: (garmentId: string) => void;
  baseGarmentIds?: Set<string>;            // ← NUEVO
}
```

**API contract** — sin cambios:

```
GET /outfits/suggestions?preferredGarmentIds=id1,id2&locale=es
→ SuggestionsResponse { suggestions: Suggestion[], garments: Garment[], ... }
```

## Key Implementation Details

### Separación del flujo aleatorio (R8)
- Flag `isMixMode`: cuando `true`, tap en grid marca como "base" en lugar de toggle normal del outfit
- `mixSuggestion !== null` → renderiza preview MIX (con base + sugeridas) en lugar del preview normal
- Sección "Generar Outfit Aleatorio" se oculta si `isMixMode` está activo
- El estado `selectedGarments` no se toca hasta que usuario presiona "Aceptar"

### Marcado visual de base garments (R5)
- **En grid**: borde ámbar (`#F59E0B`) en lugar del verde primary, label "BASE" sobre la imagen
- **En OutfitPreview**: badge "BASE" con fondo ámbar si `baseGarmentIds?.has(garment.id)`. Las sugeridas sin badge o badge "IA" sutil con icono sparkle
- La prop `baseGarmentIds` es aditiva con `pinnedGarmentIds` — ambos Sets pueden coexistir

### Aceptar → mapping a selectedGarments (R7)
```typescript
const handleAcceptMix = () => {
  const { suggestion, garments: mixGarments } = useMixOutfitStore.getState();
  if (!suggestion) return;
  const accepted = suggestion.garmentIds
    .map(id => mixGarments.find(g => g.id === id))
    .filter(Boolean) as Garment[];
  setSelectedGarments(accepted);
  setMixMode(false);
  setBaseGarments([]);
  setMixSuggestion(null);
};
```

### Error handling (R4)
- Store captura error de API y expone en `error` string
- Un `Alert` o banner rojo en la UI muestra el mensaje amigable
- Botón "Reintentar" visible cuando hay error (re-ejecuta `mixOutfit` con mismos IDs)
- Se reusa patrón de `generationError` existente (banner rojo con `alert-circle` icon)

## State Variables (create.tsx)

```typescript
const [isMixMode, setIsMixMode] = useState(false);        // activa modo mix
const [baseGarments, setBaseGarments] = useState<Garment[]>([]);  // 1-2 prendas base
const [mixSuggestion, setMixSuggestion] = useState<Suggestion | null>(null);
const [mixGarments, setMixGarments] = useState<Garment[]>([]);     // full garment data
const [mixLoading, setMixLoading] = useState(false);
const [mixError, setMixError] = useState<string | null>(null);
```


## Testing Strategy

| Capa | Qué probar | Cómo |
|------|-----------|------|
| Store | `mixOutfit` llama API, setea loading/success/error | Mock `apiClient.get`, assert Zustand state |
| Unit | Límite 2 base garments, toggle en modo mix, accept mapping | Test handlers unitarios sin render |
| Integration | Flujo: select → API → accept → save | Render `create.tsx` con store mockeado |

## Open Questions

- [ ] ¿OutfitPreview en mix mode muestra SOLO el mix result (base + IA) o se fusiona con `selectedGarments` actual? **Decisión**: cuando `mixSuggestion` existe, `selectedGarments` se ignora temporalmente en el preview; al aceptar se copia a `selectedGarments`.
- [ ] Traducciones: definir nombres de keys i18n para el nuevo feature una vez confirmada la UI exacta.
