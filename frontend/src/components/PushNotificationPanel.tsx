import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { pushSubscriptionApi } from '../services/api';
import type { PushSubscriptionPayload } from '../types/backend';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const bufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const extractSubscriptionPayload = (subscription: PushSubscription): PushSubscriptionPayload | null => {
  const json = subscription.toJSON();
  if (json?.keys?.p256dh && json?.keys?.auth) {
    return {
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent
    };
  }
  const p256dhKey = subscription.getKey('p256dh');
  const authKey = subscription.getKey('auth');
  if (!p256dhKey || !authKey) return null;
  return {
    endpoint: subscription.endpoint,
    p256dh: bufferToBase64Url(p256dhKey),
    auth: bufferToBase64Url(authKey),
    user_agent: navigator.userAgent
  };
};

const registerServiceWorker = async () => {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active?.scriptURL?.endsWith('/push-sw.js')) return existing;
  return navigator.serviceWorker.register('/push-sw.js');
};

export const PushNotificationPanel = () => {
  const { t } = useTranslation();
  const [publicKey, setPublicKey] = useState<string>('');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportsPush = useMemo(() => {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }, []);

  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  const refreshSubscription = useCallback(async () => {
    if (!supportsPush) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const current = await registration?.pushManager.getSubscription();
      setSubscription(current ?? null);
    } catch {
      setSubscription(null);
    }
  }, [supportsPush]);

  useEffect(() => {
    if (!supportsPush) return;
    void pushSubscriptionApi
      .getPublicKey()
      .then((res) => {
        setPublicKey(res.publicKey ?? '');
      })
      .catch(() => {
        setPublicKey('');
      });
    void refreshSubscription();
  }, [refreshSubscription, supportsPush]);

  const handleEnable = async () => {
    if (!supportsPush) {
      setError(t('push.errors.unsupported'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        setError(t('push.errors.permission'));
        return;
      }
      const vapidKey = publicKey || (await pushSubscriptionApi.getPublicKey()).publicKey;
      if (!vapidKey) {
        setError(t('push.errors.vapid'));
        return;
      }
      const registration = await registerServiceWorker();
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      const payload = extractSubscriptionPayload(newSubscription);
      if (!payload) {
        setError(t('push.errors.subscribe'));
        return;
      }
      await pushSubscriptionApi.subscribe(payload);
      setSubscription(newSubscription);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('push.errors.subscribe');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const current = subscription ?? (await registration?.pushManager.getSubscription());
      if (!current) {
        setSubscription(null);
        return;
      }
      await pushSubscriptionApi.unsubscribe(current.endpoint);
      await current.unsubscribe();
      setSubscription(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('push.errors.unsubscribe');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    try {
      await pushSubscriptionApi.test({
        title: t('push.test.title'),
        body: t('push.test.body'),
        url: '/#operations'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('push.errors.test');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="panel">
      <header className="section-heading">
        <h2>{t('push.title')}</h2>
        <span className="chip chip--quiet">{t('push.subtitle')}</span>
      </header>

      <div className="push-status">
        <div>
          <strong>{t('push.status.support')}:</strong> {supportsPush ? t('push.supported') : t('push.unsupported')}
        </div>
        <div>
          <strong>{t('push.status.permission')}:</strong> {t(`push.permissions.${permission}`)}
        </div>
        <div>
          <strong>{t('push.status.subscription')}:</strong>{' '}
          {subscription ? t('push.subscription.active') : t('push.subscription.inactive')}
        </div>
        <div>
          <strong>{t('push.status.vapid')}:</strong>{' '}
          {publicKey ? t('push.vapid.ready') : t('push.vapid.missing')}
        </div>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="push-actions">
        <button type="button" onClick={handleEnable} disabled={loading || !supportsPush || permission === 'denied'}>
          {t('push.actions.enable')}
        </button>
        <button type="button" onClick={handleDisable} disabled={loading || !subscription}>
          {t('push.actions.disable')}
        </button>
        <button type="button" onClick={handleTest} disabled={loading || !subscription}>
          {t('push.actions.test')}
        </button>
      </div>
    </article>
  );
};


