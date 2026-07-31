import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
  getSalesChart: () => api.get('/dashboard/sales-chart/'),
  getRecentOrders: () => api.get('/dashboard/recent-orders/'),
  getCategories: () => api.get('/dashboard/categories/'),
  getBrands: () => api.get('/dashboard/brands/'),
  toggleProductActive: (id) => api.post(`/dashboard/products/${id}/toggle-active/`),
  bulkAction: (data) => api.post('/dashboard/bulk-action/', data),
};

// Products API
export const productsAPI = {
  list: (params) => api.get('/dashboard/products/', { params }),
  get: (id) => api.get(`/dashboard/products/${id}/`),
  create: (data) => api.post('/dashboard/products/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/dashboard/products/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/dashboard/products/${id}/`),
};

// Orders API
export const ordersAPI = {
  list: (params) => api.get('/dashboard/orders/', { params }),
  get: (id) => api.get(`/dashboard/orders/${id}/`),
  update: (id, data) => api.patch(`/dashboard/orders/${id}/`, data),
};

// Users API
export const usersAPI = {
  list: (params) => api.get('/dashboard/users/', { params }),
  get: (id) => api.get(`/dashboard/users/${id}/`),
  update: (id, data) => api.patch(`/dashboard/users/${id}/`, data),
};

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  getUser: () => api.get('/auth/user/'),
  logout: () => api.post('/auth/logout/'),
  changePassword: (data) => api.post('/auth/change-password/', data),
  updateUser: (data) => api.put('/auth/user/', data),
};

// Phase 2 - Notifications
export const notificationsAPI = {
  list: () => api.get('/dashboard/notifications/'),
  markRead: (id) => api.post(`/dashboard/notifications/${id}/mark-read/`),
  markAllRead: () => api.post('/dashboard/notifications/mark-read/'),
  delete: (id) => api.delete(`/dashboard/notifications/${id}/delete/`),
};

// Phase 2 - Activity
export const activityAPI = {
  list: () => api.get('/dashboard/activity/'),
};

// Phase 2 - Customers
export const customersAPI = {
  list: (params) => api.get('/dashboard/customers/', { params }),
  get: (id) => api.get(`/dashboard/customers/${id}/`),
  getOrderHistory: (userId) => api.get(`/dashboard/customers/${userId}/order-history/`),
};

// Phase 2 - Todos
export const todosAPI = {
  list: (params) => api.get('/dashboard/todos/', { params }),
  create: (data) => api.post('/dashboard/todos/', data),
  update: (id, data) => api.patch(`/dashboard/todos/${id}/`, data),
  delete: (id) => api.delete(`/dashboard/todos/${id}/`),
};

// Phase 2 - Low Stock
export const lowStockAPI = {
  list: (threshold) => api.get('/dashboard/low-stock/', { params: { threshold } }),
};

// Phase 2 - Export
export const exportAPI = {
  products: () => api.get('/dashboard/export/products/', { responseType: 'blob' }),
  orders: () => api.get('/dashboard/export/orders/', { responseType: 'blob' }),
};

// Phase 3 - Reports
export const reportsAPI = {
  custom: (params) => api.get('/dashboard/reports/custom/', { params }),
  comparison: (params) => api.get('/dashboard/reports/comparison/', { params }),
  customExport: (params) => api.get('/dashboard/reports/custom/', { params, responseType: 'blob' }),
};

// Phase 3 - Calendar
export const calendarAPI = {
  getData: (params) => api.get('/dashboard/calendar/', { params }),
};

// Phase 3 - Notes
export const notesAPI = {
  list: (params) => api.get('/dashboard/notes/', { params }),
  create: (data) => api.post('/dashboard/notes/', data),
  update: (id, data) => api.patch(`/dashboard/notes/${id}/`, data),
  delete: (id) => api.delete(`/dashboard/notes/${id}/`),
};

// Phase 3 - Roles & Permissions
export const rolesAPI = {
  list: () => api.get('/dashboard/roles/'),
  create: (data) => api.post('/dashboard/roles/', data),
  update: (id, data) => api.patch(`/dashboard/roles/${id}/`, data),
  delete: (id) => api.delete(`/dashboard/roles/${id}/`),
  permissions: () => api.get('/dashboard/permissions/'),
  assignPermissions: (roleId, permissionIds) => api.post(`/dashboard/roles/${roleId}/assign-permissions/`, { permission_ids: permissionIds }),
  getUserPermissions: (userId) => api.get(`/dashboard/users/${userId}/permissions/`),
};
