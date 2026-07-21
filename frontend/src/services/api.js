import axios from 'axios';

const API_BASE_URL = '/api';

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

// Handle 401 responses - only redirect on non-auth endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRequest = url.includes('/auth/');
      const pathname = window.location.pathname;
      const isAuthPage = pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/forgot-password') || pathname.includes('/reset-password');

      if (!isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use React Router-compatible redirect instead of hard reload
        if (!isAuthRequest) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

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
  submitReview: (data) => api.post('/products/reviews/', data),
  getSizeGuide: (categoryId) => api.get(`/products/size-guides/?category=${categoryId}`),
  getSizeRecommendation: (data) => api.post('/products/size-recommendation/', data),
  getMeasurementGuide: (params) => api.get('/products/measurement-guide/', { params }),
  getHomepageSections: () => api.get('/products/homepage-sections/'),
  getBanners: () => api.get('/products/banners/'),
  getStyles: () => api.get('/products/styles/'),
  getRecommendations: (params) => api.get('/products/recommendations/', { params }),
  // Wishlist
  getWishlist: () => api.get('/products/wishlist/'),
  addToWishlist: (productId) => api.post('/products/wishlist/', { product_id: productId }),
  removeFromWishlist: (wishlistId) => api.delete(`/products/wishlist/${wishlistId}/`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart/'),
  addToCart: (data) => api.post('/cart/add_item/', data),
  updateCartItem: (data) => api.put('/cart/update_item/', data),
  removeCartItem: (itemId) => api.delete('/cart/remove_item/', { data: { item_id: itemId } }),
  clearCart: () => api.delete('/cart/clear/'),
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

// Blog API
export const blogAPI = {
  getPosts: (params) => api.get('/blog/posts/', { params }),
  getPost: (id) => api.get(`/blog/posts/${id}/`),
  getCategories: () => api.get('/blog/categories/'),
};

// Pages API
export const pagesAPI = {
  getFaq: () => api.get('/pages/faq/'),
  getContactInfo: () => api.get('/pages/contact-info/'),
  sendMessage: (data) => api.post('/pages/contact-messages/', data),
  getLookbook: () => api.get('/pages/lookbook/'),
  getSettings: () => api.get('/pages/settings/'),
  getTestimonials: () => api.get('/pages/testimonials/'),
  submitTestimonial: (data) => api.post('/pages/testimonials/', data),
  getFeatures: () => api.get('/pages/features/'),
};

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  getUser: () => api.get('/auth/user/'),
  updateUser: (data) => api.put('/auth/user/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  logout: () => api.post('/auth/logout/'),
  passwordReset: (data) => api.post('/auth/password-reset/', data),
  passwordResetConfirm: (data) => api.post('/auth/password-reset-confirm/', data),
  sendVerification: (data) => api.post('/auth/send-verification/', data),
  verifyCode: (data) => api.post('/auth/verify-code/', data),
  getAddresses: () => api.get('/auth/addresses/'),
  createAddress: (data) => api.post('/auth/addresses/', data),
  updateAddress: (id, data) => api.put(`/auth/addresses/${id}/`, data),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}/`),
};
