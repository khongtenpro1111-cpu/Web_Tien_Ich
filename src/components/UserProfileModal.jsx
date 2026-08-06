import React, { useState, useRef, useEffect } from 'react';
import { X, User, Lock, Save, Shield, Calendar, Mail, KeyRound, Eye, EyeOff, Camera, LogOut } from 'lucide-react';
import { auth, db } from '../firebase';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function UserProfileModal({ isOpen, onClose, currentUser, userProfile, refreshUser, onLogout }) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || currentUser?.photoURL || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  
  const fileInputRef = useRef(null);

  // Sync photoURL state if userProfile updates
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser?.displayName || '');
      setPhotoURL(userProfile?.photoURL || currentUser?.photoURL || '');
    }
  }, [isOpen, userProfile, currentUser]);

  if (!isOpen) return null;

  const googlePhotoURL = currentUser?.providerData?.find(p => p.providerId === 'google.com')?.photoURL || '';

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 120;
          const MAX_HEIGHT = 120;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to highly compressed JPEG to keep string size extremely lightweight (~5KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setPhotoURL(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    let success = true;

    try {
      if (activeTab === 'profile') {
        // Cập nhật tên hiển thị ở Firebase Auth
        if (displayName !== currentUser.displayName) {
          await updateProfile(currentUser, { displayName });
        }
        
        // Lưu cả tên hiển thị và ảnh đại diện nén vào Firestore để không bị giới hạn 2048 ký tự của Firebase Auth
        await setDoc(doc(db, 'users', currentUser.uid), {
          displayName,
          photoURL: photoURL || null
        }, { merge: true });
        
      } else if (activeTab === 'security') {
        if (!oldPassword.trim()) {
          toast.error("Vui lòng nhập mật khẩu cũ!");
          setLoading(false);
          return;
        }
        if (!newPassword.trim()) {
          toast.error("Vui lòng nhập mật khẩu mới!");
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error("Mật khẩu mới và mật khẩu xác nhận không khớp!");
          setLoading(false);
          return;
        }

        try {
          const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
          await reauthenticateWithCredential(currentUser, credential);
          await updatePassword(currentUser, newPassword);
        } catch (error) {
          console.error("Lỗi xác thực hoặc đổi mật khẩu:", error);
          success = false;
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            toast.error("Mật khẩu cũ không chính xác!");
          } else {
            toast.error("Có lỗi xảy ra: " + error.message);
          }
        }
      }

      if (success) {
        if (refreshUser) {
          await refreshUser();
        }
        toast.success("Đã cập nhật thông tin thành công!");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch (error) {
      console.error("Lỗi cập nhật thông tin:", error);
      toast.error("Có lỗi xảy ra khi cập nhật!");
    } finally {
      setLoading(false);
    }
  };

  const creationDate = currentUser?.metadata?.creationTime 
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Không rõ';

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--backdrop-bg, rgba(15, 23, 42, 0.75))', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      overflowY: 'auto', padding: '2rem 0'
    }}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{
        padding: '2.25rem', borderRadius: '24px',
        width: '92%', maxWidth: '440px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
        position: 'relative',
        overflow: 'hidden',
        margin: 'auto'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, white)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User size={22} color="var(--primary)" /> Hồ Sơ Cá Nhân
          </h2>
          <button className="btn-close-hover" onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <X size={18} />
          </button>
        </div>

        {/* Avatar Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <div style={{ 
              width: '94px', height: '94px', borderRadius: '50%', 
              background: photoURL ? `url(${photoURL}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary), var(--info, #3b82f6))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.45)',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              position: 'relative'
            }} className="avatar-container">
              {!photoURL && (displayName ? displayName[0].toUpperCase() : (currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'))}
              
              {/* Overlay on hover */}
              <div className="avatar-overlay" style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s'
              }}>
                <Camera size={24} color="white" />
              </div>
            </div>

            {/* Floating camera action button */}
            <div style={{
              position: 'absolute', bottom: '10px', right: '0px',
              background: 'var(--primary)', width: '28px', height: '28px',
              borderRadius: '50%', border: '2px solid rgba(15, 23, 42, 1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }} title="Thay đổi ảnh đại diện">
              <Camera size={14} />
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
          <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1.1rem', marginTop: '0.5rem' }}>{displayName || 'Thành viên'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{currentUser?.email}</span>
          {photoURL !== googlePhotoURL && (
            <button 
              type="button" 
              onClick={() => setPhotoURL(googlePhotoURL)}
              style={{
                background: 'transparent', border: 'none', 
                color: '#ef4444', fontSize: '0.8rem', 
                cursor: 'pointer', marginTop: '0.5rem', 
                textDecoration: 'underline', fontWeight: 500,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {googlePhotoURL ? "Dùng ảnh Google mặc định" : "Gỡ ảnh đại diện"}
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex', background: 'var(--input-bg, rgba(0,0,0,0.15))',
          padding: '4px', borderRadius: '12px', marginBottom: '1.75rem',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.05))',
          position: 'relative', zIndex: 1
        }}>
          <button 
            type="button" 
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
              background: activeTab === 'profile' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'profile' ? 'white' : 'var(--text-muted)',
              fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.25s'
            }}
          >
            <User size={14} /> Thông tin
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('security')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
              background: activeTab === 'security' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'security' ? 'white' : 'var(--text-muted)',
              fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.25s'
            }}
          >
            <Shield size={14} /> Bảo mật
          </button>
        </div>

        <form onSubmit={handleSave} style={{ position: 'relative', zIndex: 1 }}>
          {activeTab === 'profile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Tên hiển thị</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Nhập tên của bạn..."
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                  />
                </div>
              </div>

              {/* Readonly info section */}
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', padding: '1rem', 
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} /> Email đăng nhập
                  </span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{currentUser?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> Ngày tham gia
                  </span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{creationDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Mật khẩu cũ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Mật khẩu cũ</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type={showOldPassword ? "text" : "password"} 
                    className="input" 
                    value={oldPassword} 
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu cũ..."
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Mật khẩu mới</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    className="input" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Xác nhận mật khẩu mới</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="input" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
            {onLogout && (
              <button 
                type="button" 
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                style={{ 
                  flex: 1.2, padding: '0.75rem', borderRadius: '12px', 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', 
                  fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s', fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
              >
                <LogOut size={16} /> Đổi tài khoản
              </button>
            )}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ 
                flex: 2, padding: '0.75rem', borderRadius: '12px', 
                background: 'linear-gradient(135deg, var(--primary), var(--info, #3b82f6))', 
                color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s', fontSize: '0.9rem'
              }}
            >
              {loading ? 'Đang lưu...' : <><Save size={16} /> Lưu thay đổi</>}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .btn-close-hover:hover {
          background: rgba(255,255,255,0.15) !important;
          color: white !important;
          transform: rotate(90deg);
        }
        .avatar-container:hover .avatar-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
