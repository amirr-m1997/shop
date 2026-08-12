import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useProfileEditor } from '../hooks/useProfileEditor';
import { useProfileSecurity } from '../hooks/useProfileSecurity';
import { useProfileAddresses } from '../hooks/useProfileAddresses';
import { useLoginHistory } from '../hooks/useLoginHistory';
import ProfileDashboard from '../components/profile/ProfileDashboard';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'ظهر بخیر';
  if (hour < 21) return 'عصر بخیر';
  return 'شب بخیر';
};

/* ─── Main ─── */
const ProfilePage = () => {
  const { user, isAuthenticated, updateProfile, changePassword, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  const {
    profileForm, setProfileForm, profileMsg, profileErr, profileLoading,
    avatarUploading, fileInputRef, handleProfileSubmit, handleAvatarChange, handleRemoveAvatar,
  } = useProfileEditor({ user, updateProfile });
  const {
    oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    showOldPw, setShowOldPw, showNewPw, setShowNewPw, pwMsg, pwErr, pwLoading,
    verifyType, setVerifyType, verifyCode, setVerifyCode, verifyMsg, verifyErr,
    verifyLoading, verifyCodeDev, setVerifyCodeDev,
    handlePasswordSubmit, handleSendVerification, handleVerifyCode,
  } = useProfileSecurity(changePassword);
  const {
    addresses, addrLoading, showAddrForm, setShowAddrForm, editingAddr, addrForm, setAddrForm,
    addrErr, deleteAddrOpen, setDeleteAddrOpen, setDeleteAddrId,
    resetAddrForm, openAddAddress, openEditAddress,
    handleAddressSubmit, handleDeleteAddress, confirmDeleteAddress,
  } = useProfileAddresses(isAuthenticated);
  const {
    loginHistory, loginHistoryLoading, loginHistoryOpen, setLoginHistoryOpen, loadLoginHistory,
  } = useLoginHistory();

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pwSectionOpen, setPwSectionOpen] = useState(false);



  /* ── Profile completion ── */
  const completionPercent = useMemo(() => {
    if (!user) return 0;
    let filled = 0;
    const total = 6;
    if (user.username) filled++;
    if (user.email) filled++;
    if (user.first_name) filled++;
    if (user.last_name) filled++;
    if (user.phone) filled++;
    if (user.date_of_birth) filled++;
    return Math.round((filled / total) * 100);
  }, [user]);

  const initials = useMemo(() => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || user?.username?.[0]?.toUpperCase() || '?';
  }, [user]);

  const displayName = useMemo(() => {
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    return user?.username || 'کاربر';
  }, [user]);

  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => { await logout(); setLogoutOpen(false); navigate('/'); };



  if (!isAuthenticated) return null;

  const inputClass =
    'h-11 rounded-xl border-border/60 bg-background/80 shadow-sm transition-all duration-300 focus-visible:border-primary/40 focus-visible:ring-primary/20';

  return (
    <ProfileDashboard model={{
      user, cart, wishlist, toggleWishlist, completionPercent, initials, displayName, greeting,
    profileForm, setProfileForm, profileMsg, profileErr, profileLoading, avatarUploading,
    fileInputRef, handleProfileSubmit, handleAvatarChange, handleRemoveAvatar,
    oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    showOldPw, setShowOldPw, showNewPw, setShowNewPw, pwMsg, pwErr, pwLoading,
    verifyType, setVerifyType, verifyCode, setVerifyCode, verifyMsg, verifyErr, verifyLoading,
    verifyCodeDev, setVerifyCodeDev, handlePasswordSubmit, handleSendVerification, handleVerifyCode,
    addresses, addrLoading, showAddrForm, setShowAddrForm, editingAddr, addrForm, setAddrForm,
    addrErr, deleteAddrOpen, setDeleteAddrOpen, setDeleteAddrId, resetAddrForm, openAddAddress,
    openEditAddress, handleAddressSubmit, handleDeleteAddress, confirmDeleteAddress,
    loginHistory, loginHistoryLoading, loginHistoryOpen, setLoginHistoryOpen, loadLoginHistory,
    logoutOpen, setLogoutOpen, pwSectionOpen, setPwSectionOpen, handleLogout, inputClass
    }} />
  );
};

export default ProfilePage;
