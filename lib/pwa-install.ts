import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

// Global listener setup (only runs once on web client)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

/**
 * Hook to manage PWA installation state and trigger browser prompt.
 */
export function usePwaInstall() {
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const isStandalone = isWeb
    ? window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    : false;

  const [canInstall, setCanInstall] = useState<boolean>(
    isWeb && !isStandalone && globalDeferredPrompt !== null
  );

  useEffect(() => {
    if (!isWeb) return;

    const updateState = () => {
      setCanInstall(!isStandalone && globalDeferredPrompt !== null);
    };

    listeners.add(updateState);
    updateState();

    return () => {
      listeners.delete(updateState);
    };
  }, [isWeb, isStandalone]);

  const promptInstall = async (): Promise<boolean> => {
    if (!globalDeferredPrompt) return false;
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setCanInstall(false);
        return true;
      }
    } catch (e) {
      console.warn('[PWA] Install prompt failed:', e);
    }
    return false;
  };

  return {
    isWeb,
    isStandalone,
    canInstall,
    promptInstall,
  };
}
