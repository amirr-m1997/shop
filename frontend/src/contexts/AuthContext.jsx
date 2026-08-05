import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.getUser();
        setUser(response.data);
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در ورود به سیستم';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await authAPI.register({ username, email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در ثبت نام';
      setError(message);
      throw new Error(message);
    }
  };

  const guestRegister = async (password, orderNumber) => {
    try {
      const response = await authAPI.guestRegister({ password, order_number: orderNumber });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در ایجاد حساب';
      setError(message);
      throw new Error(message);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateUser(data);
      setUser(response.data);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در بروزرسانی پروفایل';
      throw new Error(message);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      // Update token if returned
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'خطا در تغییر رمز عبور';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      register,
      guestRegister,
      logout,
      updateProfile,
      changePassword,
      isAuthenticated: !!user,
    }}>
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
