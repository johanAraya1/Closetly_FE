/**
 * Types - Domain Models and DTOs
 * Siguiendo Clean Architecture, estos tipos representan las entidades del dominio
 */

// ==================== USER & AUTH ====================

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}

// ==================== GARMENT (PRENDA) ====================

export type ListingType = 'sell' | 'trade' | 'giveaway';

export type GarmentCategory = 
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'bags'
  | 'other';

export type GarmentSeason = 'spring' | 'summer' | 'fall' | 'winter' | 'all_season';

export type GarmentStyle = 
  | 'formal'
  | 'casual'
  | 'deportivo'
  | 'elegante'
  | 'bohemio'
  | 'urbano';

export interface Garment {
  id: string;
  userId: string;
  name: string;
  category: GarmentCategory;
  brand?: string;
  color?: string;
  size?: string;
  season?: GarmentSeason | GarmentSeason[];
  style?: GarmentStyle[];
  imageUrl: string;
  imageUrls?: string[];
  notes?: string;
  isPublic?: boolean;
  listingType?: ListingType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGarmentDTO {
  name: string;
  category: GarmentCategory;
  brand?: string;
  color?: string;
  size?: string;
  season?: GarmentSeason | GarmentSeason[];
  style?: GarmentStyle[];
  imageUrl: string;
  imageUrls?: string[];
  imageBackUrl?: string; // URL/URI for the second image (back view)
  notes?: string;
  isPublic?: boolean;
  listingType?: ListingType;
}

export interface UpdateGarmentDTO {
  name?: string;
  category?: GarmentCategory;
  brand?: string;
  color?: string;
  size?: string;
  season?: GarmentSeason | GarmentSeason[];
  style?: GarmentStyle[];
  imageUrl?: string;
  notes?: string;
  isPublic?: boolean;
  listingType?: ListingType;
}

// ==================== OUTFIT ====================

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  occasion?: string;
  season?: GarmentSeason;
  imageUrl?: string;
  is_favorite: boolean;
  createdAt: string;
  updatedAt: string;
  garments?: Garment[]; // Populated when fetched with relations
}

export interface OutfitGarment {
  id: string;
  outfitId: string;
  garmentId: string;
  positionOrder: number;
  createdAt: string;
}

export interface CreateOutfitDTO {
  name: string;
  description?: string;
  occasion?: string;
  season?: GarmentSeason;
  imageUrl?: string;
  garmentIds: string[];
}

export interface UpdateOutfitDTO {
  name?: string;
  description?: string;
  occasion?: string;
  season?: GarmentSeason;
  imageUrl?: string;
  is_favorite?: boolean;
  garmentIds?: string[];
}

// ==================== CALENDAR ====================

export interface CalendarLogEntry {
  id: string;
  date: string;
  outfit: Outfit;
}

export interface LogOutfitDTO {
  outfitId: string;
  date: string; // YYYY-MM-DD
}

// ==================== COLLECTION ====================

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  outfits?: Outfit[]; // Populated when fetched with relations
}

export interface CollectionOutfit {
  id: string;
  collectionId: string;
  outfitId: string;
  createdAt: string;
}

export interface CreateCollectionDTO {
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  outfitIds?: string[];
}

export interface UpdateCollectionDTO {
  name?: string;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  error?: string;
}

// ==================== UI STATE ====================

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ImageUploadResult {
  url: string;
  path: string;
}

// ==================== PUBLIC PROFILE ====================

export interface PublicProfileResult {
  userId: string;
  username?: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string; // ISO date from BE
}

// ==================== CHAT ====================

export interface Conversation {
  id: string;
  listingType: ListingType;
  listingGarmentId: string;
  listingTitle: string;
  otherParticipant: {
    userId: string;
    username?: string;
    avatarUrl?: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl?: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface CreateConversationDTO {
  sellerId: string;
  listingType: string;
  listingGarmentId: string;
  listingTitle: string;
}

export interface SendMessageDTO {
  content: string;
}

// ==================== SUGGESTIONS (AI Outfit Suggestions) ====================

export interface Suggestion {
  name: string;
  occasion: string;
  description: string;
  garmentIds: string[];
  reasoning: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  icon: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  garments: Garment[];
  weather?: WeatherData;
  message?: string;
}

// ==================== CLOSET STATS ====================

export interface ClosetStats {
  totalGarments: number;
  totalOutfits: number;
  byCategory: Record<string, number>;
  bySeason: Record<string, number>;
  byStyle: Record<string, number>;
  byBrand: Record<string, number>;
  byColor: Record<string, number>;
  publicCount: number;
  privateCount: number;
  recentAdditions: { id: string; name: string; imageUrl: string; createdAt: string }[];
  byCategoryPercentage: Record<string, number>;
}

// ==================== PACKING LIST ====================

export interface PackingGarmentItem {
  id: string;
  name: string;
}

export interface PackingDay {
  day: number;
  outfitName: string;
  garments: PackingGarmentItem[];
  notes?: string;
}

export interface PackingSuggestion {
  days: PackingDay[];
  garments: Garment[];   // all user garments for image lookup
  weather?: WeatherData | null;
}

export interface PackingFormData {
  days: number;
  destination?: string;
  purpose?: string;
  lat?: number;
  lon?: number;
}

// ==================== WEEKLY PLANNER ====================

export interface WeeklyPlanDay {
  id: string;
  dayOfWeek: number; // 0=Monday, 6=Sunday
  outfit: {
    id: string;
    name: string;
    imageUrl?: string;
    garments: { id: string; name: string; imageUrl: string }[];
  } | null;
}

export interface UpsertPlanEntry {
  dayOfWeek: number;
  outfitId: string;
}

export interface GetPlanResponse {
  plan: WeeklyPlanDay[];
  weekStart: string;
}
