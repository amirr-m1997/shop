import { useState } from 'react';
import { authAPI } from '../services/api';

export const useProfileSecurity = (changePassword) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [verifyType, setVerifyType] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyErr, setVerifyErr] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyCodeDev, setVerifyCodeDev] = useState('');

  const handlePasswordSubmit = async (event) => {
    event.preventDefault(); setPwErr(''); setPwMsg('');
    if (newPassword !== confirmPassword) { setPwErr('رمز عبور جدید و تکرار آن مطابقت ندارند'); return; }
    if (newPassword.length < 6) { setPwErr('رمز عبور جدید باید حداقل ۶ کاراکتر باشد'); return; }
    setPwLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwMsg('رمز عبور با موفقیت تغییر کرد');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (error) { setPwErr(error.message); }
    finally { setPwLoading(false); }
  };

  const handleSendVerification = async (type) => {
    setVerifyType(type); setVerifyErr(''); setVerifyMsg(''); setVerifyCode(''); setVerifyCodeDev('');
    setVerifyLoading(true);
    try {
      const response = await authAPI.sendVerification({ type });
      setVerifyMsg(response.data.message);
      if (response.data.code) setVerifyCodeDev(response.data.code);
    } catch (error) { setVerifyErr(error.response?.data?.error || 'خطا در ارسال کد'); }
    finally { setVerifyLoading(false); }
  };

  const handleVerifyCode = async () => {
    setVerifyErr(''); setVerifyMsg(''); setVerifyLoading(true);
    try {
      await authAPI.verifyCode({ code: verifyCode, type: verifyType });
      setVerifyMsg(`${verifyType === 'phone' ? 'تلفن' : 'ایمیل'} با موفقیت تأیید شد`);
      setVerifyCode(''); setVerifyCodeDev(''); await authAPI.getUser();
      setTimeout(() => { setVerifyType(''); setVerifyMsg(''); }, 2000);
    } catch (error) { setVerifyErr(error.response?.data?.error || 'کد اشتباه است'); }
    finally { setVerifyLoading(false); }
  };

  return {
    oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    showOldPw, setShowOldPw, showNewPw, setShowNewPw, pwMsg, pwErr, pwLoading,
    verifyType, setVerifyType, verifyCode, setVerifyCode, verifyMsg, verifyErr,
    verifyLoading, verifyCodeDev, setVerifyCodeDev,
    handlePasswordSubmit, handleSendVerification, handleVerifyCode,
  };
};
