import React, { useState, useEffect } from 'react';
import { StickyNote, Pin, Trash2, Send, Loader2 } from 'lucide-react';
import { notesAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function AdminNotes({ targetType, targetId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [targetType, targetId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const params = { target_type: targetType };
      if (targetId) params.target_id = targetId;
      const res = await notesAPI.list(params);
      setNotes(res.data.results || res.data || []);
    } catch {
      toast.error('خطا در بارگذاری یادداشت‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      await notesAPI.create({
        content: newNote.trim(),
        target_type: targetType,
        target_id: targetId || null,
      });
      setNewNote('');
      loadNotes();
      toast.success('یادداشت اضافه شد');
    } catch {
      toast.error('خطا در افزودن یادداشت');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await notesAPI.update(note.id, { is_pinned: !note.is_pinned });
      loadNotes();
    } catch {
      toast.error('خطا');
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await notesAPI.delete(noteId);
      loadNotes();
      toast.success('حذف شد');
    } catch {
      toast.error('خطا در حذف');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        <StickyNote className="h-5 w-5" />
        یادداشت‌های ادمین
      </h2>

      {/* Add Note */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="یادداشت جدید..."
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !newNote.trim()}
          className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">یادداشتی وجود ندارد</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-3 rounded-lg text-sm ${
                note.is_pinned
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-slate-700 dark:text-slate-200 flex-1 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePin(note)}
                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${
                      note.is_pinned ? 'text-blue-500' : 'text-slate-400'
                    }`}
                    title={note.is_pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 rounded text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                {note.author_username} | {formatDate(note.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
