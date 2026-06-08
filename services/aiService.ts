/**
 * AI Service
 * Servicio para análisis de imágenes con IA (OpenAI Vision)
 */

import { API_URL } from '@/lib/constants';
import * as ImageManipulator from 'expo-image-manipulator';
import type { GarmentCategory, GarmentSeason } from '@/types';
import i18n from '@/lib/i18n';

export interface GarmentAnalysis {
  name: string;
  category: GarmentCategory;
  color: string;
  brand?: string;
  season: GarmentSeason;
  description: string;
  confidence: number;
}

/**
 * Analiza una imagen de prenda usando IA
 */
export async function analyzeGarmentImage(
  imageUri: string
): Promise<{ data?: GarmentAnalysis; error?: string }> {
  try {
    // Usar expo-image-manipulator para obtener base64 (funciona en React Native)
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { base64: true, compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = manipResult.base64;
    if (!base64) {
      return { error: 'No se pudo procesar la imagen' };
    }

    // Obtener el locale actual del usuario para que la IA responda en ese idioma
    const locale = i18n.locale?.split('-')[0] || 'en';

    // Enviar al backend para análisis
    const aiResponse = await fetch(`${API_URL}/ai/analyze-garment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64,
        locale,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Backend Error:', aiResponse.status, errorText);

      let errorMessage = `Error del servidor (${aiResponse.status})`;

      if (errorText) {
        try {
          const parsed = JSON.parse(errorText);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.message) && parsed.message.length > 0) {
              errorMessage = parsed.message.join(', ');
            } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
              errorMessage = parsed.message.trim();
            } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
              errorMessage = parsed.error.trim();
            }

            if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
              errorMessage = `${errorMessage}: ${parsed.detail.trim()}`;
            }
          } else {
            errorMessage = errorText;
          }
        } catch {
          errorMessage = errorText;
        }
      }

      return { error: errorMessage };
    }

    const result = await aiResponse.json();

    // La respuesta puede venir como { data: {...} } o directamente {...}
    const analysisData = result.data || result;

    // Normalizar 'all' a 'all_season'
    if (analysisData.season === 'all') {
      analysisData.season = 'all_season';
    }

    return { data: analysisData };
  } catch (error) {
    console.error('AI analysis error:', error);
    return { error: 'Failed to analyze garment image' };
  }
}
