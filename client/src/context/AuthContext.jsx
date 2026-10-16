
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import authService from "../services/authService";
import api from "../services/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "teamflow_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);

    sessionStorage.setItem(TOKEN_KEY, result.token);
    api.defaults.headers.common.Authorization = `Bearer ${result.token}`;
    setUser(result.user);

    return result.user;
  }, []);

  const register = useCallback(async (details) => {
    const result = await authService.register(details);

    sessionStorage.setItem(TOKEN_KEY, result.token);
    api.defaults.headers.common.Authorization = `Bearer ${result.token}`;
    setUser(result.user);

    return result.user;
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = sessionStorage.getItem(TOKEN_KEY);

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      try {
        const currentUser = await authService.getMe(token);

        if (active) setUser(currentUser);
      } catch {
        sessionStorage.removeItem(TOKEN_KEY);
        delete api.defaults.headers.common.Authorization;
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
