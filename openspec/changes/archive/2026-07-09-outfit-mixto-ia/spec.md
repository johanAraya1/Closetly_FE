# Outfit Mixto IA — Especificación

## Propósito

Nuevo flujo en `create.tsx`: usuario elige 1-2 prendas "base", la IA completa el outfit vía `GET /outfits/suggestions?preferredGarmentIds=...`, y el preview distingue visualmente las prendas base de las sugeridas.

## Requisitos

| ID | Requisito | Fuerza |
|----|-----------|--------|
| R1 | Usuario selecciona 1-2 prendas como base para que la IA complete | MUST |
| R2 | Sistema llama a `GET /outfits/suggestions?preferredGarmentIds=` con IDs base + `locale` | MUST |
| R3 | Sistema muestra loading mientras la IA procesa | MUST |
| R4 | Sistema muestra error legible si la API falla | MUST |
| R5 | Prendas "base" se diferencian visualmente de "sugeridas" en preview | MUST |
| R6 | Usuario puede regenerar para otra sugerencia | MAY |
| R7 | Usuario puede aceptar sugerencia para pre-llenar el form | MAY |
| R8 | NO interfiere con generador aleatorio ni sugerencias por clima | MUST NOT |
| R9 | Usuario no puede seleccionar más de 2 prendas base | SHOULD NOT |
| R10 | Llamada API reusa patrón `suggestionsStore` / `apiClient.get` | SHOULD |
| R11 | Sistema puede cachear último resultado para undo/retry | MAY |

## Escenarios

### E1: Happy path — 2 prendas base

- **GIVEN** usuario activó modo "Outfit Mixto IA" y seleccionó 2 prendas base
- **WHEN** presiona "Completar con IA"
- **THEN** muestra loading, llama al endpoint con ambos IDs, al recibir respuesta muestra preview con base destacadas y sugeridas
- **AND** puede "Aceptar" para pre-llenar o "Regenerar" para otra combinación

### E2: Error de API

- **GIVEN** usuario seleccionó 1 prenda base y presionó "Completar con IA"
- **WHEN** la API responde con error (500, timeout)
- **THEN** oculta loading, muestra mensaje de error amigable con opción de reintentar

### E3: 0 prendas base

- **GIVEN** usuario activó modo "Outfit Mixto IA"
- **WHEN** no seleccionó ninguna base y presiona "Completar con IA"
- **THEN** botón deshabilitado o tooltip: "Seleccioná al menos 1 prenda"

### E4: 1 prenda base

- **GIVEN** usuario activó modo mix
- **WHEN** selecciona exactamente 1 prenda base
- **THEN** botón "Completar con IA" habilitado, envía `preferredGarmentIds=id1`

### E5: Intento de 3 prendas base

- **GIVEN** usuario ya tiene 2 prendas base seleccionadas
- **WHEN** intenta seleccionar una tercera
- **THEN** sistema bloquea la selección con feedback: "Máximo 2 prendas base"

### E6: Regenerar

- **GIVEN** usuario recibió sugerencia con base + sugeridas
- **WHEN** presiona "Regenerar"
- **THEN** llama al endpoint con mismos IDs, muestra loading, reemplaza preview

### E7: Aceptar sugerencia

- **GIVEN** usuario tiene preview con base + sugeridas
- **WHEN** presiona "Aceptar sugerencia"
- **THEN** copia todas las prendas a `selectedGarments`, limpia estado mix, usuario puede guardar

## Contratos de Datos

### API

```
GET /outfits/suggestions?preferredGarmentIds={ids}&locale={locale}
```

`preferredGarmentIds`: string comma-separated (1-2 IDs), obligatorio. `locale`: string, obligatorio.

Response: `SuggestionsResponse` existente (`suggestions: Suggestion[]`, `garments: Garment[]`).

### Store — método nuevo

```typescript
mixOutfit(baseGarmentIds: string[]): Promise<void>
// Setea isLoading=true, llama apiClient.get<SuggestionsResponse>(endpoint),
// guarda en suggestions[]/garments[], maneja errores como fetchSuggestions.
```

### Estado local en create.tsx

```typescript
const [isMixMode, setIsMixMode] = useState(false);
const [baseGarments, setBaseGarments] = useState<Garment[]>([]);
const [mixSuggestion, setMixSuggestion] = useState<Suggestion | null>(null);
const [mixLoading, setMixLoading] = useState(false);
const [mixError, setMixError] = useState<string | null>(null);
```

## Dependencias

- `GET /outfits/suggestions` endpoint existente con `preferredGarmentIds`
- `OutfitPreview` — extender para badge base vs sugerida
- `suggestionsStore.regenerateWithPinned` — patrón a replicar en `mixOutfit`
- `types/index.ts`: `Suggestion`, `Garment`, `SuggestionsResponse` ya existen
- `utils/apiClient.ts`: cliente HTTP con auth y retry
