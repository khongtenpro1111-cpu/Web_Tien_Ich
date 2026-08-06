import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Xác nhận", 
  cancelText = "Hủy",
  type = "danger", // "danger" or "primary"
  icon
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const themeColor = isDanger ? '#ef4444' : 'var(--primary)';
  const themeBg = isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)';

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--backdrop-bg, rgba(15, 23, 42, 0.75))', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{
        padding: '2rem', borderRadius: '16px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: themeBg, color: themeColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          {icon || <AlertTriangle size={32} />}
        </div>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main, white)' }}>
          {title}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {cancelText}
          </button>
          <button 
            className={isDanger ? "btn-danger" : "btn-primary"} 
            onClick={onConfirm}
            style={{ 
              flex: 1, 
              padding: '0.75rem', 
              borderRadius: '8px', 
              background: themeColor, 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
