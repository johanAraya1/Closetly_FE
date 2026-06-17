/**
 * Name Similarity Utilities
 * Levenshtein distance and normalized name similarity score
 */

/**
 * Calcula la distancia de Levenshtein entre dos strings.
 * Es el número mínimo de ediciones (inserción, eliminación, sustitución)
 * para transformar un string en otro.
 */
export function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  // Matriz de (aLen + 1) x (bLen + 1)
  const matrix: number[][] = Array.from({ length: aLen + 1 }, () =>
    new Array(bLen + 1).fill(0),
  );

  for (let i = 0; i <= aLen; i++) matrix[i][0] = i;
  for (let j = 0; j <= bLen; j++) matrix[0][j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // eliminación
        matrix[i][j - 1] + 1,       // inserción
        matrix[i - 1][j - 1] + cost, // sustitución
      );
    }
  }

  return matrix[aLen][bLen];
}

/**
 * Retorna un puntaje de similitud entre 0 y 1.
 * 1 = strings idénticos (ignorando mayúsculas/minúsculas y espacios al inicio/final)
 * 0 = completamente diferentes
 *
 * Usa distancia de Levenshtein normalizada por la longitud del string más largo.
 */
export function nameSimilarity(name1: string, name2: string): number {
  const a = name1.trim().toLowerCase();
  const b = name2.trim().toLowerCase();

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);

  return 1 - dist / maxLen;
}
