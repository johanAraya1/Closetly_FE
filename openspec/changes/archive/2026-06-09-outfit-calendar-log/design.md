# Design: Outfit Calendar Log

## Technical Approach

New `outfit_calendar_log` table (BE) + `/calendar` module (NestJS) + new FE `app/calendar/` screen + "Log today" quick action on home + "Log" button on outfit detail. Reuses `OutfitShareCard` for day preview. Follows existing module/service/store patterns from plans and collections modules.

## Architecture Decisions

### Decision: New BE module `calendar` (not extending `plans`)

| Option | Tradeoff |
|--------|----------|
| Reuse `plans` module | Different concern (future vs history), same table would mix concerns |
| **New module `calendar`** | Clean separation, same patterns, trivial to maintain |

**Rationale**: Planner is forward-looking schedules. This is historical logging. Different table, different query patterns (month range vs week range). Same architectural split as plans.

### Decision: `react-native-calendars` for the month grid

**Rationale**: Battle-tested, lightweight enough, built-in marking (dots for logged days), swipe between months, no native linking needed. Proposal already vetted this.

### Decision: Single outfit per day (UNIQUE(user_id, date))

**Rationale**: Simpler UX, cleaner grid markers, avoids the complexity of "multiple outfits per day" which is out of scope. User can DELETE + re-log on a given day.

## Data Flow

```
FE: Home quick action ──→ logToday() ──→ POST /calendar/log { outfitId, date }
FE: Outfit detail [id]  ──→ Log button ──→ date picker → POST /calendar/log
FE: Calendar screen     ──→ GET /calendar?month=6&year=2026
                         ──→ tap day → bottom sheet with OutfitShareCard
                         ──→ DELETE /calendar/:id to remove
```

```
    CalendarScreen
    ├── react-native-calendars (CalendarList)
    │   └── markedDates: { "2026-06-09": { marked: true, dotColor: primary } }
    ├── CalendarDayModal (BottomSheet)
    │   ├── OutfitShareCard (reused)
    │   └── Delete button
    └── CalendarStore (Zustand)
         └── CalendarService → apiClient → BE /calendar/*
```

## Data Model

### SQL Migration (BE)

```sql
CREATE TABLE outfit_calendar_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id   UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_calendar_log_user_date ON outfit_calendar_log (user_id, date DESC);
```

### Domain Entity (BE)

```typescript
// src/domain/entities/calendar-log.entity.ts
export class CalendarLog {
  id: string;
  userId: string;
  outfitId: string;
  date: string; // YYYY-MM-DD
  createdAt: Date;

  constructor(props: Partial<CalendarLog>) {
    Object.assign(this, props);
  }
}
```

### FE Types

```typescript
// types/index.ts — add:
export interface CalendarLogEntry {
  id: string;
  userId: string;
  outfitId: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  outfit?: Outfit; // populated on GET
}

export interface LogOutfitDTO {
  outfitId: string;
  date: string; // YYYY-MM-DD
}

export interface GetCalendarQuery {
  month: number;  // 1-12
  year: number;
}
```

## API Contracts

### POST /calendar/log

- **Auth**: SupabaseAuthGuard
- **Body**: `{ outfitId: UUID, date: string (YYYY-MM-DD) }`
- **Response 201**: `{ data: CalendarLogEntry }`
- **Error 409**: Already logged for this date (UNIQUE violation)
- **Error 404**: Outfit not found or not owned by user

### GET /calendar

- **Auth**: SupabaseAuthGuard
- **Query**: `month` (number 1-12), `year` (number)
- **Response 200**: `{ data: CalendarLogEntry[] }` — each entry includes `outfit` with `garments`
- **Note**: Returns all entries for that month for the authenticated user

### DELETE /calendar/:id

- **Auth**: SupabaseAuthGuard
- **Response 200**: `{ message: 'Log entry deleted' }`
- **Error 404/403**: Not found or not owned by user

## BE Architecture

### Module: `src/infrastructure/modules/calendar/`

