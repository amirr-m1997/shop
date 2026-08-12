import { useEffect, useRef, useState } from 'react';

const EMPTY_PROFILE = {
  first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', style_preferences: [],
};

export const useProfileEditor = ({ user, updateProfile }) => {
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      first_name: user.first_name || '', last_name: user.last_name || '',
      email: user.email || '', phone: user.phone || '',
      date_of_birth: user.date_of_birth || '',
      style_preferences: Array.isArray(user.style_preferences) ? [...user.style_preferences] : [],
    });
  }, [user]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileErr(''); setProfileMsg(''); setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      setProfileMsg('تغییرات با موفقیت ذخیره شد');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (error) { setProfileErr(error.message); }
    finally { setProfileLoading(false); }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setProfileErr('فقط فایل تصویری مجاز است.'); return; }
    if (file.size > 2 * 1024 * 1024) { setProfileErr('حجم تصویر نباید بیشتر از ۲ مگابایت باشد.'); return; }
    setAvatarUploading(true); setProfileErr(''); setProfileMsg('');
    try {
      const form = new FormData(); form.append('avatar', file);
      await updateProfile(form);
      setProfileMsg('تصویر پروفایل به‌روزرسانی شد');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (error) { setProfileErr(error.message); }
    finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const form = new FormData(); form.append('avatar', '');
      await updateProfile(form);
    } catch (error) { setProfileErr(error.message); }
  };

  return {
    profileForm, setProfileForm, profileMsg, profileErr, profileLoading,
    avatarUploading, fileInputRef, handleProfileSubmit, handleAvatarChange, handleRemoveAvatar,
  };
};
