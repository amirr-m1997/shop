import { useCallback, useEffect, useState } from 'react';
import { ordersAPI } from '../services/api';
import { EMPTY_ADDRESS } from '../components/checkout/constants';

export const useCheckoutAddress = (isAuthenticated) => {
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [addrLoading, setAddrLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const response = await ordersAPI.getShippingAddresses();
      const addresses = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);
      setShippingAddresses(addresses);
      if (addresses.length > 0) {
        const defaultAddress = addresses.find((address) => address.is_default) || addresses[0];
        setSelectedAddress(defaultAddress.id);
        setShowAddressForm(false);
      } else {
        setShowAddressForm(true);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setShippingAddresses([]);
      setShowAddressForm(true);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    } else {
      setAddrLoading(false);
      setShowAddressForm(true);
    }
  }, [fetchAddresses, isAuthenticated]);

  const handleAddressChange = ({ target: { name, value } }) => {
    setNewAddress((previous) => ({ ...previous, [name]: value }));
  };

  const addAddress = async () => {
    await ordersAPI.createShippingAddress(newAddress);
    await fetchAddresses();
    setNewAddress(EMPTY_ADDRESS);
    setShowAddressForm(false);
  };

  return {
    shippingAddresses,
    selectedAddress,
    setSelectedAddress,
    showAddressForm,
    setShowAddressForm,
    newAddress,
    addrLoading,
    handleAddressChange,
    addAddress,
  };
};