| File | Action | Description |
|------|--------|-------------|
| `domain/entities/calendar-log.entity.ts` | Create | Entity with id, userId, outfitId, date, createdAt |
| `domain/repositories/calendar-log.repository.interface.ts` | Create | Interface + injection symbol |
| `infrastructure/repositories/calendar-log.repository.ts` | Create | Supabase repository with service client |
| `application/use-cases/calendar/log-outfit.use-case.ts` | Create | Validates ownership, inserts, returns entry with outfit |
| `application/use-cases/calendar/get-calendar-month.use-case.ts` | Create | Queries by user_id + month range, populates outfit+garments |
| `application/use-cases/calendar/delete-calendar-log.use-case.ts` | Create | Validates ownership, deletes |
| `infrastructure/modules/calendar/dto/log-outfit.dto.ts` | Create | @IsUUID outfitId, @IsDateString date |
| `infrastructure/modules/calendar/calendar.controller.ts` | Create | POST, GET, DELETE routes |
| `infrastructure/modules/calendar/calendar.module.ts` | Create | Registers controller, use cases, repository |

### Controller Pattern

```typescript
@Controller('calendar')
@UseGuards(SupabaseAuthGuard)
export class CalendarController {
  constructor(
    private logOutfitUseCase: LogOutfitUseCase,
    private getCalendarMonthUseCase: GetCalendarMonthUseCase,
    private deleteCalendarLogUseCase: DeleteCalendarLogUseCase,
  ) {}

  @Post('log')
  async logOutfit(@CurrentUser() user: CurrentUserData, @Body() dto: LogOutfitDto) {
    const entry = await this.logOutfitUseCase.execute({
      userId: user.userId,
      outfitId: dto.outfitId,
      date: dto.date,
    });
    return { data: entry };
  }

  @Get()
  async getCalendar(
    @CurrentUser() user: CurrentUserData,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const entries = await this.getCalendarMonthUseCase.execute({
      userId: user.userId,
      month,
      year,
    });
    return { data: entries };
  }

  @Delete(':id')
  async deleteLog(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.deleteCalendarLogUseCase.execute(id, user.userId);
    return { message: 'Log entry deleted' };
  }
}
```

### Repository Interface

```typescript
export const CALENDAR_LOG_REPOSITORY = Symbol('CALENDAR_LOG_REPOSITORY');

export interface ICalendarLogRepository {
  findByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<CalendarLog[]>;
  findByUserAndDate(userId: string, date: string): Promise<CalendarLog | null>;
  create(data: Partial<CalendarLog>): Promise<CalendarLog>;
  delete(id: string, userId: string): Promise<void>;
}
```

### Repository Implementation

Uses `SupabaseProvider.getServiceClient()` — same pattern as all existing repositories. Runs a query for the month range: `gte(startDate).lte(endDate)`. For GET, joins `outfits` and `outfit_garments + garments` to populate the outfit data (same approach as `collection.repository.ts` line 178-199).

### Use Case: `log-outfit`

1. Verify outfit belongs to user (`outfits.select('id').eq('id', outfitId).eq('user_id', userId)`)
2. `calendarLogRepository.create({ userId, outfitId, date })`
3. If 23505 (unique violation), throw ConflictException
4. Return the entry

### Use Case: `get-calendar-month`

1. Calculate `startDate = YYYY-MM-01` and `endDate = last day of month`
2. `calendarLogRepository.findByUserAndDateRange(userId, startDate, endDate)`
3. For each entry, load outfit + garments (same approach as `get-weekly-plan.use-case.ts`)
4. Return entries with populated `outfit`

### Module Registration

```typescript
@Module({
  imports: [ProvidersModule, OutfitsModule],
  controllers: [CalendarController],
  providers: [
    { provide: CALENDAR_LOG_REPOSITORY, useClass: CalendarLogRepository },
    LogOutfitUseCase,
    GetCalendarMonthUseCase,
    DeleteCalendarLogUseCase,
  ],
})
export class CalendarModule {}
```

