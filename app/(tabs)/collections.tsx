/**
 * Collections Screen
 * Pantalla que muestra las colecciones del usuario
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CollectionCard, Loading, EmptyState } from '@/components';
import { useCollections } from '@/hooks/useCollections';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/lib/constants';

export default function CollectionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { collections, isLoading, loadCollections, deleteCollection } = useCollections();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadCollections(user.id);
    setRefreshing(false);
  }, [user, loadCollections]);

  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    try {
      await deleteCollection(collectionId);
      if (user) {
        await loadCollections(user.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete collection. Please try again.');
    }
  }, [deleteCollection, loadCollections, user]);

  if (isLoading && !refreshing) {
    return <Loading message="Loading collections..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collections</Text>
        <TouchableOpacity
          onPress={() => router.push('/collections/create')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Collections List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {collections.length > 0 ? (
          <>
            <Text style={styles.subtitle}>
              {collections.length} collection{collections.length !== 1 ? 's' : ''}
            </Text>
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onPress={() => router.push(`/collections/${collection.id}`)}
                onDelete={() => handleDeleteCollection(collection.id)}
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon="albums-outline"
            title="No collections yet"
            message="Create collections to organize your outfits"
            actionLabel="Create Collection"
            onAction={() => router.push('/collections/create')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
});
