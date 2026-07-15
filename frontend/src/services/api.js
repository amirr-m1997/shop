import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  logout: () => api.post('/auth/logout/'),
  getUser: () => api.get('/auth/user/'),
};

// Products API
export const productsAPI = {
  getProducts: (params) => api.get('/products/products/', { params }),
  getProduct: (id) => api.get(`/products/products/${id}/`),
  getCategories: () => api.get('/products/categories/'),
  getBrands: () => api.get('/products/brands/'),
  getColors: () => api.get('/products/colors/'),
  getSizes: () => api.get('/products/sizes/'),
  getFabrics: () => api.get('/products/fabrics/'),
  getReviews: (productId) => api.get(`/products/reviews/?product=${productId}`),
  getSizeGuide: (categoryId) => api.get(`/products/size-guides/?category=${categoryId}`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart/cart/'),
  addToCart: (data) => api.post('/cart/cart/add_item/', data),
  updateCartItem: (data) => api.put('/cart/cart/update_item/', data),
  removeCartItem: (itemId) => api.delete('/cart/cart/remove_item/', { data: { item_id: itemId } }),
  clearCart: () => api.delete('/cart/cart/clear/'),
};

// Orders API
export const ordersAPI = {
  getOrders: () => api.get('/orders/orders/'),
  getOrder: (id) => api.get(`/orders/orders/${id}/`),
  createOrder: (data) => api.post('/orders/orders/create_order/', data),
  getShippingAddresses: () => api.get('/orders/shipping-addresses/'),
  createShippingAddress: (data) => api.post('/orders/shipping-addresses/', data),
  updateShippingAddress: (id, data) => api.put(`/orders/shipping-addresses/${id}/`, data),
  deleteShippingAddress: (id) => api.delete(`/orders/shipping-addresses/${id}/`),
};
