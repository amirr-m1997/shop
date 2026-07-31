import React, { useState, useEffect } from 'react';
import { Shield, Users, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { rolesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [editPerms, setEditPerms] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesAPI.list(),
        rolesAPI.permissions(),
      ]);
      setRoles(rolesRes.data.results || rolesRes.data || []);
      setPermissions(permsRes.data || []);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  const groupedPerms = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const CATEGORY_LABELS = {
    products: 'محصولات',
    orders: 'سفارشات',
    customers: 'مشتریان',
    reports: 'گزارشات',
    settings: 'تنظیمات',
    users: 'کاربران',
  };

  const startEdit = (role) => {
    setEditingRole(role);
    setEditPerms([...role.permissions]);
    setExpandedRole(role.id);
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setEditPerms([]);
  };

  const togglePerm = (permId) => {
    setEditPerms((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const savePerms = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      await rolesAPI.assignPermissions(editingRole.id, editPerms);
      toast.success('مجوزها بروزرسانی شد');
      setEditingRole(null);
      loadData();
    } catch {
      toast.error('خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">مدیریت نقش‌ها و دسترسی‌ها</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">تعریف نقش‌ها و تخصیص مجوزها</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const isEditing = editingRole?.id === role.id;
            return (
              <div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Role Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{role.name}</div>
                      <div className="text-xs text-slate-400">{role.slug} | {role.user_count} کاربر | {role.permissions.length} مجوز</div>
                    </div>
                    {role.is_default && (
                      <span className="badge badge-info text-xs">پیش‌فرض</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Permissions */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">مجوزها</h3>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                            انصراف
                          </button>
                          <button onClick={savePerms} disabled={saving} className="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                            {saving ? 'در حال ذخیره...' : 'ذخیره'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(role)} className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                          ویرایش مجوزها
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {Object.entries(groupedPerms).map(([cat, perms]) => (
                        <div key={cat}>
                          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">{CATEGORY_LABELS[cat] || cat}</div>
                          <div className="flex flex-wrap gap-2">
                            {perms.map((perm) => {
                              const hasPerm = isEditing
                                ? editPerms.includes(perm.id)
                                : role.permissions.includes(perm.id);
                              return (
                                <button
                                  key={perm.id}
                                  onClick={() => isEditing && togglePerm(perm.id)}
                                  disabled={!isEditing}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    hasPerm
                                      ? isEditing
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700'
                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : isEditing
                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                  } ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                  {hasPerm ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  {perm.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
