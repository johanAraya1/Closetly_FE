/**
 * OutfitCard Component
 * Tarjeta para mostrar un outfit con carrusel de prendas
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Outfit } from '@/types';
import { formatRelativeDate } from '@/utils/format';
import { COLORS } from '@/lib/constants';

const IMAGE_HEIGHT = 180;
const AUTO_SCROLL_INTERVAL = 3000; // 3 segundos

// Calcula el ancho del card basado en el tamaño de pantalla
const getCardWidth = (screenWidth: number) => {
  if (screenWidth < 600) {
    // Móvil: 2 columnas
    return (screenWidth - 60) / 2;
  } else if (screenWidth < 900) {
    // Tablet pequeña: 3 columnas
    return (screenWidth - 80) / 3;
  } else {
    // Tablet/Desktop: 4 columnas
    return (screenWidth - 100) / 4;
  }
};

interface OutfitCardProps {
  outfit: Outfit;
  onPress?: () => void;
  onToggleFavorite?: () => void;
}

export const OutfitCard = React.memo<OutfitCardProps>(({
  outfit,
  onPress,
  onToggleFavorite,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = getCardWidth(screenWidth);
  const garmentCount = outfit.garments?.length || 0;
  const hasGarments = garmentCount > 0;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    setCurrentIndex(index);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * cardWidth,
      animated: true,
    });
  };

  const goToNext = () => {
    if (garmentCount <= 1) return;
    const nextIndex = (currentIndex + 1) % garmentCount;
    scrollToIndex(nextIndex);
  };

  const goToPrev = () => {
    if (garmentCount <= 1) return;
    const prevIndex = currentIndex === 0 ? garmentCount - 1 : currentIndex - 1;
    scrollToIndex(prevIndex);
  };

  // Auto-scroll
  useEffect(() => {
    if (garmentCount > 1) {
      autoScrollTimer.current = setInterval(() => {
        goToNext();
      }, AUTO_SCROLL_INTERVAL);

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
        }
      };
    }
  }, [currentIndex, garmentCount]);

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* Botón de favorito */}
      {onToggleFavorite && (
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={styles.favoriteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={outfit.is_favorite ? 'heart' : 'heart-outline'}
            size={20}
            color={outfit.is_favorite ? '#EF4444' : '#9CA3AF'}
          />
        </TouchableOpacity>
      )}

      {/* Carrusel de prendas del outfit */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {hasGarments ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.carousel}
            >
              {outfit.garments!.map((garment) => (
                <View key={garment.id} style={[styles.imageContainer, { width: cardWidth }]}>
                  <Image
                    source={{ uri: garment.imageUrl }}
                    style={styles.garmentImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
            
            {/* Flechas de navegación */}
            {garmentCount > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.arrowButton, styles.arrowLeft]}
                  onPress={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.arrowButton, styles.arrowRight]}
                  onPress={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
            
            {/* Indicadores de página */}
            {garmentCount > 1 && (
              <View style={styles.pagination}>
                {outfit.garments!.map((garment, index) => (
                  <View
                    key={`${garment.id}-dot`}
                    style={[
                      styles.paginationDot,
                      index === currentIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCarousel}>
            <Ionicons name="shirt-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>Sin prendas</Text>
          </View>
        )}

        {/* Información del outfit */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {outfit.name}
          </Text>
          
          <View style={styles.infoRow}>
            {outfit.occasion && (
              <Text style={styles.infoText} numberOfLines={1}>
                {outfit.occasion}
              </Text>
            )}
            {outfit.season && outfit.occasion && (
              <Text style={styles.separator}>•</Text>
            )}
            {outfit.season && (
              <Text style={styles.infoText} numberOfLines={1}>
                {outfit.season}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  carouselContainer: {
    position: 'relative',
    height: IMAGE_HEIGHT,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  carousel: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  imageContainer: {
    height: IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  pagination: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  paginationDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  emptyCarousel: {
    height: IMAGE_HEIGHT,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  separator: {
    fontSize: 11,
    color: '#D1D5DB',
    marginHorizontal: 4,
  },
});