Then imported in the root `AppModule`.

## FE Architecture

### New Files

| File | Action | Description |
|------|--------|-------------|
| `types/index.ts` | Modify | + `CalendarLogEntry`, `LogOutfitDTO`, `GetCalendarQuery` |
| `lib/i18n.ts` | Modify | + `calendar.*` keys (en/es) |
| `services/calendarService.ts` | Create | API calls: logOutfit, getCalendar, deleteLog |
| `store/calendarStore.ts` | Create | Zustand store with month entries |
| `app/calendar/index.tsx` | Create | Calendar screen with month grid |
| `app/(tabs)/home.tsx` | Modify | + "What I wore today" action in row 2 |
| `app/outfits/[id].tsx` | Modify | + "Log" button in actions section |
| `package.json` | Modify | + `react-native-calendars` |

### Store: `store/calendarStore.ts`

```typescript
interface CalendarState {
  entries: CalendarLogEntry[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  selectedMonth: number;
  selectedYear: number;

  loadMonth: (month: number, year: number) => Promise<void>;
  logOutfit: (outfitId: string, date: string) => Promise<boolean>;
  deleteLog: (entryId: string) => Promise<boolean>;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
}
```

Pattern matches `plannerStore.ts` — optimistic updates? No, for calendar it's simpler: reload month after log/delete. State management for loading/error matches `collectionsStore.ts`.

### Service: `services/calendarService.ts`

```typescript
export const logOutfit = (outfitId: string, date: string): Promise<ApiResponse<CalendarLogEntry>>
export const getCalendar = (month: number, year: number): Promise<ApiResponse<CalendarLogEntry[]>>
export const deleteLog = (entryId: string): Promise<ApiResponse<void>>
```

Uses `apiClient.post`, `apiClient.get`, `apiClient.delete` — same pattern as `plannerService.ts`.

### Screen: `app/calendar/index.tsx`

```
CalendarScreen
├── Header: "Calendar" + month/year + < >
├── CalendarList (from react-native-calendars)
│   └── markedDates → dots on logged days
├── Bottom sheet / Modal (on day tap)
│   ├── OutfitShareCard (reused) — shows outfit + garments
│   ├── Date label
│   └── [Remove from calendar] button
└── States: loading (skeleton), error (retry), empty (encourage logging)
```

- Uses `CalendarList` with `markedDates` built from `store.entries` mapping `entry.date → { marked: true, dotColor: COLORS.primary }`
- On day tap: if entry exists for that date → show bottom sheet. If not → if it's today or past → navigate to outfit picker.
- Bottom sheet uses `OutfitShareCard` (already imported). Close/remove actions below the card.
- Month navigation: left/right arrows or swipe (CalendarList supports it natively).
- Pull-to-refresh calls `loadMonth(currentMonth, currentYear)`.

### Home Quick Action (modify `home.tsx`)

Replace the third card in row 2 (currently Packing) — or add a fourth row — with a "What I wore today" action:

```typescript
<TouchableOpacity
  onPress={() => router.push('/outfits/create?logToday=true')}
  // or navigate to outfit picker with today's date pre-selected
>
  <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
  <Text>What I wore today</Text>
</TouchableOpacity>
```

**Decision**: This action navigates to the outfit list where user picks one, then logs it for today. Two approaches considered:
1. Navigate to `/outfits` (existing list) with a modal flow → simpler, reuses existing screen
2. New mini picker modal → more custom but more polished

**Choice**: Route to a new screen `app/calendar/log-today.tsx` that shows a simple outfit picker (reusing the picker pattern from `planner/index.tsx` lines 207-313), calls `calendarStore.logOutfit()`, then navigates to the calendar screen.

### Outfit Detail Log Button (modify `[id].tsx`)

Add a new action button in the actions section (after Share):

