/**
 * Validation Utils
 * Utilidades para validación de datos
 */

/**
 * Valida un email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida una contraseña fuerte
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const isValidPassword = (password: string): boolean => {
  // Mínimo 8 caracteres
  if (password.length < 8) return false;
  
  // Al menos una mayúscula
  if (!/[A-Z]/.test(password)) return false;
  
  // Al menos una minúscula
  if (!/[a-z]/.test(password)) return false;
  
  // Al menos un número
  if (!/[0-9]/.test(password)) return false;
  
  // Al menos un carácter especial
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) return false;
  
  return true;
};

/**
 * Obtiene la fortaleza de una contraseña
 * Retorna un score de 0-6 y feedback
 */
export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string;
  color: string;
} => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) score++;
  
  const levels = [
    { feedback: 'Muy débil', color: '#EF4444' },
    { feedback: 'Débil', color: '#F97316' },
    { feedback: 'Regular', color: '#F59E0B' },
    { feedback: 'Aceptable', color: '#EAB308' },
    { feedback: 'Buena', color: '#84CC16' },
    { feedback: 'Fuerte', color: '#22C55E' },
    { feedback: 'Muy fuerte', color: '#10B981' },
  ];
  
  return {
    score,
    feedback: levels[score].feedback,
    color: levels[score].color,
  };
};

/**
 * Valida un username (sin espacios, mínimo 3 caracteres)
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Valida que un string no esté vacío
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Mensajes de error de validación
 */
export const validationMessages = {
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address',
  },
  password: {
    required: 'Password is required',
    tooShort: 'Password must be at least 8 characters',
    noUppercase: 'Password must contain at least one uppercase letter',
    noLowercase: 'Password must contain at least one lowercase letter',
    noNumber: 'Password must contain at least one number',
    noSpecial: 'Password must contain at least one special character (!@#$%^&*)',
    weak: 'Password is too weak. Please choose a stronger password.',
  },
  username: {
    required: 'Username is required',
    invalid: 'Username must be 3-20 characters (letters, numbers, underscore)',
  },
  name: {
    required: 'Name is required',
  },
  garment: {
    nameRequired: 'Garment name is required',
    categoryRequired: 'Category is required',
    imageRequired: 'Image is required',
  },
  outfit: {
    nameRequired: 'Outfit name is required',
    garmentsRequired: 'Select at least one garment',
  },
  collection: {
    nameRequired: 'Collection name is required',
  },
};
