/// <reference types="nativewind/types" />

// Type declarations for expo-notifications (installed separately via npx expo install)
declare module 'expo-notifications' {

  export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'never_ask_again';

  export interface PermissionResponse {
    status: PermissionStatus;
    expires: 'never' | number;
    granted: boolean;
    canAskAgain: boolean;
  }

  export interface ExpoPushToken {
    type: 'expo';
    data: string;
  }

  export interface ExpoPushTokenOptions {
    deviceId?: string;
    development?: boolean;
    projectId?: string;
    applicationId?: string;
  }

  export interface NotificationContent {
    title?: string;
    subtitle?: string;
    body?: string | null;
    data: Record<string, unknown>;
    sound?: string;
    badge?: number;
    categoryId?: string;
  }

  export interface NotificationRequest {
    identifier: string;
    content: NotificationContent;
    trigger: unknown;
  }

  export interface Notification {
    date: number;
    request: NotificationRequest;
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
    userText?: string;
  }

  export interface NotificationHandler {
    handleNotification: (notification: Notification) => Promise<{
      shouldShowAlert?: boolean;
      shouldPlaySound?: boolean;
      shouldSetBadge?: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }

  export enum AndroidImportance {
    DEFAULT = 3,
    HIGH = 4,
    LOW = 2,
    MAX = 5,
    MIN = 1,
    NONE = 0,
    UNSPECIFIED = -1000,
  }

  export interface AndroidNotificationChannel {
    name: string;
    importance?: AndroidImportance;
    vibrationPattern?: number[];
    lightColor?: string;
  }

  export function getPermissionsAsync(): Promise<PermissionResponse>;
  export function requestPermissionsAsync(): Promise<PermissionResponse>;
  export function getExpoPushTokenAsync(options?: ExpoPushTokenOptions): Promise<ExpoPushToken>;
  export function setNotificationHandler(handler: NotificationHandler): void;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): { remove: () => void };
  export function setNotificationChannelAsync(
    channelId: string,
    channel: AndroidNotificationChannel
  ): Promise<void>;
}

// Type declarations for expo-device (installed separately via npx expo install)
declare module 'expo-device' {
  export const isDevice: boolean;
}