```typescript
<TouchableOpacity style={styles.actionButton} onPress={handleLogToCalendar}>
  <Ionicons name="calendar-outline" size={22} color={COLORS.gray[500]} />
  <Text style={styles.actionText}>Log</Text>
</TouchableOpacity>
```

On tap → open a simple modal: date input (default today) + [Log Outfit] button → calls `calendarStore.logOutfit(outfitId, date)` → shows success toast → navigates to calendar.

### Navigation

- **Calendar screen**: Stack screen at `app/calendar/index.tsx` — accessed from home quick action or from a future tab.
- **Log-today picker**: Stack screen at `app/calendar/log-today.tsx` — accessed from home quick action.
- **No new tab added** (out of scope for this change — calendar is accessed via quick actions and potentially from the profile/settings area later).

### i18n Keys

```typescript
calendar: {
  title: 'Calendar' | 'Calendario',
  logToday: 'What I wore today' | 'Qué usé hoy',
  logOutfit: 'Log Outfit' | 'Registrar Outfit',
  logged: 'Logged!' | '¡Registrado!',
  loggedMessage: 'Outfit logged for {{date}}' | 'Outfit registrado para {{date}}',
  remove: 'Remove from calendar' | 'Quitar del calendario',
  removed: 'Entry removed' | 'Entrada eliminada',
  noEntries: 'No outfits logged this month' | 'Sin outfits este mes',
  noEntriesHint: 'Tap a day to log what you wore' | 'Tocá un día para registrar',
  pickOutfit: 'Pick an outfit' | 'Elegí un outfit',
  loading: 'Loading calendar...' | 'Cargando calendario...',
  selectDate: 'Select date' | 'Seleccioná la fecha',
}
```

## Component Tree

```
app/calendar/index.tsx
  ├── Loading (skeleton month grid)
  ├── Error (retry button)
  ├── Empty (encourage logging)
  └── Loaded
      ├── CalendarHeader (month/year + prev/next arrows)
      ├── CalendarList (react-native-calendars)
      │   └── DayComponent (touchable, shows dot if logged)
      └── CalendarDayModal (Modal/bottom-sheet, visible when day tapped)
          ├── Date label
          ├── OutfitShareCard (reused component from @/components)
          │   └── outfit + garments display
          └── Action buttons
              ├── [View Outfit] → router.push(`/outfits/${outfit.id}`)
              └── [Remove] → confirm → deleteLog → reload month
```

## State Management

| Component | Loading | Empty | Error | Success |
|-----------|---------|-------|-------|---------|
| CalendarScreen | Skeleton grid (7 columns × 4 rows placeholder) | "No outfits logged" + hint text | Error message + retry button | Month grid with dots |
| CalendarDayModal | — (data already loaded) | "No outfit for this day" | — | OutfitShareCard + actions |
| Log-today picker | ActivityIndicator | "No outfits yet" + create link | Error toast | Navigate to calendar |
| Log button (detail) | Saving spinner on button | — | Alert/error toast | Success toast → calendar |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| BE Unit | Use cases: log duplicate date, log non-owned outfit, get month range, delete not-owned | Vitest mocks on repository |
| BE Integration | Controller: auth guard, DTO validation, response shape | NestJS `@nestjs/testing` + `request()` |
| FE Store | logOutfit updates entries, loadMonth populates store, deleteLog removes | Vitest + Zustand store (same as existing) |
| FE Component | CalendarScreen renders dots correctly, modal shows on tap, OutfitShareCard renders | React Native Testing Library |

## Migration / Rollout

- **Database**: Run migration `CREATE TABLE outfit_calendar_log` before deploying BE code.
- **BE**: New module — no breaking changes. Existing endpoints untouched.
- **FE**: New screen + modified existing screens — safe to deploy alongside BE.

## Open Questions

- [ ] Should the "What I wore today" home action log automatically (picking the most recent outfit) or show a picker? Design spec favors picker for explicit user intent.
- [ ] Should the calendar screen be accessible from a tab or just from quick actions? For now, quick actions only — can promote to a tab later based on usage.
