import React, { useState } from 'react';
import { X, User, Lock, Save } from 'lucide-react';
import { auth } from '../firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function UserProfileModal({ isOpen, onClose, currentUser }) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    let success = true;

    try {
      // Cập nhật tên hiển thị nếu có thay đổi
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }

      // Cập nhật mật khẩu nếu có nhập
      if (newPassword.trim().length > 0) {
        if (newPassword.length < 6) {
          toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
          success = false;
        } else {
          try {
            await updatePassword(currentUser, newPassword);
          } catch (error) {
            console.error("Lỗi đổi mật khẩu:", error);
            if (error.code === 'auth/requires-recent-login') {
              toast.error("Vui lòng đăng xuất và đăng nhập lại trước khi đổi mật khẩu!");
            } else {
              toast.error("Lỗi khi đổi mật khẩu: " + error.message);
            }
            success = false;
          }
        }
      }

      if (success) {
        toast.success("Đã cập nhật thông tin thành công!");
        setNewPassword('');
        onClose();
      }
    } catch (error) {
      console.error("Lỗi cập nhật thông tin:", error);
      toast.error("Có lỗi xảy ra khi cập nhật!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px',
        width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Hồ sơ của bạn</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), var(--info))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem',
            position: 'relative'
          }}>
            {displayName ? displayName[0].toUpperCase() : (currentUser?.email ? currentUser.email[0].toUpperCase() : 'U')}
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{currentUser?.email}</span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <User size={16} /> Tên hiển thị
            </label>
            <input 
              type="text" 
              className="input" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nhập tên của bạn..."
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: 'white' }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Lock size={16} /> Đổi mật khẩu mới (Tùy chọn)
            </label>
            <input 
              type="password" 
              className="input" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: 'white' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', width: '100%', padding: '0.75rem', borderRadius: '8px', 
              background: 'linear-gradient(135deg, var(--primary), var(--info))', 
              color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Đang lưu...' : <><Save size={16} /> Lưu thay đổi</>}
          </button>
        </form>
      </div>
    </div>
  );
}
