/**
 * AI Service
 * Servicio para análisis de imágenes con IA (OpenAI Vision)
 */

import { API_URL } from '@/lib/constants';
import type { GarmentCategory, GarmentSeason } from '@/types';

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
    // Convertir la imagen a base64
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });

    // Enviar al backend para análisis
    const aiResponse = await fetch(`${API_URL}/ai/analyze-garment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Backend Error:', aiResponse.status, errorText);
      return { error: `Error del servidor (${aiResponse.status})` };
    }

    const result = await aiResponse.json();
    console.log('AI Response:', result);
    
    // La respuesta puede venir como { data: {...} } o directamente {...}
    const analysisData = result.data || result;
    
    // Normalizar 'all' a 'all-season'
    if (analysisData.season === 'all') {
      analysisData.season = 'all-season';
    }
    
    return { data: analysisData };
  } catch (error) {
    console.error('AI analysis error:', error);
    return { error: 'Failed to analyze garment image' };
  }
}
