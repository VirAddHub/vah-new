'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Download, Bell, Wifi, WifiOff } from 'lucide-react';

// PWA Installation prompt
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed successfully');
    } else {
      console.log('PWA installation declined');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-xl shadow-modern-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install VirtualAddressHub</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Get quick access and a better experience by installing our app.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="btn-primary text-xs"
            >
              Install
            </Button>
            <Button
              onClick={() => setShowInstallPrompt(false)}
              variant="outline"
              size="sm"
              className="btn-outline text-xs"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Offline indicator
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-warning/10 border border-warning/20 rounded-lg p-3">
      <div className="flex items-center gap-2 text-warning">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">You're offline</span>
      </div>
    </div>
  );
}

// Push notification permission
export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      // Show prompt after 5 seconds if permission is default
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {
        // Show welcome notification
        new Notification('Welcome to VirtualAddressHub!', {
          body: 'You\'ll now receive important updates about your virtual address service.',
          icon: '/images/logo.png'
        });
      }
    }
  };

  if (permission !== 'default' || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-background border border-border rounded-xl shadow-modern-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Enable Notifications</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Get notified about important updates and new mail.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={requestPermission}
              size="sm"
              className="btn-primary text-xs"
            >
              Enable
            </Button>
            <Button
              onClick={() => setShowPrompt(false)}
              variant="outline"
              size="sm"
              className="btn-outline text-xs"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Service Worker registration
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return null;
}

// PWA Status indicator
export function PWAStatus() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

      setIsPWA(isStandalone || (isIOS && isInStandaloneMode));
    };

    checkPWA();
  }, []);

  if (!isPWA) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-success/10 border border-success/20 rounded-lg p-2">
      <div className="flex items-center gap-2 text-success">
        <Wifi className="h-4 w-4" />
        <span className="text-xs font-medium">PWA Mode</span>
      </div>
    </div>
  );
}
