import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NotificationItem } from '@/types';

const STORAGE_KEY = 'coffee-aur-kitaab.app-update-notifications';

function isValidNotificationItem(value: unknown): value is NotificationItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<NotificationItem>;

  return (
    (typeof candidate.id === 'number' || typeof candidate.id === 'string') &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.created_at === 'string'
  );
}

function loadStoredNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidNotificationItem);
  } catch {
    return [];
  }
}

function persistNotifications(notifications: NotificationItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function buildNotificationTitle(state: AppUpdateState): string {
  const version = state.targetVersion ?? 'new';

  if (state.status === 'downloaded') {
    return `Update ${version} is ready`;
  }

  if (state.status === 'downloading') {
    return `Downloading update ${version}`;
  }

  return `Update ${version} is available`;
}

function buildNotificationDescription(state: AppUpdateState): string {
  const version = state.targetVersion ?? 'the latest version';

  if (state.status === 'downloaded') {
    return `Version ${version} has finished downloading. Restart the app to install it.`;
  }

  if (state.status === 'downloading') {
    return `Version ${version} is downloading now${state.progress != null ? ` (${state.progress}%)` : ''}.`;
  }

  return `Version ${version} is available from GitHub. Open this panel to review or download it.`;
}

function buildUpdateNotification(
  state: AppUpdateState,
  previous?: NotificationItem,
): NotificationItem | null {
  if (
    state.status !== 'available' &&
    state.status !== 'downloading' &&
    state.status !== 'downloaded'
  ) {
    return null;
  }

  const versionKey = state.targetVersion ?? state.currentVersion ?? 'unknown';
  const notificationId = hashString(`app-update-${versionKey}`);
  const createdAt = previous?.created_at ?? state.checkedAt ?? new Date().toISOString();

  return {
    id: notificationId,
    type: 'app_update',
    severity: 'info',
    branch_id: null,
    branch_name: null,
    title: buildNotificationTitle(state),
    description: buildNotificationDescription(state),
    action_route: '',
    metadata: {
      version: versionKey,
      status: state.status,
      progress: state.progress,
      notes: state.notes,
      release_date: state.releaseDate,
    },
    is_read: previous?.is_read ?? false,
    read_at: previous?.read_at ?? null,
    created_at: createdAt,
  };
}

function sortNotifications(notifications: NotificationItem[]): NotificationItem[] {
  return notifications
    .slice()
    .sort((left, right) => {
      if (left.is_read !== right.is_read) {
        return Number(left.is_read) - Number(right.is_read);
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
}

function syncNotificationsWithState(
  notifications: NotificationItem[],
  state: AppUpdateState,
): NotificationItem[] {
  const relevantVersion = state.targetVersion ?? state.currentVersion ?? null;
  const nextNotification = buildUpdateNotification(
    state,
    relevantVersion == null
      ? undefined
      : notifications.find((item) => item.metadata?.version === relevantVersion),
  );

  if (!nextNotification) {
    return notifications;
  }

  const nextNotifications = notifications.filter(
    (item) => item.id !== nextNotification.id,
  );

  nextNotifications.unshift(nextNotification);
  return sortNotifications(nextNotifications);
}

export type AppUpdateStatus =
  | 'unsupported'
  | 'dev'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface AppUpdateState {
  status: AppUpdateStatus;
  currentVersion: string | null;
  targetVersion: string | null;
  progress: number | null;
  notes: string | null;
  releaseDate: string | null;
  checkedAt: string | null;
  error: string | null;
}

const DEFAULT_UPDATE_STATE: AppUpdateState = {
  status: 'unsupported',
  currentVersion: null,
  targetVersion: null,
  progress: null,
  notes: null,
  releaseDate: null,
  checkedAt: null,
  error: null,
};

export interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: (silent?: boolean) => Promise<void>;
  markAsRead: (notification: NotificationItem) => void;
  markAllAsRead: () => void;
  isSupported: boolean;
  updateState: AppUpdateState;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

const NotificationsContext = createContext<UseNotificationsReturn | null>(null);

function useNotificationsState(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadStoredNotifications(),
  );
  const [updateState, setUpdateState] = useState<AppUpdateState>(DEFAULT_UPDATE_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSupported = typeof window !== 'undefined' && window.appUpdates != null;

  useEffect(() => {
    persistNotifications(notifications);
  }, [notifications]);

  const applyUpdateState = useCallback((nextState: AppUpdateState) => {
    setUpdateState(nextState);
    setError(nextState.error);
    setNotifications((previous) => syncNotificationsWithState(previous, nextState));
  }, []);

  const refresh = useCallback(async (silent: boolean = false) => {
    if (!isSupported) {
      setUpdateState((previous) => ({
        ...previous,
        status: 'unsupported',
      }));
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const latestState = await window.appUpdates.getState();
      applyUpdateState(latestState);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : 'Failed to read app update status';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [applyUpdateState, isSupported]);

  const checkForUpdates = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    setLoading(true);

    try {
      const latestState = await window.appUpdates.check();
      applyUpdateState(latestState);
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : 'Failed to check for app updates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applyUpdateState, isSupported]);

  const downloadUpdate = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      const latestState = await window.appUpdates.download();
      applyUpdateState(latestState);
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : 'Failed to download the update';
      setError(message);
    }
  }, [applyUpdateState, isSupported]);

  const installUpdate = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      await window.appUpdates.install();
    } catch (installError) {
      const message =
        installError instanceof Error
          ? installError.message
          : 'Failed to install the update';
      setError(message);
    }
  }, [isSupported]);

  useEffect(() => {
    void refresh();

    if (!isSupported) {
      return undefined;
    }

    const unsubscribe = window.appUpdates.subscribe((nextState) => {
      applyUpdateState(nextState);
      setLoading(false);
    });

    return unsubscribe;
  }, [applyUpdateState, isSupported, refresh]);

  const markAsRead = useCallback((notification: NotificationItem) => {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true, read_at: new Date().toISOString() }
          : item,
      ),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString();

    setNotifications((previous) =>
      previous.map((notification) =>
        notification.is_read
          ? notification
          : { ...notification, is_read: true, read_at: now },
      ),
    );
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    isSupported,
    updateState,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useNotificationsState();

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): UseNotificationsReturn {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }

  return context;
}
