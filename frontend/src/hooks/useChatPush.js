import { useEffect } from 'react';
import { chatAPI } from '../services/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
};

/**
 * Register the chat service worker and persist a Web Push subscription.
 * Clicking a notification only opens the thread — it never marks seen.
 */
export const useChatPush = (isAuthenticated) => {
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return undefined;
    }
    let cancelled = false;
    const register = async () => {
      try {
        const keyResponse = await chatAPI.getPushPublicKey();
        const publicKey = keyResponse.data?.public_key;
        if (!publicKey || cancelled) return;
        const registration = await navigator.serviceWorker.register('/sw-chat.js');
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted' || cancelled) return;
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = subscription.toJSON();
        await chatAPI.subscribePush({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        });
      } catch {
        // Push is optional; chat still works over REST/WS.
      }
    };
    register();
    return () => { cancelled = true; };
  }, [isAuthenticated]);
};
