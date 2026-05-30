'use client';

import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // SSR では window 無し
    if (typeof window === 'undefined') return;
    setOnline(window.navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 bg-brand-danger px-page py-2 text-center text-sm text-brand-bg shadow-card"
    >
      オフラインです。一部の操作が保留されます。ネットワーク復旧後に自動で再試行されます。
    </div>
  );
}
