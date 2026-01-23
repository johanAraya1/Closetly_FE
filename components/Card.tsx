/**
 * Card Component
 * Tarjeta reutilizable
 */

import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  onPress, 
  className = '',
  style,
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-md p-4';

  if (onPress) {
    return (
      <TouchableOpacity
        className={`${baseClasses} ${className}`}
        onPress={onPress}
        style={style}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={`${baseClasses} ${className}`} style={style}>
      {children}
    </View>
  );
};
