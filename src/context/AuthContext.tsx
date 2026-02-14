import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SessionWarningBanner } from "../components/shared/SessionWarningBanner";

export type User = {
  name: string;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_USER_KEY = "cmm.auth.user";
const STORAGE_TOKEN_KEY = "cmm.auth.token";
const INACTIVITY_TIMEOUT_MS = 120000;
const WARNING_WINDOW_MS = 10000;
const WARNING_TIMEOUT_MS = INACTIVITY_TIMEOUT_MS - WARNING_WINDOW_MS;
const WARNING_COUNTDOWN_SECONDS = 10;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

const isValidUser = (value: unknown): value is User => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<User>;
  return typeof candidate.name === "string" && typeof candidate.email === "string";
};

const createSessionToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const restoreUserFromStorage = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(STORAGE_TOKEN_KEY);
  const serializedUser = window.localStorage.getItem(STORAGE_USER_KEY);

  if (!token || !serializedUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(serializedUser);
    return isValidUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => restoreUserFromStorage());
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(WARNING_COUNTDOWN_SECONDS);

  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInactivityTimers = useCallback(() => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearInactivityTimers();
    setWarningVisible(false);
    setWarningCountdown(WARNING_COUNTDOWN_SECONDS);
    setUser(null);
    window.localStorage.removeItem(STORAGE_USER_KEY);
    window.localStorage.removeItem(STORAGE_TOKEN_KEY);
  }, [clearInactivityTimers]);

  const startWarningCountdown = useCallback(() => {
    setWarningVisible(true);
    setWarningCountdown(WARNING_COUNTDOWN_SECONDS);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setWarningCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!user) {
      return;
    }

    clearInactivityTimers();
    setWarningVisible(false);
    setWarningCountdown(WARNING_COUNTDOWN_SECONDS);

    warningTimeoutRef.current = setTimeout(() => {
      startWarningCountdown();
    }, WARNING_TIMEOUT_MS);

    logoutTimeoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimers, logout, startWarningCountdown, user]);

  const login = useCallback(async (email: string, _password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const nextUser = { name: "Sabu Oommen", email };
    const token = createSessionToken();

    window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (!user) {
      clearInactivityTimers();
      setWarningVisible(false);
      setWarningCountdown(WARNING_COUNTDOWN_SECONDS);
      return;
    }

    const handleActivity = () => {
      resetInactivityTimer();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearInactivityTimers();
    };
  }, [clearInactivityTimers, resetInactivityTimer, user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionWarningBanner visible={warningVisible} countdown={warningCountdown} />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
