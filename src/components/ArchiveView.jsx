import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Archive, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ConfirmModal from './ConfirmModal';

export default function ArchiveView({ userId }) {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    type: 'danger',
    onConfirm: () => {},
  });

  const triggerConfirm = (title, message, onConfirm, confirmText = 'Xác nhận', type = 'danger') => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      type,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  useEffect(() => {
    if (!userId) return;
    // Query by userId only to avoid needing composite indexes, filter on client
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const archived = allTasks.filter(t => t.isArchived === true);
      setArchivedTasks(archived);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleRestore = async (taskId) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { isArchived: false });
      toast.success('Đã khôi phục công việc!');
    } catch (e) {
      toast.error('Lỗi khi khôi phục!');
    }
  };

  const handleDelete = (taskId) => {
    triggerConfirm(
      'Xóa vĩnh viễn',
      'Bạn có chắc chắn muốn xoá vĩnh viễn công việc này? Hành động này không thể hoàn tác.',
      async () => {
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
          toast.success('Đã xoá vĩnh viễn!');
        } catch (e) {
          toast.error('Lỗi khi xoá!');
        }
      }
    );
  };

  const handleRestoreAll = () => {
    triggerConfirm(
      'Khôi phục tất cả',
      'Khôi phục tất cả công việc đã lưu trữ?',
      async () => {
        try {
          for (const t of archivedTasks) {
            await updateDoc(doc(db, 'tasks', t.id), { isArchived: false });
          }
          toast.success('Đã khôi phục tất cả!');
        } catch (e) {
          toast.error('Lỗi khi khôi phục!');
        }
      },
      'Khôi phục',
      'primary'
    );
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--text-muted)' }}>Đang tải kho lưu trữ...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 2rem 2rem 2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', 
        background: 'rgba(30, 41, 59, 0.65)', backdropFilter: 'blur(20px)', padding: '1rem 1.5rem', 
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(255,255,255,0.1)' 
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Archive size={24} color="var(--primary)" />
          Kho lưu trữ ({archivedTasks.length})
        </h2>
        {archivedTasks.length > 0 && (
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleRestoreAll}>
            <RefreshCw size={16} /> Khôi phục tất cả
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
        {archivedTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <Archive size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Kho lưu trữ trống</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {archivedTasks.map(task => (
              <div key={task.id} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 'var(--radius)', transition: 'all 0.2s'
              }} className="archive-item">
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{task.title}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {task.dueDate && <span>⏰ {format(new Date(task.dueDate), 'dd/MM/yyyy HH:mm')}</span>}
                    {task.priority && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} color={task.priority === 'high' ? 'var(--danger)' : (task.priority === 'medium' ? 'var(--warning)' : 'var(--success)')} />
                        Ưu tiên: {task.priority === 'high' ? 'Cao' : (task.priority === 'medium' ? 'Trung bình' : 'Thấp')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" onClick={() => handleRestore(task.id)} title="Khôi phục">
                    <RefreshCw size={18} color="var(--success)" />
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(task.id)} title="Xóa vĩnh viễn">
                    <Trash2 size={18} color="var(--danger)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .archive-item:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.15) !important;
        }
      `}</style>
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />
    </div>
  );
}
