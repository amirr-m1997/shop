import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Calendar, Flag } from 'lucide-react';
import { todosAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'زیاد', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'medium', label: 'متوسط', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'low', label: 'کم', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
];

export default function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const res = await todosAPI.list();
      setTodos(res.data.results || res.data || []);
    } catch {
      toast.error('خطا در بارگذاری وظایف');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const data = { title: newTitle, priority: newPriority };
      if (newDueDate) data.due_date = newDueDate;
      const res = await todosAPI.create(data);
      setTodos([res.data, ...todos]);
      setNewTitle('');
      setNewDueDate('');
      setShowForm(false);
      toast.success('وظیفه ایجاد شد');
    } catch {
      toast.error('خطا در ایجاد وظیفه');
    }
  };

  const handleToggle = async (todo) => {
    try {
      const res = await todosAPI.update(todo.id, { is_done: !todo.is_done });
      setTodos(todos.map((t) => (t.id === todo.id ? res.data : t)));
    } catch {
      toast.error('خطا در بروزرسانی');
    }
  };

  const handleDelete = async (id) => {
    try {
      await todosAPI.delete(id);
      setTodos(todos.filter((t) => t.id !== id));
      toast.success('حذف شد');
    } catch {
      toast.error('خطا در حذف');
    }
  };

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.is_done;
    if (filter === 'done') return t.is_done;
    return true;
  });

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.is_done).length,
    done: todos.filter((t) => t.is_done).length,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">وظایف</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {stats.active} در حال انجام · {stats.done} انجام شده
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          وظیفه جدید
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'همه' },
          { key: 'active', label: 'در حال انجام' },
          { key: 'done', label: 'انجام شده' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New Todo Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="عنوان وظیفه..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              افزودن
            </button>
          </div>
        </form>
      )}

      {/* Todo List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            وظیفه‌ای وجود ندارد
          </div>
        ) : (
          filtered.map((todo) => {
            const priority = PRIORITY_OPTIONS.find((p) => p.value === todo.priority);
            return (
              <div
                key={todo.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                  todo.is_done ? 'opacity-60' : ''
                }`}
              >
                <button
                  onClick={() => handleToggle(todo)}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    todo.is_done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                  }`}
                >
                  {todo.is_done && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${todo.is_done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {todo.title}
                  </span>
                  {todo.due_date && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {todo.due_date}
                    </div>
                  )}
                </div>
                {priority && (
                  <span className={`badge text-[10px] ${priority.color}`}>
                    {priority.label}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
