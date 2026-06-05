/**
 * ErrorBoundary Component
 * Captura errores de React y muestra pantalla de error en lugar de crashear
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error para debugging
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.title}>Oops! Algo salió mal</Text>
          <Text style={styles.message}>
            La aplicación encontró un error inesperado.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC que envuelve un componente de screen con ErrorBoundary
 * Para usar en screens de expo-router: export default withScreenErrorBoundary(HomeScreen)
 */
export function withScreenErrorBoundary<P extends object>(
  ScreenComponent: React.ComponentType<P>
): React.FC<P> {
  const WrappedScreen: React.FC<P> = (props) => (
    <ErrorBoundary>
      <ScreenComponent {...props} />
    </ErrorBoundary>
  );
  WrappedScreen.displayName = `withScreenErrorBoundary(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
  return WrappedScreen;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  errorDetails: {
    padding: 16,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    marginBottom: 24,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
