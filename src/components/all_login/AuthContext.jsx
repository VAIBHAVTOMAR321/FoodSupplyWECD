import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const STORAGE_KEY = 'gyandhara_auth';
const API_URL = 'https://mahadevaaya.com/golden100days/golden100days_backend/api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 🔐 Decode JWT to get expiry time
const decodeTokenExpiry = (token, defaultExpiryMinutes) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return Date.now() + defaultExpiryMinutes * 60 * 1000;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      return payload.exp * 1000;
    }
    return Date.now() + defaultExpiryMinutes * 60 * 1000;
  } catch (err) {
    return Date.now() + defaultExpiryMinutes * 60 * 1000;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [role, setRole] = useState(null);
  const [uniqueId, setUniqueId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [accessTokenExpiry, setAccessTokenExpiry] = useState(null);
  const [refreshTokenExpiry, setRefreshTokenExpiry] = useState(null);

  // Store tokens in a ref so interceptors can access current values without re-creating the axios instance
  const tokensRef = useRef({ accessToken: null, refreshToken: null });
  const refreshPromiseRef = useRef(null);
  const logoutTimerRef = useRef(null);

  // 🔐 Check if refresh token is expired
  const isRefreshTokenExpired = () => {
    if (!refreshTokenExpiry) return false;
    return Date.now() >= refreshTokenExpiry;
  };

  const logout = useCallback(() => {
    console.log('🔴 Logging out...');

    // 1. Determine redirect path based on role (Logic from Login.jsx)
    let redirectPath = '/login';
    if (role === 'director') {
      redirectPath = '/login?director';
    } else if (role === 'dpo' || role === 'cdpo') {
      redirectPath = '/login?district';
    }
    // For supervisor/anganwadi, it remains '/login'


    isRefreshing = false;
    failedQueue = [];
    refreshPromiseRef.current = null;
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setRole(null);
    setUniqueId(null);
    setAccessTokenExpiry(null);
    setRefreshTokenExpiry(null);
    tokensRef.current = { accessToken: null, refreshToken: null };
    localStorage.removeItem(STORAGE_KEY);
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    // 2. Perform redirection using window.location
    // This avoids "useNavigate" errors and crashes
    window.location.href = redirectPath;
  }, [role]);

  const login = useCallback((data) => {
    if (data.access && data.refresh) {
      setUser(data.user || null);
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setRole(data.role || null);
      setUniqueId(data.unique_id || null);
      tokensRef.current = { accessToken: data.access, refreshToken: data.refresh };

      // Parse expiry from JWT tokens
      const accessExpiry = decodeTokenExpiry(data.access, 2);
      const refreshExpiry = decodeTokenExpiry(data.refresh, 3);
      setAccessTokenExpiry(accessExpiry);
      setRefreshTokenExpiry(refreshExpiry);

      console.log('🔑 Login successful. Access expires in:', Math.round((accessExpiry - Date.now()) / 1000), 's');
      console.log('🔑 Refresh expires in:', Math.round((refreshExpiry - Date.now()) / 1000), 's');
    } else {
      console.error('Login failed: Access or Refresh token not found in response');
      logout();
    }
  }, [logout]);

  const refreshAccessToken = useCallback(async () => {
    const currentRefresh = tokensRef.current.refreshToken;
    if (!currentRefresh || isRefreshing) {
      if (!currentRefresh) logout();
      return null;
    }

    // Check if refresh token is already expired
    if (isRefreshTokenExpired()) {
      console.log('❌ Refresh token expired');
      logout();
      return null;
    }

    // Prevent multiple concurrent refresh attempts
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    isRefreshing = true;
    try {
      const response = await axios.post(`${API_URL}/refresh-token/`, {
        refresh: currentRefresh,
      });
      const { access, refresh, error } = response.data;

      // Handle API error response
      if (error || !access) {
        console.log('❌ Token refresh failed:', error || 'No access token in response');
        throw new Error(error || 'Token refresh failed');
      }

      tokensRef.current.accessToken = access;
      setAccessToken(access);

      // Update refresh token if provided in response
      if (refresh) {
        tokensRef.current.refreshToken = refresh;
        setRefreshToken(refresh);
      }

      // Parse new access token expiry
      const newAccessExpiry = decodeTokenExpiry(access, 2);
      setAccessTokenExpiry(newAccessExpiry);

      // Parse new refresh token expiry if refresh token was updated
      if (refresh) {
        const newRefreshExpiry = decodeTokenExpiry(refresh, 3);
        setRefreshTokenExpiry(newRefreshExpiry);
      }

      console.log('🔄 Token refreshed. New access expires in:', Math.round((newAccessExpiry - Date.now()) / 1000), 's');

      processQueue(null, access);
      return access;
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.error === 'Invalid or expired refresh token') {
        console.error('Auth Session Expired:', errorData.error);
      }
      console.log('❌ Token refresh failed:', errorData?.error || errorData?.message || error.message);
      processQueue(error, null);
      logout();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromiseRef.current = null;
    }
  }, [logout]);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEY);
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed.access && parsed.refresh) {
          setUser(parsed.user || null);
          setAccessToken(parsed.access);
          setRefreshToken(parsed.refresh);
          setRole(parsed.role || null);
          setUniqueId(parsed.unique_id || null);
          setAccessTokenExpiry(parsed.accessTokenExpiry || null);
          setRefreshTokenExpiry(parsed.refreshTokenExpiry || null);
          tokensRef.current = { accessToken: parsed.access, refreshToken: parsed.refresh };

          // Check if refresh token is expired on load
          if (parsed.refreshTokenExpiry && Date.now() >= parsed.refreshTokenExpiry) {
            console.log('🚨 Stored refresh token expired');
            logout();
            return;
          }

          // Proactively refresh tokens immediately on page load/refresh
          // Removed: Proactive refresh is handled by a separate useEffect with an interval.
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to parse auth data:', err);
        logout();
      }
    }
    setIsReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to restore authentication state.
          // Dependencies like 'logout' change when we set state inside this effect, 
          // which would cause an infinite update loop if included.

  // Keep tokensRef in sync with state for the axios interceptors
  useEffect(() => {
    tokensRef.current = { accessToken, refreshToken };
  }, [accessToken, refreshToken]);

  // Persist auth state to localStorage on changes
  useEffect(() => {
    if (accessToken && refreshToken) {
      const authData = {
        user,
        access: accessToken,
        refresh: refreshToken,
        role,
        unique_id: uniqueId,
        accessTokenExpiry,
        refreshTokenExpiry,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    } else if (isReady && (!accessToken || !refreshToken)) {
      // If we are ready but tokens are missing, ensure storage is clean
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, accessToken, refreshToken, role, uniqueId, accessTokenExpiry, refreshTokenExpiry, isReady]);

  // Auto logout on refresh token expiry
  useEffect(() => {
    if (!refreshTokenExpiry) return;

    const timeUntilExpiry = refreshTokenExpiry - Date.now();
    if (timeUntilExpiry <= 0) {
      console.log('⏰ Refresh token already expired → auto logout');
      logout();
      return;
    }

    const timer = setTimeout(() => {
      console.log('⏰ Refresh token expired → auto logout');
      logout();
    }, timeUntilExpiry);

    logoutTimerRef.current = timer;

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, [refreshTokenExpiry, logout]);

  // Set up proactive refresh every 30 seconds
  useEffect(() => {
    let interval = null;
    if (accessToken && refreshToken) {
      interval = setInterval(() => {
        refreshAccessToken();
      }, 30000); // 30 seconds for testing/short access tokens
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [accessToken, refreshToken, refreshAccessToken]);

  // Authenticated axios instance with automatic token refresh logic
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    instance.interceptors.request.use(
      (config) => {
        const token = tokensRef.current.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const refresh = tokensRef.current.refreshToken;

        if (error.response?.status === 401) {
          // If we already tried to refresh and failed, or if no refresh token is available, log out immediately
          if (originalRequest._retry || !refresh) {
            logout();
            return Promise.reject(error);
          }

          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            }).catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;

          // Reuse the centralized refresh logic
          const access = await refreshAccessToken();
          if (access) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return instance(originalRequest);
          }
          return Promise.reject(error);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [logout, refreshAccessToken]);

  const value = useMemo(() => ({
    user,
    accessToken,
    refreshToken,
    role,
    uniqueId,
    login,
    logout,
    api,
    refreshAccessToken,
    isAuthenticated: !!accessToken,
    isReady,
  }), [user, accessToken, refreshToken, role, uniqueId, api, refreshAccessToken, isReady]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}