/**
 * Chat List Screen
 * FlatList con conversaciones del usuario, pull-to-refresh, empty state
 * Screen → Store → Service → API
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/core';
import { EmptyState, Loading, withScreenErrorBoundary } from '@/components';
import { useChatStore } from '@/store/chatStore';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';
import type { Conversation } from '@/types';

function ChatListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { conversations, isLoading, error, loadConversations } = useChatStore();

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const onRefresh = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  const formatRelativeTime = (dateStr: string): string => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
  };

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => {
      const hasUnread = (item.unreadCount || 0) > 0;
      const username =
        item.otherParticipant.username ||
        `user_${item.otherParticipant.userId.slice(0, 6)}`;
      const lastMessagePreview = item.lastMessage?.content
        ? item.lastMessage.content.length > 60
          ? item.lastMessage.content.slice(0, 60) + '...'
          : item.lastMessage.content
        : null;

      return (
        <TouchableOpacity
          style={styles.conversationItem}
          activeOpacity={0.7}
          onPress={() => (router as any).push({
            pathname: '/chat/[id]',
            params: { id: item.id },
          })}
        >
          <View style={styles.avatarContainer}>
            {item.otherParticipant.avatarUrl ? (
              <Image
                source={{ uri: item.otherParticipant.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={22} color={COLORS.gray[400]} />
              </View>
            )}
          </View>

          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.username} numberOfLines={1}>
                {username}
              </Text>
              {item.lastMessage && (
                <Text style={styles.timestamp}>
                  {formatRelativeTime(item.lastMessage.createdAt)}
                </Text>
              )}
            </View>

            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.listingTitle}
            </Text>

            <View style={styles.conversationFooter}>
              {lastMessagePreview ? (
                <Text
                  style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
                  numberOfLines={1}
                >
                  {lastMessagePreview}
                </Text>
              ) : (
                <Text style={styles.noMessages}>{t('chat.emptyRoom')}</Text>
              )}

              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {item.unreadCount! > 9 ? '9+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router, t]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.gray[300]} />
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadConversations()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <EmptyState
        icon="chatbubbles-outline"
        title={t('chat.emptyList')}
        message=""
      />
    );
  }, [isLoading, error, t, loadConversations]);

  // Full-screen loading on first load
  if (isLoading && conversations.length === 0 && !error) {
    return <Loading message={t('common.loading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {conversations.length > 0
            ? `${conversations.length} conversaciones`
            : t('chat.emptyList')}
        </Text>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && conversations.length > 0}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  listingTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#374151',
  },
  noMessages: {
    fontSize: 13,
    color: '#D1D5DB',
    fontStyle: 'italic',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default withScreenErrorBoundary(ChatListScreen);
