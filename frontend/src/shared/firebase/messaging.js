import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import api from '../utils/api';

const seenIds = new Set();
let cachedToken = null;
let cachedSwReg = null;

const trimSeenCache = () => {
  if (seenIds.size <= 500) return;
  const first = seenIds.values().next().value;
  if (first) seenIds.delete(first);
};

const getScopeFromPathname = () => {
  if (typeof window === 'undefined') return 'user';
  const path = window.location?.pathname || '/';
  if (path.startsWith('/vendor')) return 'vendor';
  if (path.startsWith('/delivery')) return 'delivery';
  if (path.startsWith('/admin')) return 'admin';
  return 'user';
};

const getRoleContext = () => {
  const scope = getScopeFromPathname();

  // Prefer the currently active app area (prevents stale tokens from other roles hijacking the call).
  if (scope === 'vendor' && localStorage.getItem('vendor-token')) return { role: 'vendor', endpoint: '/vendor/notifications/fcm-token' };
  if (scope === 'delivery' && localStorage.getItem('delivery-token')) return { role: 'delivery', endpoint: '/delivery/notifications/fcm-token' };
  if (scope === 'user' && localStorage.getItem('token')) return { role: 'user', endpoint: '/user/notifications/fcm-token' };

  // Fallback to any available session (rare, but keeps behavior backward compatible).
  if (localStorage.getItem('vendor-token')) return { role: 'vendor', endpoint: '/vendor/notifications/fcm-token' };
  if (localStorage.getItem('delivery-token')) return { role: 'delivery', endpoint: '/delivery/notifications/fcm-token' };
  if (localStorage.getItem('token')) return { role: 'user', endpoint: '/user/notifications/fcm-token' };
  return null;
};

const tokenStorageKey = (role) => `last-fcm-token:${role || 'unknown'}`;

const getDeviceId = () => {
  const key = 'fcm-device-id';
  let current = localStorage.getItem(key);
  if (!current) {
    current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, current);
  }
  return current;
};

export const registerMessagingServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;
  if (cachedSwReg) return cachedSwReg;
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  });
  cachedSwReg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
  return cachedSwReg;
};

export const ensureFcmToken = async ({ forcePrompt = false } = {}) => {
  const context = getRoleContext();
  if (!context) return { status: 'no-session', token: null };

  // Avoid gesture-gated prompts on automatic flows.
  const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  if (currentPermission === 'denied') return { status: 'denied', token: null };
  if (currentPermission !== 'granted') {
    if (!forcePrompt) return { status: 'needs-gesture', token: null };
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { status: 'denied', token: null };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return { status: 'unsupported', token: null };

  const sw = await registerMessagingServiceWorker();
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: sw,
  });

  if (!token) return { status: 'no-token', token: null };
  cachedToken = token;
  localStorage.setItem(tokenStorageKey(context.role), token);

  await api.post(context.endpoint, {
    token,
    platform: 'web',
    deviceId: getDeviceId(),
  });

  return { status: 'saved', token };
};

// Back-compat for existing imports
export const requestAndSaveFcmToken = async () => {
  const result = await ensureFcmToken({ forcePrompt: false });
  return result.token;
};

export const removeCurrentFcmToken = async () => {
  const context = getRoleContext();
  const token = cachedToken || localStorage.getItem(tokenStorageKey(context?.role));
  if (!context || !token) return;
  await api.delete(context.endpoint, { data: { token } }).catch(() => {});
};

export const startForegroundMessageListener = async (navigate, showToast) => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const notificationId = payload?.data?.notificationId || payload?.messageId;
    if (notificationId && seenIds.has(notificationId)) return;
    if (notificationId) {
      seenIds.add(notificationId);
      trimSeenCache();
    }

    const title = payload?.notification?.title || 'Notification';
    const body = payload?.notification?.body || '';
    const link = payload?.data?.link;

    if (showToast) showToast({ title, body, link, payload });
  });
};
