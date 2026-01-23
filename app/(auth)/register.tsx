/**
 * Register Screen
 * Pantalla de registro
 */

import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { 
  isValidEmail, 
  isValidPassword, 
  isValidUsername, 
  validationMessages 
} from '@/utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    username?: string;
  }>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string; username?: string } = {};

    if (!email) {
      newErrors.email = validationMessages.email.required;
    } else if (!isValidEmail(email)) {
      newErrors.email = validationMessages.email.invalid;
    }

    if (!password) {
      newErrors.password = validationMessages.password.required;
    } else if (!isValidPassword(password)) {
      newErrors.password = validationMessages.password.tooShort;
    }

    if (!username) {
      newErrors.username = validationMessages.username.required;
    } else if (!isValidUsername(username)) {
      newErrors.username = validationMessages.username.invalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    
    if (!validate()) {
      setErrorMessage('Por favor, completa todos los campos correctamente');
      setShowErrorModal(true);
      return;
    }

    const success = await register(email, password, username, fullName);

    if (success) {
      setShowSuccessModal(true);
      // Redirigir después de mostrar el modal
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 2000);
    } else {
      // Mapear errores comunes del backend
      let message = error || 'Error al crear la cuenta';
      if (error?.includes('409') || error?.includes('already exists') || error?.includes('Conflict')) {
        message = 'Este correo electrónico ya está registrado. Por favor, inicia sesión o usa otro correo.';
      } else if (error?.includes('400')) {
        message = 'Datos inválidos. Verifica que todos los campos sean correctos.';
      } else if (error?.includes('network') || error?.includes('fetch')) {
        message = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      }
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>
            Create Account
          </Text>
          <Text style={styles.subtitle}>
            Join Closetly and organize your wardrobe
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: undefined });
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon={<Ionicons name="mail-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label="Username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setErrors({ ...errors, username: undefined });
            }}
            placeholder="username"
            autoCapitalize="none"
            error={errors.username}
            icon={<Ionicons name="at-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label="Full Name (Optional)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            icon={<Ionicons name="person-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: undefined });
            }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            icon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
          />

          <View style={styles.buttonContainer}>
            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Button
              title="Sign In"
              onPress={() => router.push('/(auth)/login')}
              variant="ghost"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Error */}
      <Modal
        visible={showErrorModal}
        type="error"
        title="Error en el Registro"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        actions={[
          {
            text: 'Entendido',
            onPress: () => setShowErrorModal(false),
            variant: 'primary',
          },
        ]}
      />

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        type="success"
        title="¡Cuenta Creada!"
        message="Tu cuenta se ha creado exitosamente. Redirigiendo..."
        actions={[
          {
            text: 'Continuar',
            onPress: () => {
              setShowSuccessModal(false);
              router.replace('/(tabs)/home');
            },
            variant: 'primary',
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  buttonContainer: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
