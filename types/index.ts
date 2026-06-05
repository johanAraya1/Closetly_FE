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

export type GarmentCategory = 
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'bags'
  | 'other';

export type GarmentSeason = 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';

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
  style?: GarmentStyle;
  imageUrl: string;
  notes?: string;
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
  style?: GarmentStyle;
  imageUrl: string;
  notes?: string;
}

export interface UpdateGarmentDTO {
  name?: string;
  category?: GarmentCategory;
  brand?: string;
  color?: string;
  size?: string;
  season?: GarmentSeason | GarmentSeason[];
  style?: GarmentStyle;
  imageUrl?: string;
  notes?: string;
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

// ==================== UI STATE ====================

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ImageUploadResult {
  url: string;
  path: string;
}
