/**
 * useAIAnalysis Hook
 * Hook para análisis de imágenes con IA
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { analyzeGarmentImage } from '@/services/aiService';
import type { GarmentAnalysis } from '@/services/aiService';

interface UseAIAnalysisReturn {
  isAnalyzing: boolean;
  analysis: GarmentAnalysis | null;
  analyzeImage: (imageUri: string) => Promise<GarmentAnalysis | null>;
  resetAnalysis: () => void;
}

export const useAIAnalysis = (): UseAIAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GarmentAnalysis | null>(null);

  const analyzeImage = async (imageUri: string): Promise<GarmentAnalysis | null> => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeGarmentImage(imageUri);
      setIsAnalyzing(false);

      if (result.error) {
        Alert.alert('Error', result.error);
        return null;
      }

      if (result.data) {
        setAnalysis(result.data);
        return result.data;
      }

      return null;
    } catch (error) {
      setIsAnalyzing(false);
      Alert.alert('Error', 'Failed to analyze image');
      return null;
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
