const SDK_URL =
  "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

type OneSignalInstance = {
  init: (options: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    notifyButton?: {
      enable: boolean;
    };
    welcomeNotification?: {
      disable: boolean;
    };
  }) => Promise<void>;

  Notifications: {
    permission: boolean;
    permissionNative: NotificationPermission;
    requestPermission: () => Promise<boolean>;
  };

  User: {
    PushSubscription: {
      id?: string | null;
      optedIn?: boolean;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<
      (oneSignal: OneSignalInstance) => void | Promise<void>
    >;
  }
}

let sdkPromise: Promise<void> | null = null;
let initializationPromise: Promise<void> | null = null;

function appId(): string {
  return String(import.meta.env.VITE_ONESIGNAL_APP_ID ?? "").trim();
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`,
    );

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar OneSignal.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.defer = true;

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => reject(new Error("No se pudo cargar OneSignal.")),
      { once: true },
    );

    document.head.appendChild(script);
  });

  return sdkPromise;
}

function withOneSignal<T>(
  callback: (oneSignal: OneSignalInstance) => T | Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];

    window.OneSignalDeferred.push(async (oneSignal) => {
      try {
        resolve(await callback(oneSignal));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function oneSignalConfigured(): boolean {
  return Boolean(appId());
}

export async function initializeOneSignal(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!oneSignalConfigured()) return;

  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];

    await loadSdk();

    await withOneSignal(async (oneSignal) => {
      await oneSignal.init({
        appId: appId(),
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        },
        welcomeNotification: {
          disable: true,
        },
      });
    });
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export async function notificationState(): Promise<{
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscriptionId: string;
}> {
  if (typeof window === "undefined") {
    return {
      supported: false,
      configured: false,
      permission: "default",
      subscribed: false,
      subscriptionId: "",
    };
  }

  const supported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!supported || !oneSignalConfigured()) {
    return {
      supported,
      configured: oneSignalConfigured(),
      permission: supported ? Notification.permission : "default",
      subscribed: false,
      subscriptionId: "",
    };
  }

  await initializeOneSignal();

  return withOneSignal((oneSignal) => ({
    supported: true,
    configured: true,
    permission: oneSignal.Notifications.permissionNative,
    subscribed: Boolean(oneSignal.User.PushSubscription.optedIn),
    subscriptionId: oneSignal.User.PushSubscription.id ?? "",
  }));
}

export async function enableNotifications(): Promise<void> {
  if (!oneSignalConfigured()) {
    throw new Error("Falta configurar VITE_ONESIGNAL_APP_ID.");
  }

  await initializeOneSignal();

  await withOneSignal(async (oneSignal) => {
    const granted = await oneSignal.Notifications.requestPermission();

    if (!granted && Notification.permission !== "granted") {
      throw new Error(
        "El permiso no fue concedido. Revisa los permisos del navegador.",
      );
    }

    await oneSignal.User.PushSubscription.optIn();
  });
}

export async function disableNotifications(): Promise<void> {
  await initializeOneSignal();

  await withOneSignal(async (oneSignal) => {
    await oneSignal.User.PushSubscription.optOut();
  });
}
