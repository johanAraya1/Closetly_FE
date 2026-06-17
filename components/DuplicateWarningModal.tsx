/**
 * DuplicateWarningModal Component
 * Modal que advierte al usuario cuando se detecta una prenda duplicada
 * durante el proceso de creación
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from './Button';
import { FullScreenImage } from './FullScreenImage';
import { COLORS } from '@/lib/constants';

export interface MatchedGarment {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  brand?: string;
  color?: string;
  confidence: number;
}

interface DuplicateWarningModalProps {
  visible: boolean;
  matchedGarment: MatchedGarment;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  visible,
  matchedGarment,
  onCancel,
  onConfirm,
}) => {
  const router = useRouter();
  const [showFullScreen, setShowFullScreen] = useState(false);

  const handleViewDetail = () => {
    router.push(`/garments/${matchedGarment.id}`);
  };

  const categoryLabel = matchedGarment.category
    ? matchedGarment.category.charAt(0).toUpperCase() +
      matchedGarment.category.slice(1)
    : '';

  const confidencePercent = Math.round(matchedGarment.confidence * 100);

  return (
    <>
      <RNModal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onCancel}
      >
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.warningIcon}>
                <Ionicons name="warning-outline" size={28} color={COLORS.warning} />
              </View>
              <Text style={styles.title}>Encontramos una prenda muy similar</Text>
            </View>

            {/* Confidence badge */}
            <View style={styles.confidenceBadge}>
              <Ionicons name="scan-outline" size={16} color={COLORS.secondary} />
              <Text style={styles.confidenceText}>
                Coincidencia: {confidencePercent}%
              </Text>
            </View>

            {/* Matched garment preview */}
            <View style={styles.garmentPreview}>
              <TouchableOpacity
                onPress={() => setShowFullScreen(true)}
                activeOpacity={0.8}
                style={styles.thumbnailContainer}
              >
                <Image
                  source={{ uri: matchedGarment.imageUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.zoomOverlay}>
                  <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.garmentInfo}>
                <Text style={styles.garmentName} numberOfLines={2}>
                  {matchedGarment.name}
                </Text>
                {categoryLabel ? (
                  <Text style={styles.garmentDetail}>{categoryLabel}</Text>
                ) : null}
                {matchedGarment.brand ? (
                  <Text style={styles.garmentDetail}>{matchedGarment.brand}</Text>
                ) : null}
                {matchedGarment.color ? (
                  <Text style={styles.garmentDetail}>{matchedGarment.color}</Text>
                ) : null}
              </View>
            </View>

            {/* View detail link */}
            <TouchableOpacity
              onPress={handleViewDetail}
              style={styles.viewDetailLink}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetailText}>Ver detalle completo</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondary} />
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <View style={styles.actionButton}>
                <Button
                  title="Es esta, cancelar"
                  onPress={onCancel}
                  variant="secondary"
                  fullWidth
                />
              </View>
              <View style={styles.actionButton}>
                <Button
                  title="No, guardar de todas formas"
                  onPress={onConfirm}
                  variant="primary"
                  fullWidth
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      {/* Fullscreen image */}
      <FullScreenImage
        visible={showFullScreen}
        imageUrl={matchedGarment.imageUrl}
        garmentName={matchedGarment.name}
        onClose={() => setShowFullScreen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  warningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 16,
    gap: 6,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  garmentPreview: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  garmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  garmentDetail: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
});
