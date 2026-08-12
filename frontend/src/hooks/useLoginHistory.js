import { useState } from 'react';
import { authAPI } from '../services/api';

export const useLoginHistory = () => {
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [loginHistoryOpen, setLoginHistoryOpen] = useState(false);

  const loadLoginHistory = async () => {
    setLoginHistoryLoading(true);
    try { const response = await authAPI.getLoginHistory(); setLoginHistory(response.data); }
    catch (error) { console.error('Failed to load login history:', error); }
    finally { setLoginHistoryLoading(false); }
  };

  return {
    loginHistory, loginHistoryLoading, loginHistoryOpen, setLoginHistoryOpen, loadLoginHistory,
  };
};
