import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, CheckSquare, Square, Sparkles, Loader2, Bell, ChevronDown, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { generateTaskBreakdown } from '../services/aiService';
import { REMINDER_OPTIONS, formatReminderText, getNotifyTime } from '../utils/reminderUtils';
import toast from 'react-hot-toast';

export default function TaskModal({ isOpen, onClose, onSave, taskToEdit, columns = [], defaultPlanType = 'day', existingTasks = [] }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reminderSelect, setReminderSelect] = useState(0);
  const [customNum, setCustomNum] = useState(1);
  const [customUnit, setCustomUnit] = useState(60); // 1: phút, 60: giờ, 1440: ngày, 10080: tuần
  const [columnId, setColumnId] = useState(columns[0]?.id || 'todo');
  const [priority, setPriority] = useState('medium');
  const [planType, setPlanType] = useState('day');
  const [subtasks, setSubtasks] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);

  const handleAiBreakdown = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập Tiêu đề công việc trước khi gọi AI!');
      return;
    }
    setAiLoading(true);
    try {
      const res = await generateTaskBreakdown(title, existingTasks);
      setSubtasks(res.subtasks || []);
      if (res.priority) setPriority(res.priority);
      if (res.dueDate && !dueDate) {
        setDueDate(toLocalISOString(res.dueDate));
      }
      if (res.content && !content) {
        setContent(res.content);
      }
      toast.success('AI đã tự động tạo Subtasks & Xếp lịch!');
    } catch (err) {
      toast.error('Không thể tạo kế hoạch AI lúc này.');
    } finally {
      setAiLoading(false);
    }
  };

  // Convert ISO date string / Date to local HTML datetime-local format YYYY-MM-DDTHH:mm
  const toLocalISOString = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setContent(taskToEdit.content || '');
      setDueDate(toLocalISOString(taskToEdit.dueDate));
      setColumnId(taskToEdit.columnId || columns[0]?.id || 'todo');
      setPriority(taskToEdit.priority || 'medium');
      setPlanType(taskToEdit.planType || 'day');
      setSubtasks(taskToEdit.subtasks || []);

      const offset = taskToEdit.reminderOffset !== undefined ? Number(taskToEdit.reminderOffset) : 0;
      const match = REMINDER_OPTIONS.find(opt => opt.value === offset);
      if (match) {
        setReminderSelect(offset);
      } else {
        setReminderSelect('custom');
        if (offset > 0 && offset % 10080 === 0) {
          setCustomNum(offset / 10080);
          setCustomUnit(10080);
        } else if (offset > 0 && offset % 1440 === 0) {
          setCustomNum(offset / 1440);
          setCustomUnit(1440);
        } else if (offset > 0 && offset % 60 === 0) {
          setCustomNum(offset / 60);
          setCustomUnit(60);
        } else {
          setCustomNum(offset || 1);
          setCustomUnit(1);
        }
      }
    } else {
      setTitle('');
      setContent('');
      setDueDate('');
      setReminderSelect(0);
      setCustomNum(1);
      setCustomUnit(60);
      setColumnId(columns.length > 0 ? columns[0].id : 'todo');
      setPriority('medium');
      setPlanType(defaultPlanType || 'day');
      setSubtasks([]);
    }
  }, [taskToEdit, isOpen, columns, defaultPlanType]);

  const handleColumnChange = (newColId) => {
    setColumnId(newColId);
    const selectedCol = columns.find(c => c.id === newColId);
    if (selectedCol && selectedCol.planType) {
      setPlanType(selectedCol.planType);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    let calculatedOffset = 0;
    if (dueDate) {
      if (reminderSelect === 'custom') {
        calculatedOffset = (Math.max(1, Number(customNum) || 1)) * Number(customUnit);
      } else {
        calculatedOffset = Number(reminderSelect) || 0;
      }
    }

    onSave({
      id: taskToEdit ? taskToEdit.id : undefined,
      title,
      content,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      reminderOffset: calculatedOffset,
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '0.75rem', overflowX: 'hidden'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.25rem', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)', margin: 'auto' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1.1rem' }}>{taskToEdit ? 'Sửa Công Việc' : 'Thêm Công Việc Mới'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tiêu đề</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Trạng thái</label>
              <select className="input" value={columnId} onChange={(e) => handleColumnChange(e.target.value)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}>
                {columns.map(col => {
                  const planLabel = col.planType === 'week' ? ' (Kế hoạch Tuần)' : (col.planType === 'month' ? ' (Kế hoạch Tháng)' : (col.planType === 'year' ? ' (Kế hoạch Năm)' : ''));
                  return <option key={col.id} value={col.id}>{col.title}{planLabel}</option>;
                })}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Độ ưu tiên</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}>
                <option value="high">🔥 Khẩn cấp</option>
                <option value="medium">⚡ Trung bình</option>
                <option value="low">🌱 Thấp</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loại kế hoạch</label>
              <select className="input" value={planType} onChange={(e) => setPlanType(e.target.value)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}>
                <option value="day">📅 Kế hoạch Ngày</option>
                <option value="week">🗂️ Kế hoạch Tuần</option>
                <option value="month">🗓️ Kế hoạch Tháng</option>
                <option value="year">📊 Kế hoạch Năm</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mô tả chi tiết</label>
            <textarea className="input" rows={2} value={content} onChange={(e) => setContent(e.target.value)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }} />
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Công việc con (Checklist)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleAiBreakdown}
                  disabled={aiLoading}
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.78rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.25))',
                    color: 'var(--primary)',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  AI Phân Rã & Xếp Lịch
                </button>
                <button type="button" onClick={addSubtask} className="btn btn-ghost" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                  <Plus size={14} style={{ marginRight: '0.2rem' }}/> Thêm
                </button>
              </div>
            </div>
            
            {subtasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {subtasks.map(st => (
                  <div key={st.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => toggleSubtask(st.id)} style={{ background: 'none', border: 'none', color: st.completed ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {st.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <input 
                      className="input" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', flex: 1, textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.7 : 1 }}
                      placeholder="Nội dung công việc con..." 
                      value={st.title} 
                      onChange={(e) => updateSubtask(st.id, e.target.value)} 
                    />
                    <button type="button" onClick={() => removeSubtask(st.id)} className="btn btn-ghost" style={{ padding: '0.35rem', color: 'var(--danger)' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {subtasks.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có công việc con nào.</div>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>📅 Ngày giờ hết hạn</label>
            <input className="input" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }} />
          </div>

          {dueDate && (
            <div style={{ padding: '0.75rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Bell size={15} color="var(--primary)" /> Thông báo nhắc nhở trước:
              </label>

              {/* Custom Selector Trigger Button */}
              <button
                type="button"
                className="input"
                onClick={() => setIsReminderDropdownOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {REMINDER_OPTIONS.find(opt => opt.value === reminderSelect)?.label || 'Chọn thời gian nhắc...'}
                </span>
                <ChevronDown size={16} style={{ opacity: 0.7, flexShrink: 0, marginLeft: '6px' }} />
              </button>

              {/* Centered Modal Picker Dropdown rendered via React Portal */}
              {isReminderDropdownOpen && createPortal(
                <div 
                  style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    padding: '1rem'
                  }}
                  onClick={() => setIsReminderDropdownOpen(false)}
                >
                  <div 
                    className="glass-panel"
                    style={{
                      width: '100%',
                      maxWidth: '320px',
                      maxHeight: '75vh',
                      overflowY: 'auto',
                      padding: '1rem',
                      borderRadius: '16px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                      animation: 'popupZoom 0.2s ease-out'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bell size={16} color="var(--primary)" /> Nhắc nhở trước
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setIsReminderDropdownOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {REMINDER_OPTIONS.map(opt => {
                        const isSelected = reminderSelect === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setReminderSelect(opt.value === 'custom' ? 'custom' : Number(opt.value));
                              setIsReminderDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justify: 'space-between',
                              width: '100%',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '10px',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                              background: isSelected ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                              color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                              fontWeight: isSelected ? 600 : 400,
                              fontSize: '0.88rem',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check size={16} color="var(--primary)" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>,
                document.body
              )}

              {reminderSelect === 'custom' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <input 
                    type="number" 
                    min="1" 
                    className="input" 
                    value={customNum} 
                    onChange={(e) => setCustomNum(e.target.value)} 
                    style={{ width: '90px', padding: '0.4rem 0.6rem', fontSize: '0.88rem' }} 
                  />
                  <select 
                    className="input" 
                    value={customUnit} 
                    onChange={(e) => setCustomUnit(Number(e.target.value))} 
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.88rem' }}
                  >
                    <option value={1}>Phút</option>
                    <option value={60}>Giờ</option>
                    <option value={1440}>Ngày</option>
                    <option value={10080}>Tuần</option>
                  </select>
                </div>
              )}

              {/* Computed Notification Time Preview */}
              {(() => {
                const activeOffset = reminderSelect === 'custom' ? (Math.max(1, Number(customNum) || 1)) * Number(customUnit) : Number(reminderSelect);
                const notifyTime = getNotifyTime(dueDate, activeOffset);
                if (!notifyTime) return null;
                return (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💡 Thông báo sẽ phát lúc:</span>
                    <strong>{notifyTime.toLocaleDateString('vi-VN')} {notifyTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                );
              })()}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '0.4rem 1rem', fontSize: '0.88rem' }}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.88rem' }}>Lưu công việc</button>
          </div>
        </form>
      </div>
    </div>
  );
}

