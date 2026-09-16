import React, { useState, useEffect } from 'react';
import { X, Check, Tag } from 'lucide-react';

const PRESET_COLORS = [
  // Reds & Roses
  '#ef4444', '#dc2626', '#b91c1c', '#f87171', '#f43f5e', '#e11d48', '#be123c', '#fb7185',
  // Pinks & Fuchsias
  '#ec4899', '#db2777', '#be185d', '#f472b6', '#d946ef', '#c026d3', '#a21caf', '#e879f9',
  // Purples & Violets
  '#a855f7', '#9333ea', '#7e22ce', '#c084fc', '#8b5cf6', '#7c3aed', '#6d28d9', '#a78bfa',
  // Indigos & Blues
  '#6366f1', '#4f46e5', '#4338ca', '#818cf8', '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa',
  // Sky Blues & Cyans
  '#0284c7', '#0369a1', '#38bdf8', '#7dd3fc', '#06b6d4', '#0891b2', '#0e7490', '#22d3ee',
  // Teals & Emeralds
  '#14b8a6', '#0d9488', '#0f766e', '#2dd4bf', '#10b981', '#059669', '#047857', '#34d399',
  // Greens & Limes
  '#22c55e', '#16a34a', '#15803d', '#4ade80', '#84cc16', '#65a30d', '#4d7c0f', '#a3e635',
  // Yellows, Ambers & Oranges
  '#eab308', '#ca8a04', '#f59e0b', '#d97706', '#b45309', '#f97316', '#ea580c', '#fb923c',
  // Grays & Slates
  '#64748b', '#475569', '#94a3b8', '#334155'
];

export default function ColumnModal({ isOpen, onClose, onSave, columnToEdit = null }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (isOpen) {
      if (columnToEdit) {
        setTitle(columnToEdit.title || '');
        setColor(columnToEdit.color || '#3b82f6');
      } else {
        setTitle('');
        setColor('#3b82f6');
      }
    }
  }, [isOpen, columnToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), color);
    onClose();
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div 
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
            <Tag size={20} color={color} />
            {columnToEdit ? 'Chỉnh Sửa Cột Công Việc' : 'Thêm Cột Mới'}
          </h2>
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            style={{ padding: '0.35rem', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              Tên cột tiêu đề
            </label>
            <input 
              type="text"
              autoFocus
              required
              maxLength={40}
              placeholder="Nhập tên cột (ví dụ: Chờ duyệt, Cần làm ngay...)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                background: 'var(--bg-surface, rgba(15, 23, 42, 0.6))',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
              }}
            />
            <span style={{ display: 'block', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {title.length}/40 ký tự
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Màu đại diện ({PRESET_COLORS.length} màu gợi ý)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Màu tùy chỉnh:</span>
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                />
              </div>
            </div>

            <div 
              className="color-picker-scroll"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(10, 1fr)', 
                gap: '0.5rem', 
                maxHeight: '160px', 
                overflowY: 'auto',
                padding: '0.4rem',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
              }}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    background: c,
                    border: color.toLowerCase() === c.toLowerCase() ? '2px solid #fff' : 'none',
                    boxShadow: color.toLowerCase() === c.toLowerCase() ? `0 0 10px ${c}` : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    transform: color.toLowerCase() === c.toLowerCase() ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {color.toLowerCase() === c.toLowerCase() && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={onClose}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}
            >
              {columnToEdit ? 'Cập Nhật' : 'Tạo Cột Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
