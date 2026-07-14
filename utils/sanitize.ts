/**
 * Sanitization Utils
 * Utilidades para sanitizar inputs del usuario y prevenir XSS/injection attacks
 */

/**
 * Sanitiza texto HTML para prevenir XSS
 * Convierte caracteres peligrosos en entidades HTML
 */
export const sanitizeHtml = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitiza input general del usuario
 * - Elimina caracteres peligrosos
 * - Limita longitud
 * - Trim espacios
 */
export const sanitizeInput = (
  input: string,
  maxLength: number = 500
): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
    .slice(0, maxLength);
};

/**
 * Sanitiza texto para nombres (prendas, colecciones, etc.)
 * Más permisivo pero seguro
 */
export const sanitizeName = (name: string, maxLength: number = 100): string => {
  if (!name) return '';
  
  return name
    .trim()
    .replace(/[<>'"]/g, '') // Eliminar caracteres HTML peligrosos
    .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
    .slice(0, maxLength);
};

/**
 * Sanitiza URLs
 * Solo permite protocolos seguros (http, https)
 */
export const sanitizeUrl = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // Solo permitir http y https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * Sanitiza nombres de archivo
 * Reemplaza caracteres no seguros con guión bajo
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return 'unnamed';
  
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_') // Reemplazar múltiples guiones bajos
    .slice(0, 255);
};

/**
 * Valida un nombre de color individual contra la lista blanca.
 */
function isValidColorName(name: string): boolean {
  const validColorNames = [
    // English
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
    'black', 'white', 'gray', 'grey', 'brown', 'beige', 'navy',
    'maroon', 'olive', 'teal', 'aqua', 'silver', 'gold',
    'cream', 'turquoise', 'wine', 'burgundy',
    // English with modifiers
    'dark red', 'dark blue', 'dark green', 'dark gray', 'dark grey',
    'light red', 'light blue', 'light green', 'light gray', 'light grey',
    'light beige', 'light pink', 'light yellow',
    // Spanish básicos
    'rojo', 'azul', 'verde', 'amarillo', 'naranja', 'morado', 'rosa',
    'negro', 'blanco', 'gris', 'marron', 'marrón', 'cafe', 'café',
    'beige', 'crema', 'dorado', 'plateado', 'turquesa', 'vino', 'marino',
    // Spanish variantes
    'rojo oscuro', 'azul oscuro', 'verde oscuro', 'gris oscuro',
    'rojo claro', 'azul claro', 'verde claro', 'gris claro',
    'beige claro', 'rosa claro', 'amarillo claro',
  ];
  return validColorNames.includes(name.trim().toLowerCase());
}

/**
 * Sanitiza color (hex o nombre) — inglés y español.
 * Soporta múltiples colores separados por coma: "Negro, Blanco, Rojo"
 */
export const sanitizeColor = (color: string): string => {
  if (!color) return '';
  
  // Separar por coma y sanitizar cada uno
  const parts = color.split(',').map((c) => c.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  
  const sanitized = parts
    .map((part) => {
      const lower = part.toLowerCase();
      
      // Validar formato hex (#RGB o #RRGGBB)
      if (/^#([a-f0-9]{3}|[a-f0-9]{6})$/i.test(lower)) {
        return lower;
      }
      
      // Validar contra lista blanca
      if (isValidColorName(lower)) {
        return lower;
      }
      
      // No válido → descartar este color
      return '';
    })
    .filter(Boolean)
    .join(', ');
  
  return sanitized;
};

/**
 * Sanitiza marca/brand
 */
export const sanitizeBrand = (brand: string): string => {
  if (!brand) return '';
  
  return brand
    .trim()
    .replace(/[<>'"]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 100);
};

/**
 * Sanitiza notas/descripción
 */
export const sanitizeNotes = (notes: string): string => {
  if (!notes) return '';
  
  return notes
    .trim()
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 1000); // Máximo 1000 caracteres para notas
};

/**
 * Sanitiza email
 * Valida formato y normaliza
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>'"]/g, '')
    .slice(0, 254); // Máximo RFC 5321
};

/**
 * Sanitiza username
 * Solo permite letras, números y guiones bajos
 */
export const sanitizeUsername = (username: string): string => {
  if (!username) return '';
  
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
};

/**
 * Valida y sanitiza número de teléfono
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Eliminar todo excepto números, +, - y espacios
  return phone
    .trim()
    .replace(/[^0-9+\-\s()]/g, '')
    .slice(0, 20);
};

/**
 * Sanitiza objeto completo recursivamente
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  customSanitizers?: Record<keyof T, (value: any) => any>
): T => {
  const sanitized = {} as T;
  
  for (const key in obj) {
    const value = obj[key];
    
    // Usar sanitizador personalizado si existe
    if (customSanitizers && customSanitizers[key]) {
      sanitized[key] = customSanitizers[key](value);
      continue;
    }
    
    // Sanitizar según tipo
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value) as any;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value) as any;
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Valida longitud de string
 */
export const validateLength = (
  value: string,
  min: number,
  max: number
): { valid: boolean; error?: string } => {
  const length = value.trim().length;
  
  if (length < min) {
    return {
      valid: false,
      error: `Minimum length is ${min} characters`,
    };
  }
  
  if (length > max) {
    return {
      valid: false,
      error: `Maximum length is ${max} characters`,
    };
  }
  
  return { valid: true };
};

/**
 * Detecta intentos de SQL injection
 */
export const detectSqlInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /[';]/,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Detecta intentos de XSS
 */
export const detectXss = (input: string): boolean => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Valida input contra patrones peligrosos
 */
export const isInputSafe = (input: string): { safe: boolean; reason?: string } => {
  if (detectSqlInjection(input)) {
    return { safe: false, reason: 'Potential SQL injection detected' };
  }
  
  if (detectXss(input)) {
    return { safe: false, reason: 'Potential XSS attack detected' };
  }
  
  return { safe: true };
};
