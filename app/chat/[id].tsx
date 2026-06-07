/**
 * Chat Room Screen
 * Mensajería en tiempo real con FlatList, input bar, Realtime subscription
 * Screen → Store → Service → API → Realtime
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Loading, EmptyState, withScreenErrorBoundary } from '@/components';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';
import type { Message } from '@/types';

function ChatRoomScreen() {
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const {
    messages,
    isLoadingMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMessages,
    setActiveConversation,
    unsubscribeFromConversation,
  } = useChatStore();

  const conversationMessages = conversationId ? messages[conversationId] || [] : [];

  // Buscar la conversación actual para obtener el listingTitle
  const currentConversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );

  // Mount: cargar mensajes, setear conversación activa, subscribir Realtime
  // Unmount: desubscribir Realtime
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    loadMessages(conversationId, true);

    return () => {
      unsubscribeFromConversation();
      setActiveConversation(null);
    };
  }, [conversationId]);

  // Auto-scroll al fondo cuando llegan nuevos mensajes
  useEffect(() => {
    if (conversationMessages.length > 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [conversationMessages.length]);

  const onRefresh = useCallback(async () => {
    if (!conversationId) return;
    await loadMessages(conversationId, false);
  }, [conversationId, loadMessages]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !conversationId) return;

    setInputText('');
    Keyboard.dismiss();

    try {
      await sendMessage(conversationId, text);
    } catch {
      // El store maneja el error internamente
    }
  }, [inputText, conversationId, sendMessage]);

  const isOwnMessage = (senderId: string): boolean => {
    return currentUserId === senderId;
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLongPress = useCallback(
    (message: Message) => {
      if (!currentUserId) return;
      const isOwn = message.senderId === currentUserId;
      if (!isOwn) return;
      if (message.deletedAt) return; // Already deleted

      Alert.alert(
        t('chat.edit'),
        undefined,
        [
          {
            text: t('chat.edit'),
            onPress: () => {
              setEditText(message.content || '');
              setEditingMessageId(message.id);
            },
          },
          {
            text: t('chat.delete'),
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                t('chat.delete'),
                undefined,
                [
                  { text: t('chat.cancel'), style: 'cancel' },
                  {
                    text: t('chat.delete'),
                    style: 'destructive',
                    onPress: () => {
                      if (conversationId) {
                        deleteMessage(conversationId, message.id);
                      }
                    },
                  },
                ],
                { cancelable: true }
              );
            },
          },
          { text: t('chat.cancel'), style: 'cancel' },
        ],
        { cancelable: true }
      );
    },
    [currentUserId, conversationId, deleteMessage, t]
  );

  const handleEditSave = useCallback(async () => {
    const text = editText.trim();
    if (!text || !conversationId || !editingMessageId) return;

    setEditingMessageId(null);
    setEditText('');
    await editMessage(conversationId, editingMessageId, text);
  }, [editText, conversationId, editingMessageId, editMessage]);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      if (!currentUserId) return null;
      const isOwn = currentUserId === item.senderId;
      const isDeleted = !!item.deletedAt;
      const isEditing = editingMessageId === item.id;

      const bubbleContent = (
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
            isDeleted && styles.messageBubbleDeleted,
          ]}
        >
          {!isOwn && !isDeleted && (
            <Text style={styles.messageSender}>
              {item.senderId.slice(0, 8)}
            </Text>
          )}
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleEditSave}
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleEditCancel} style={styles.editActionBtn}>
                  <Text style={styles.editActionCancel}>{t('chat.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEditSave}
                  style={[styles.editActionBtn, styles.editActionSaveBtn]}
                >
                  <Text style={styles.editActionSave}>{t('chat.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : isDeleted ? (
            <Text style={styles.messageTextDeleted}>
              {t('chat.deletedMessage')}
            </Text>
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
              ]}
            >
              {item.content}
            </Text>
          )}
          {!isEditing && (
            <View style={styles.messageTimeRow}>
              <Text
                style={[
                  styles.messageTime,
                  isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>
              {item.editedAt && !isDeleted && (
                <Text
                  style={[
                    styles.messageEdited,
                    isOwn ? styles.messageEditedOwn : styles.messageEditedOther,
                  ]}
                >
                  {' '}· {t('chat.edited')}
                </Text>
              )}
            </View>
          )}
        </View>
      );

      return (
        <View
          style={[
            styles.messageRow,
            isOwn ? styles.messageRowOwn : styles.messageRowOther,
          ]}
        >
          {isOwn && !isDeleted && !isEditing ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={400}
            >
              {bubbleContent}
            </TouchableOpacity>
          ) : (
            bubbleContent
          )}
        </View>
      );
    },
    [
      currentUserId,
      editingMessageId,
      editText,
      handleLongPress,
      handleEditSave,
      handleEditCancel,
      t,
    ]
  );

  const renderEmpty = useCallback(() => {
    if (isLoadingMessages) return null;

    return (
      <View style={styles.emptyRoomContainer}>
        <EmptyState
          icon="chatbubbles-outline"
          title={t('chat.emptyRoom')}
          message=""
        />
      </View>
    );
  }, [isLoadingMessages, t]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMessages || conversationMessages.length === 0) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <Loading message={t('common.loading')} />
      </View>
    );
  }, [isLoadingMessages, conversationMessages.length, t]);

  const canSend = inputText.trim().length > 0;

  // Scroll to end when content size changes (initial load)
  const handleContentSizeChange = useCallback(() => {
    if (conversationMessages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [conversationMessages.length]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentConversation?.listingTitle || t('chat.title')}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoadingMessages && conversationMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Loading message={t('common.loading')} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={conversationMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingMessages && conversationMessages.length > 0}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onContentSizeChange={handleContentSizeChange}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.inputPlaceholder')}
            placeholderTextColor="#9CA3AF"
            returnKeyType="send"
            onSubmitEditing={canSend ? handleSend : undefined}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            <Ionicons
              name="send"
              size={20}
              color={canSend ? '#FFFFFF' : COLORS.gray[300]}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyRoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageRow: {
    marginVertical: 3,
    flexDirection: 'row',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleOwn: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#9CA3AF',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  messageBubbleDeleted: {
    opacity: 0.65,
  },
  messageTextDeleted: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9CA3AF',
  },
  messageTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageEdited: {
    fontSize: 11,
  },
  messageEditedOwn: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageEditedOther: {
    color: '#9CA3AF',
  },
  editContainer: {
    minWidth: 200,
  },
  editInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111827',
    minHeight: 40,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  editActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editActionCancel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  editActionSaveBtn: {
    backgroundColor: COLORS.primary,
  },
  editActionSave: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default withScreenErrorBoundary(ChatRoomScreen);
