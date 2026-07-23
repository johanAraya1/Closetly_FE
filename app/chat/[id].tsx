/**
 * Chat Room Screen
 * Mensajería en tiempo real con FlatList, input bar, Realtime subscription
 * Screen → Store → Service → API → Realtime
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Loading, EmptyState, withScreenErrorBoundary } from '@/components';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { broadcastTyping } from '@/services/chatRealtime';
import { chatService } from '@/services/chatService';
import { useTranslation } from '@/hooks/useTranslation';
import { pickImageFromGallery, takePhoto } from '@/utils/imageUtils';
import { COLORS } from '@/lib/constants';
import type { Message } from '@/types';

function ChatRoomScreen() {
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingRef = useRef(false);

  const {
    messages,
    isLoadingMessages,
    isTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMessages,
    markAsRead,
    setActiveConversation,
    unsubscribeFromConversation,
    setTyping,
  } = useChatStore();

  const conversationMessages = useMemo(() => {
    const msgs = conversationId ? messages[conversationId] || [] : [];
    // Forzar orden cronológico: más viejo → más nuevo (WhatsApp style)
    return [...msgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, conversationId]);

  // Processed messages with unread divider
  type MessageItem = Message | { type: 'divider'; id: string };
  const processedMessages = useMemo<MessageItem[]>(() => {
    if (unreadDividerIndex <= 0 || unreadDividerIndex >= conversationMessages.length) {
      return conversationMessages;
    }
    const before = conversationMessages.slice(0, unreadDividerIndex);
    const after = conversationMessages.slice(unreadDividerIndex);
    return [
      ...before,
      { type: 'divider' as const, id: '__unread_divider__' },
      ...after,
    ];
  }, [conversationMessages, unreadDividerIndex]);

  // Buscar la conversación actual para obtener el listingTitle y unreadCount
  const currentConversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );

  // Track unread count for divider (before markAsRead resets it to 0)
  const unreadDividerIndex = useMemo(() => {
    if (!currentConversation?.unreadCount || currentConversation.unreadCount === 0) return -1;
    // The divider goes before the last N unread messages
    return conversationMessages.length - currentConversation.unreadCount;
  }, [conversationMessages.length, currentConversation?.unreadCount]);

  // Mount: cargar mensajes, setear conversación activa, subscribir Realtime
  // Unmount: desubscribir Realtime, cleanup typing
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    loadMessages(conversationId, true);

    // Mark as read after a short delay (let messages load first)
    const markTimer = setTimeout(() => {
      markAsRead(conversationId);
    }, 500);

    return () => {
      clearTimeout(markTimer);
      // Cleanup typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      broadcastTyping(conversationId, currentUserId || 'unknown', false);
      setTyping(false);

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

  /**
   * Manejador de cambio de texto con debounce para broadcast de typing.
   * Por cada tecla: broadcast typing true + reset timeout de 2s.
   * A los 2s sin escribir: broadcast typing false.
   */
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);

      if (!conversationId || !currentUserId) return;

      // Broadcast que estamos escribiendo
      broadcastTyping(conversationId, currentUserId, true);

      // Resetear el timeout de idle
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        broadcastTyping(conversationId, currentUserId, false);
      }, 2000);
    },
    [conversationId, currentUserId]
  );

  const handlePickImage = useCallback(async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      setSelectedImageUri(uri);
    }
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    const uri = await takePhoto();
    if (uri) {
      setSelectedImageUri(uri);
    }
  }, []);

  const handleImagePickerPress = useCallback(() => {
    Alert.alert(
      t('chat.sendPhoto'),
      undefined,
      [
        {
          text: t('garments.create.takePhoto'),
          onPress: handleCapturePhoto,
        },
        {
          text: t('garments.create.chooseFromGallery'),
          onPress: handlePickImage,
        },
        { text: t('chat.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [t, handleCapturePhoto, handlePickImage]);

  const handleSend = useCallback(async () => {
    if (isSendingRef.current) return; // Prevent double-tap
    const text = inputText.trim();
    if ((!text && !selectedImageUri) || !conversationId) return;
    isSendingRef.current = true;

    // Al enviar, dejar de emitir typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    broadcastTyping(conversationId, currentUserId || 'unknown', false);

    // Upload image if selected
    let imageUrl: string | undefined;
    if (selectedImageUri) {
      setIsUploadingImage(true);
      try {
        const result = await chatService.uploadChatImage(selectedImageUri);
        imageUrl = result.url;
      } catch {
        Alert.alert(t('common.error'), 'Failed to upload photo');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
      setSelectedImageUri(null);
    }

    setInputText('');
    Keyboard.dismiss();

    try {
      await sendMessage(conversationId, text, imageUrl);
    } catch {
      const errMsg = useChatStore.getState().error || t('chat.sendError');
      Alert.alert(t('common.error'), errMsg);
    } finally {
      isSendingRef.current = false;
    }
  }, [inputText, selectedImageUri, conversationId, sendMessage, currentUserId, t]);

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
    ({ item }: { item: MessageItem }) => {
      // Render unread divider
      if ('type' in item && item.type === 'divider') {
        return (
          <View style={styles.unreadDividerContainer}>
            <View style={styles.unreadDividerLine} />
            <Text style={styles.unreadDividerText}>{t('chat.newMessages')}</Text>
            <View style={styles.unreadDividerLine} />
          </View>
        );
      }

      const message = item as Message;
      if (!currentUserId) return null;
      const isOwn = currentUserId === message.senderId;
      const isDeleted = !!message.deletedAt;
      const isEditing = editingMessageId === message.id;

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
              {currentConversation?.otherParticipant?.username || 'Usuario'}
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
            <View style={styles.messageContentContainer}>
              {message.imageUrl && (
                <Image
                  source={{ uri: message.imageUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              {message.content !== null && (
                <Text
                  style={[
                    styles.messageText,
                    isOwn ? styles.messageTextOwn : styles.messageTextOther,
                  ]}
                >
                  {message.content}
                </Text>
              )}
            </View>
          )}
          {!isEditing && (
            <View style={styles.messageTimeRow}>
              <Text
                style={[
                  styles.messageTime,
                  isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
                ]}
              >
                {formatTime(message.createdAt)}
              </Text>
              {message.editedAt && !isDeleted && (
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
            <Pressable
              onLongPress={() => handleLongPress(message)}
              delayLongPress={400}
            >
              {bubbleContent}
            </Pressable>
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

  const canSend = (inputText.trim().length > 0 || !!selectedImageUri) && !isUploadingImage;

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
            data={processedMessages}
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

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{t('chat.typing')}</Text>
          </View>
        )}

        {/* Image Preview Bar */}
        {selectedImageUri && (
          <View style={styles.imagePreviewBar}>
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.imagePreviewThumb}
              resizeMode="cover"
            />
            {isUploadingImage ? (
              <View style={styles.imagePreviewLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.imagePreviewLoadingText}>{t('chat.uploading')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setSelectedImageUri(null)}
                style={styles.imagePreviewRemove}
              >
                <Ionicons name="close-circle" size={22} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleImagePickerPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name="camera-outline"
              size={24}
              color={COLORS.gray[500]}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder={t('chat.inputPlaceholder')}
            placeholderTextColor="#9CA3AF"
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={canSend ? handleSend : undefined}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {isUploadingImage ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={canSend ? '#FFFFFF' : COLORS.gray[300]}
              />
            )}
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
    width: '100%',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
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
    maxHeight: 120,
    lineHeight: 20,
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

  // Typing Indicator
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  typingText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Image Preview
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  imagePreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  imagePreviewLoading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  imagePreviewLoadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  imagePreviewRemove: {
    marginLeft: 12,
    padding: 4,
  },

  // Camera Button
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },

  // Message Image
  messageImage: {
    width: '100%',
    borderRadius: 12,
    maxHeight: 300,
    aspectRatio: 1,
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
  },
  messageContentContainer: {
    gap: 4,
  },

  // Unread Divider
  unreadDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  unreadDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  unreadDividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginHorizontal: 12,
  },
});

export default withScreenErrorBoundary(ChatRoomScreen);
