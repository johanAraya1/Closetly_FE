/**
 * Constants
 * Valores constantes utilizados en toda la aplicación
 */

import type { ListingType } from '@/types';

// API base URL (normalize: remove trailing slash). Supports multiple env var names
const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  'https://closetly-be.vercel.app';

const NORMALIZED_API_URL = RAW_API_URL.replace(/\/+$/, '');
export const API_URL = /\/api$/i.test(NORMALIZED_API_URL)
  ? NORMALIZED_API_URL
  : `${NORMALIZED_API_URL}/api`;

export const COLORS = {
  primary: '#62D9C7',
  secondary: '#6A4BFF',
  neutral: '#F4F5F7',
  primaryDark: '#4FBFAD',
  secondaryDark: '#5639E5',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const GARMENT_CATEGORIES = [
  { value: 'tops', label: 'Blusas y Camisas' },
  { value: 'bottoms', label: 'Pantalones' },
  { value: 'dresses', label: 'Vestidos' },
  { value: 'outerwear', label: 'Abrigos' },
  { value: 'shoes', label: 'Zapatos' },
  { value: 'accessories', label: 'Accesorios' },
  { value: 'bags', label: 'Bolsos' },
  { value: 'other', label: 'Otros' },
];

export const SEASONS = [
  { value: 'spring', label: 'Primavera' },
  { value: 'summer', label: 'Verano' },
  { value: 'fall', label: 'Otoño' },
  { value: 'winter', label: 'Invierno' },
  { value: 'all_season', label: 'Todas las Temporadas' },
];

export const GARMENT_STYLES = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'elegante', label: 'Elegante' },
  { value: 'bohemio', label: 'Bohemio' },
  { value: 'urbano', label: 'Urbano' },
];

export const LISTING_TYPES: { value: ListingType; labelKey: string; descriptionKey: string; color: string }[] = [
  { value: 'sell', labelKey: 'garments.listingType.sell', descriptionKey: 'garments.listingType.sellDescription', color: '#10B981' },
  { value: 'trade', labelKey: 'garments.listingType.trade', descriptionKey: 'garments.listingType.tradeDescription', color: '#8B5CF6' },
  { value: 'giveaway', labelKey: 'garments.listingType.giveaway', descriptionKey: 'garments.listingType.giveawayDescription', color: '#F97316' },
];

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@closetly/auth_token',
  USER_PROFILE: '@closetly/user_profile',
  PUSH_TOKEN: '@closetly/push_token',
};

export const IMAGE_CONFIG = {
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 1200,
  QUALITY: 0.8,
  COMPRESS_FORMAT: 'jpeg' as const,
};

export const SUPABASE_BUCKETS = {
  GARMENTS: 'garments',
  OUTFITS: 'outfits',
  PROFILES: 'profiles',
  COLLECTIONS: 'collections',
};

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
