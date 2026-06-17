/**
 * Button Component
 * Botón reutilizable con variantes y tamaños
 */

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    // Variant styles
    if (variant === 'primary') baseStyle.push(styles.primaryButton);
    if (variant === 'secondary') baseStyle.push(styles.secondaryButton);
    if (variant === 'outline') baseStyle.push(styles.outlineButton);
    if (variant === 'ghost') baseStyle.push(styles.ghostButton);
    
    // Size styles
    if (size === 'sm') baseStyle.push(styles.smallButton);
    if (size === 'md') baseStyle.push(styles.mediumButton);
    if (size === 'lg') baseStyle.push(styles.largeButton);
    
    // Other styles
    if (fullWidth) baseStyle.push(styles.fullWidth);
    if (disabled) baseStyle.push(styles.disabled);
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    if (variant === 'outline' || variant === 'ghost' || variant === 'secondary') {
      baseStyle.push(styles.primaryText);
    } else {
      baseStyle.push(styles.whiteText);
    }
    
    if (size === 'sm') baseStyle.push(styles.smallText);
    if (size === 'md') baseStyle.push(styles.mediumText);
    if (size === 'lg') baseStyle.push(styles.largeText);
    
    return baseStyle;
  };

  const getLoaderColor = () => {
    return variant === 'outline' || variant === 'ghost' || variant === 'secondary' ? '#62D9C7' : '#FFFFFF';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={getButtonStyle()}
    >
      {loading ? (
        <ActivityIndicator color={getLoaderColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={getTextStyle()}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#62D9C7',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#62D9C7',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#62D9C7',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mediumButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  largeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
  },
  whiteText: {
    color: '#FFFFFF',
  },
  primaryText: {
    color: '#62D9C7',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
