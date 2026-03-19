/**
 * useAIAnalysis Hook
 * Hook para análisis de imágenes con IA
 */

import { useState } from 'react';
import { analyzeGarmentImage } from '@/services/aiService';
import type { GarmentAnalysis } from '@/services/aiService';

interface UseAIAnalysisReturn {
  isAnalyzing: boolean;
  analysis: GarmentAnalysis | null;
  analyzeImage: (
    imageUri: string
  ) => Promise<{ analysis: GarmentAnalysis | null; error?: string }>;
  resetAnalysis: () => void;
}

export const useAIAnalysis = (): UseAIAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GarmentAnalysis | null>(null);

  const analyzeImage = async (
    imageUri: string
  ): Promise<{ analysis: GarmentAnalysis | null; error?: string }> => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeGarmentImage(imageUri);
      setIsAnalyzing(false);

      if (result.error) {
        return { analysis: null, error: result.error };
      }

      if (result.data) {
        setAnalysis(result.data);
        return { analysis: result.data };
      }

      return { analysis: null };
    } catch (error) {
      setIsAnalyzing(false);
      return { analysis: null, error: 'Failed to analyze image' };
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
  };

  return {
    isAnalyzing,
    analysis,
    analyzeImage,
    resetAnalysis,
  };
};
