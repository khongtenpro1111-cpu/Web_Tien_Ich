import React, { useState, useEffect } from 'react';
import { Plus, X, CheckSquare, Square } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function TaskModal({ isOpen, onClose, onSave, taskToEdit, columns = [], defaultPlanType = 'day' }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [columnId, setColumnId] = useState(columns[0]?.id || 'todo');
  const [priority, setPriority] = useState('medium');
  const [planType, setPlanType] = useState('day');
  const [subtasks, setSubtasks] = useState([]);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setContent(taskToEdit.content || '');
      setDueDate(taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().slice(0, 16) : '');
      setColumnId(taskToEdit.columnId || columns[0]?.id || 'todo');
      setPriority(taskToEdit.priority || 'medium');
      setPlanType(taskToEdit.planType || 'day');
      setSubtasks(taskToEdit.subtasks || []);
    } else {
      setTitle('');
      setContent('');
      setDueDate('');
      setColumnId(columns.length > 0 ? columns[0].id : 'todo');
      setPriority('medium');
      setPlanType(defaultPlanType || 'day');
      setSubtasks([]);
    }
  }, [taskToEdit, isOpen, columns, defaultPlanType]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: taskToEdit ? taskToEdit.id : undefined,
      title,
      content,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      columnId,
      priority,
      planType,
      subtasks,
    });
    onClose();
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { id: uuidv4(), title: '', completed: false }]);
  };

  const updateSubtask = (id, newTitle) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, title: newTitle } : st));
  };

  const toggleSubtask = (id) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const removeSubtask = (id) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--backdrop-bg, rgba(0,0,0,0.6))', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{taskToEdit ? 'Sửa Công Việc' : 'Thêm Công Việc Mới'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tiêu đề</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Trạng thái</label>
              <select className="input" value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Độ ưu tiên</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="high">🔥 Khẩn cấp</option>
                <option value="medium">⚡ Trung bình</option>
                <option value="low">🌱 Thấp</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Loại kế hoạch</label>
              <select className="input" value={planType} onChange={(e) => setPlanType(e.target.value)}>
                <option value="day">📅 Kế hoạch Ngày</option>
                <option value="week">🗂️ Kế hoạch Tuần</option>
                <option value="month">🗓️ Kế hoạch Tháng</option>
                <option value="year">📊 Kế hoạch Năm</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mô tả chi tiết</label>
            <textarea className="input" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ color: 'var(--text-muted)', margin: 0 }}>Công việc con (Checklist)</label>
              <button type="button" onClick={addSubtask} className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                <Plus size={16} style={{ marginRight: '0.25rem' }}/> Thêm
              </button>
            </div>
            
            {subtasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subtasks.map(st => (
                  <div key={st.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => toggleSubtask(st.id)} style={{ background: 'none', border: 'none', color: st.completed ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {st.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                    <input 
                      className="input" 
                      style={{ padding: '0.5rem', flex: 1, textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.7 : 1 }}
                      placeholder="Nội dung công việc con..." 
                      value={st.title} 
                      onChange={(e) => updateSubtask(st.id, e.target.value)} 
                    />
                    <button type="button" onClick={() => removeSubtask(st.id)} className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--danger)' }}>
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {subtasks.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có công việc con nào.</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Ngày giờ hết hạn (Nhắc nhở)</label>
            <input className="input" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary">Lưu công việc</button>
          </div>
        </form>
      </div>
    </div>
  );
}
