/**
 * FullScreenImage Component
 * Modal a pantalla completa para ver una prenda en detalle
 */

import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullScreenImageProps {
  visible: boolean;
  imageUrl: string;
  garmentName?: string;
  onClose: () => void;
}

export const FullScreenImage: React.FC<FullScreenImageProps> = ({
  visible,
  imageUrl,
  garmentName,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="dark-content" backgroundColor="#E5E5E5" />
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Garment name */}
        {garmentName && (
          <View style={styles.nameContainer}>
            <Text style={styles.nameText} numberOfLines={1}>
              {garmentName}
            </Text>
          </View>
        )}

        {/* Image */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 80,
    zIndex: 10,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});
