import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Archive, Trash2, RefreshCw, AlertCircle, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ConfirmModal from './ConfirmModal';

export default function ArchiveView({ userId }) {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
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
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const archived = allTasks.filter(t => t.isArchived === true);
      setArchivedTasks(archived);
      // Clean up selectedIds that no longer exist
      setSelectedIds(prev => prev.filter(id => archived.some(t => t.id === id)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const toggleSelectAll = () => {
    if (selectedIds.length === archivedTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(archivedTasks.map(t => t.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRestoreSingle = async (taskId) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { isArchived: false });
      toast.success('Đã khôi phục công việc!');
    } catch (e) {
      toast.error('Lỗi khi khôi phục!');
    }
  };

  const handleDeleteSingle = (taskId) => {
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

  const handleBulkRestore = () => {
    const idsToRestore = selectedIds.length > 0 ? selectedIds : archivedTasks.map(t => t.id);
    if (idsToRestore.length === 0) return;

    triggerConfirm(
      'Khôi phục công việc',
      `Khôi phục ${idsToRestore.length} công việc đã chọn về bảng kế hoạch?`,
      async () => {
        try {
          for (const id of idsToRestore) {
            await updateDoc(doc(db, 'tasks', id), { isArchived: false });
          }
          setSelectedIds([]);
          toast.success(`Đã khôi phục ${idsToRestore.length} công việc!`);
        } catch (e) {
          toast.error('Lỗi khi khôi phục!');
        }
      },
      'Khôi phục',
      'primary'
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;

    triggerConfirm(
      'Xóa vĩnh viễn hàng loạt',
      `Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedIds.length} công việc đã chọn? Thao tác này không thể khôi phục!`,
      async () => {
        try {
          for (const id of selectedIds) {
            await deleteDoc(doc(db, 'tasks', id));
          }
          setSelectedIds([]);
          toast.success(`Đã xóa vĩnh viễn ${selectedIds.length} công việc!`);
        } catch (e) {
          toast.error('Lỗi khi xóa!');
        }
      },
      'Xóa tất cả đã chọn',
      'danger'
    );
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--text-muted)' }}>Đang tải kho lưu trữ...</h2>
      </div>
    );
  }

  const isAllSelected = archivedTasks.length > 0 && selectedIds.length === archivedTasks.length;

  return (
    <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header Bar */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', 
        background: 'rgba(30, 41, 59, 0.65)', backdropFilter: 'blur(20px)', padding: '0.75rem 1rem', 
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0
      }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
          <Archive size={20} color="var(--primary)" />
          Kho lưu trữ ({archivedTasks.length})
        </h2>

        {archivedTasks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Select All Toggle Button */}
            <button 
              type="button" 
              onClick={toggleSelectAll} 
              className="btn btn-ghost" 
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isAllSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
              {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>

            {/* Restore Action */}
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }} 
              onClick={handleBulkRestore}
            >
              <RefreshCw size={14} /> 
              {selectedIds.length > 0 ? `Khôi phục (${selectedIds.length})` : 'Khôi phục tất cả'}
            </button>

            {/* Bulk Delete Action */}
            {selectedIds.length > 0 && (
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.82rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }} 
                onClick={handleBulkDelete}
              >
                <Trash2 size={14} /> Xóa ({selectedIds.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main List Area */}
      <div className="glass-panel" style={{ flex: 1, borderRadius: 'var(--radius-lg)', padding: '0.75rem' }}>
        {archivedTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', color: 'var(--text-muted)' }}>
            <Archive size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Kho lưu trữ trống</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {archivedTasks.map(task => {
              const isChecked = selectedIds.includes(task.id);
              return (
                <div 
                  key={task.id} 
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.85rem 1rem', 
                    background: isChecked ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255,255,255,0.03)', 
                    border: isChecked ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 'var(--radius)', transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }} 
                  className="archive-item"
                  onClick={() => toggleSelectOne(task.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    {/* Selection Checkbox */}
                    <div style={{ color: isChecked ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 600 }}>{task.title}</h3>
                      <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {task.dueDate && <span>⏰ {format(new Date(task.dueDate), 'dd/MM/yyyy HH:mm')}</span>}
                        {task.priority && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={13} color={task.priority === 'high' ? 'var(--danger)' : (task.priority === 'medium' ? 'var(--warning)' : 'var(--success)')} />
                            Ưu tiên: {task.priority === 'high' ? 'Khẩn cấp' : (task.priority === 'medium' ? 'Trung bình' : 'Thấp')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Single Item Quick Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost" onClick={() => handleRestoreSingle(task.id)} title="Khôi phục" style={{ padding: '0.35rem' }}>
                      <RefreshCw size={17} color="var(--success)" />
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleDeleteSingle(task.id)} title="Xóa vĩnh viễn" style={{ padding: '0.35rem' }}>
                      <Trash2 size={17} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .archive-item:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(168, 85, 247, 0.4) !important;
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
