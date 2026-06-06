/**
 * Format Utils
 * Utilidades para formatear datos
 */

/**
 * Formatea una fecha a string legible
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Formatea una fecha relativa (ej: "2 days ago")
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

/**
 * Capitaliza la primera letra de un string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Trunca un texto a un número máximo de caracteres
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Convierte un nombre de color en español a su valor hexadecimal
 */
export const getColorFromName = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    // Colores básicos
    'rojo': '#DC2626',
    'azul': '#2563EB',
    'verde': '#16A34A',
    'amarillo': '#EAB308',
    'naranja': '#EA580C',
    'morado': '#9333EA',
    'rosa': '#EC4899',
    'negro': '#000000',
    'blanco': '#FFFFFF',
    'gris': '#6B7280',
    'marrón': '#92400E',
    'café': '#92400E',
    'beige': '#D4C4B0',
    'crema': '#F5F5DC',
    'dorado': '#FFD700',
    'plateado': '#C0C0C0',
    'turquesa': '#14B8A6',
    'vino': '#7F1D1D',
    'marino': '#1E3A8A',
    
    // Variantes de colores
    'rojo oscuro': '#991B1B',
    'azul oscuro': '#1E3A8A',
    'verde oscuro': '#14532D',
    'gris oscuro': '#374151',
    'rojo claro': '#FCA5A5',
    'azul claro': '#BFDBFE',
    'verde claro': '#BBF7D0',
    'gris claro': '#D1D5DB',
    'beige claro': '#E8DCC8',
    'rosa claro': '#FBCFE8',
    'amarillo claro': '#FEF3C7',
    
    // Inglés (por si viene del backend)
    'red': '#DC2626',
    'blue': '#2563EB',
    'green': '#16A34A',
    'yellow': '#EAB308',
    'orange': '#EA580C',
    'purple': '#9333EA',
    'pink': '#EC4899',
    'black': '#000000',
    'white': '#FFFFFF',
    'gray': '#6B7280',
    'grey': '#6B7280',
    'brown': '#92400E',
  };

  // Buscar coincidencia exacta (case insensitive)
  const normalized = colorName.toLowerCase().trim();
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }

  // Buscar coincidencia parcial (por si incluye palabras extra)
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Si no encuentra coincidencia, devolver un color por defecto
  return '#9CA3AF';
};

/**
 * Formatea un enum a texto legible con traducción
 */
/**
 * Retorna el color asociado a un tipo de listing
 */
export const getListingTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    sell: '#10B981',
    trade: '#8B5CF6',
    giveaway: '#F97316',
  };
  return colorMap[type] || '#9CA3AF';
};

export const formatEnumValue = (value: string): string => {
  // Mapeo de categorías del backend (inglés) a español
  const categoryTranslations: Record<string, string> = {
    'tops': 'Blusas y Camisas',
    'bottoms': 'Pantalones',
    'dresses': 'Vestidos',
    'outerwear': 'Abrigos',
    'shoes': 'Zapatos',
    'accessories': 'Accesorios',
    'bags': 'Bolsos',
    'other': 'Otros',
  };

  // Mapeo de temporadas
  const seasonTranslations: Record<string, string> = {
    'spring': 'Primavera',
    'summer': 'Verano',
    'fall': 'Otoño',
    'winter': 'Invierno',
    'all_season': 'Todas las Temporadas',
  };

  // Buscar traducción exacta primero
  if (categoryTranslations[value]) {
    return categoryTranslations[value];
  }
  
  if (seasonTranslations[value]) {
    return seasonTranslations[value];
  }

  // Si no hay traducción, formatear normalmente
  return value
    .split('-')
    .map((word) => capitalize(word))
    .join(' ');
};
