/**
 * Admin Dashboard Screen
 * Panel de administración principal
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminRoute } from '@/components';
import { useAdmin } from '@/hooks/useAdmin';
import { COLORS } from '@/lib/constants';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAdmin();

  const stats = [
    { icon: 'people', label: 'Usuarios', value: '1,234', color: COLORS.primary },
    { icon: 'shirt', label: 'Prendas', value: '5,678', color: COLORS.secondary },
    { icon: 'albums', label: 'Outfits', value: '2,345', color: COLORS.success },
    { icon: 'folder', label: 'Colecciones', value: '890', color: COLORS.warning },
  ];

  return (
    <AdminRoute>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Welcome */}
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Bienvenido, Admin</Text>
            <Text style={styles.welcomeSubtitle}>{user?.email}</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  <Ionicons name={stat.icon as any} size={28} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="person-add" size={24} color={COLORS.primary} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Nuevo Usuario</Text>
                <Text style={styles.actionSubtitle}>Crear cuenta de usuario</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="analytics" size={24} color={COLORS.success} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Ver Reportes</Text>
                <Text style={styles.actionSubtitle}>Estadísticas y métricas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="notifications" size={24} color={COLORS.warning} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Enviar Notificación</Text>
                <Text style={styles.actionSubtitle}>Notificar a usuarios</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>No hay actividad reciente</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AdminRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  scrollView: {
    flex: 1,
  },
  welcome: {
    padding: 24,
    backgroundColor: COLORS.primary,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  activityText: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
});
