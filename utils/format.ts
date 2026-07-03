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
/**
 * Normaliza un nombre de color individual: género gramatical, tildes, alias y typos comunes
 */
export const normalizeColorName = (name: string): string => {
  let n = name.toLowerCase().trim();

  // Mapa de género femenino → masculino y typos comunes
  const genderMap: Record<string, string> = {
    'blanca': 'blanco',
    'negra': 'negro',
    'roja': 'rojo',
    'rojas': 'rojo',
    'amarilla': 'amarillo',
    'amarillas': 'amarillo',
    'azulada': 'azul',
    'verde claro': 'verde claro',
    'celeste': 'celeste',
    'naranja': 'naranja',
    'violeta': 'morado',
    'morada': 'morado',
  };

  // Typos comunes — solo variantes incorrectas, no la forma correcta
  const typoMap: Record<string, string> = {
    'blanvc': 'blanco',
    'blanc': 'blanco',
    'balnco': 'blanco',
    'branco': 'blanco',
    'negre': 'negro',
    'negroa': 'negro',
    'marrón': 'marron',
    'marro': 'marron',
    'café': 'marron',
    'cafe': 'marron',
    'gri': 'gris',
    'asul': 'azul',
    'asúl': 'azul',
    'rrojo': 'rojo',
    'rozo': 'rojo',
    'berde': 'verde',
    'bermellón': 'rojo',
  };

  // Sacar tildes
  n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Buscar en genderMap primero
  if (genderMap[n]) return genderMap[n];

  // 2. Buscar en typoMap
  if (typoMap[n]) return typoMap[n];

  // 3. Si termina en 'a' que no es 'naranja'/'celeste'/'violeta', probar cambiarla a 'o'
  //    (solo para colores con género gramatical)
  const femExceptions = new Set(['naranja', 'celeste', 'violeta', 'turquesa', 'beige', 'crema', 'marino']);
  if (n.endsWith('a') && !femExceptions.has(n) && n.length > 3) {
    const mascTry = n.slice(0, -1) + 'o';
    if (colorMap[mascTry]) return mascTry;
  }

  return n;
};

/**
 * Normaliza un string completo de color(es) separados por coma.
 * "Blanca, NEGRA, Azul marino" → "Blanco, Negro, Azul Oscuro"
 */
export const normalizeColorString = (colorStr: string): string => {
  if (!colorStr?.trim()) return '';
  return colorStr
    .split(',')
    .map((c) => {
      const raw = c.trim();
      if (!raw) return '';
      const normalized = normalizeColorName(raw);
      // Si normalizeColorName devolvió un alias conocido, ponerlo con primera mayúscula
      for (const [key, _hex] of Object.entries(colorMap)) {
        if (key === normalized) return capitalize(key);
      }
      // Si está en variantes (ej: "azul oscuro")
      for (const [key, _hex] of Object.entries(colorMap)) {
        if (key === normalized) return capitalize(key);
      }
      return capitalize(normalized);
    })
    .filter(Boolean)
    .join(', ');
};

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
  'marron': '#92400E',
  'beige': '#D4C4B0',
  'crema': '#F5F5DC',
  'celeste': '#87CEEB',
  'dorado': '#FFD700',
  'plateado': '#C0C0C0',
  'turquesa': '#14B8A6',
  'vino': '#7F1D1D',
  'marino': '#1E3A8A',

  // Variantes
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

  // Inglés
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

/**
 * Retorna el array de hex para cada color en un string multi-color separado por coma.
 * "Negro, Blanco" → ["#000000", "#FFFFFF"]
 */
export const getColorHexArray = (colorStr: string): string[] => {
  if (!colorStr?.trim()) return [];
  return colorStr
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => getColorFromName(c));
};

export const getColorFromName = (colorName: string): string => {
  const normalized = normalizeColorName(colorName);

  if (colorMap[normalized]) {
    return colorMap[normalized];
  }

  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

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
