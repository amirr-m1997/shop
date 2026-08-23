import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../services/api';
import { resetSessionExpirySignal } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '../queries/chatQueries';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      await authAPI.ensureCsrf();
      const response = await authAPI.getUser();
      resetSessionExpirySignal();
      setUser(response.data);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const clearUserQueries = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: chatKeys.all });
    queryClient.removeQueries({ queryKey: chatKeys.all });
  }, [queryClient]);

  const expireSession = useCallback(() => {
    setUser(null);
    clearUserQueries();
  }, [clearUserQueries]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    window.addEventListener('auth:session-expired', expireSession);
    return () => window.removeEventListener('auth:session-expired', expireSession);
  }, [expireSession]);

  const login = useCallback(async (username, password, captcha = '') => {
    try {
      const response = await authAPI.login({ username, password, captcha });
      const { user: userData } = response.data;
      await clearUserQueries();
      resetSessionExpirySignal();
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در ورود به سیستم';
      setError(message);
      const loginError = new Error(message, { cause: err });
      loginError.captchaRequired = Boolean(err.response?.data?.captcha_required);
      throw loginError;
    }
  }, [clearUserQueries]);

  const register = useCallback(async (username, email, password) => {
    try {
      const response = await authAPI.register({ username, email, password });
      const { user: userData } = response.data;
      await clearUserQueries();
      resetSessionExpirySignal();
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در ثبت نام';
      setError(message);
      throw new Error(message, { cause: err });
    }
  }, [clearUserQueries]);

  const guestRegister = useCallback(async (password, orderNumber) => {
    try {
      const response = await authAPI.guestRegister({ password, order_number: orderNumber });
      const { user: userData } = response.data;
      await clearUserQueries();
      resetSessionExpirySignal();
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در ایجاد حساب';
      setError(message);
      throw new Error(message, { cause: err });
    }
  }, [clearUserQueries]);

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await authAPI.updateUser(data);
      setUser(response.data);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در بروزرسانی پروفایل';
      throw new Error(message, { cause: err });
    }
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در تغییر رمز عبور';
      throw new Error(message, { cause: err });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Clear local state for privacy even if server is unreachable,
      // but surface the error so the UI can warn on shared devices.
      const msg = err.response?.data?.error || err.response?.data?.detail || 'خروج با خطا مواجه شد؛ برای اطمینان مرورگر را ببندید.';
      setError(msg);
      throw new Error(msg, { cause: err });
    } finally {
      setUser(null);
      await clearUserQueries();
      resetSessionExpirySignal();
    }
  }, [clearUserQueries]);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    register,
    guestRegister,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: Boolean(user),
  }), [
    user, loading, error, login, register, guestRegister, logout,
    updateProfile, changePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
