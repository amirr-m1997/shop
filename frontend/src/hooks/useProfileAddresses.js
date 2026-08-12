import { useCallback, useEffect, useState } from 'react';
import { authAPI } from '../services/api';

const EMPTY_ADDRESS = {
  full_name: '', phone: '', address_line1: '', address_line2: '',
  city: '', state: '', postal_code: '', is_default: false,
};

export const useProfileAddresses = (isAuthenticated) => {
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDRESS);
  const [addrErr, setAddrErr] = useState('');
  const [deleteAddrOpen, setDeleteAddrOpen] = useState(false);
  const [deleteAddrId, setDeleteAddrId] = useState(null);

  const loadAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const response = await authAPI.getAddresses(); setAddresses(response.data);
    } catch (error) { setAddrErr(error.response?.data?.error || 'خطا در دریافت آدرس‌ها'); }
    finally { setAddrLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) loadAddresses(); }, [isAuthenticated, loadAddresses]);

  const resetAddrForm = () => { setAddrForm(EMPTY_ADDRESS); setEditingAddr(null); setAddrErr(''); };
  const openAddAddress = () => { resetAddrForm(); setShowAddrForm(true); };
  const openEditAddress = (address) => {
    setAddrForm({
      full_name: address.full_name, phone: address.phone, address_line1: address.address_line1,
      address_line2: address.address_line2 || '', city: address.city, state: address.state,
      postal_code: address.postal_code, is_default: address.is_default,
    });
    setEditingAddr(address.id); setShowAddrForm(true); setAddrErr('');
  };
  const handleAddressSubmit = async (event) => {
    event.preventDefault(); setAddrErr('');
    if (!addrForm.full_name || !addrForm.phone || !addrForm.address_line1 || !addrForm.city) {
      setAddrErr('لطفاً فیلدهای الزامی را پر کنید'); return;
    }
    try {
      if (editingAddr) await authAPI.updateAddress(editingAddr, addrForm);
      else await authAPI.createAddress(addrForm);
      setShowAddrForm(false); resetAddrForm(); loadAddresses();
    } catch (error) { setAddrErr(error.response?.data?.error || 'خطا در ذخیره آدرس'); }
  };
  const handleDeleteAddress = (id) => { setDeleteAddrId(id); setDeleteAddrOpen(true); };
  const confirmDeleteAddress = async () => {
    if (!deleteAddrId) return;
    try { await authAPI.deleteAddress(deleteAddrId); loadAddresses(); }
    catch (error) { setAddrErr(error.response?.data?.error || 'خطا در حذف آدرس'); }
    setDeleteAddrOpen(false); setDeleteAddrId(null);
  };

  return {
    addresses, addrLoading, showAddrForm, setShowAddrForm, editingAddr, addrForm, setAddrForm,
    addrErr, deleteAddrOpen, setDeleteAddrOpen, setDeleteAddrId,
    resetAddrForm, openAddAddress, openEditAddress,
    handleAddressSubmit, handleDeleteAddress, confirmDeleteAddress,
  };
};
