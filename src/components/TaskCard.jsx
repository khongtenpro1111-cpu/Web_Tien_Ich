import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createEvent } from 'ics';
import { Edit2, Calendar, CheckSquare, Bell, GripVertical, X, Zap } from 'lucide-react';
import { formatReminderText } from '../utils/reminderUtils';

export default function TaskCard({ task, column, onEdit, isSelected, onSelectTask, onStartFocus }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleExportICS = (e) => {
    e.stopPropagation();
    if (!task.dueDate) {
      alert("Vui lòng đặt ngày giờ hết hạn trước khi xuất lịch!");
      return;
    }
    const d = new Date(task.dueDate);
    const event = {
      start: [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()],
      duration: { hours: 1 },
      title: task.title,
      description: task.content,
    };

    createEvent(event, (error, value) => {
      if (error) return;
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${task.title}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          padding: '1rem',
          opacity: 0.3,
          border: '2px solid var(--primary)',
          height: '120px',
          background: 'rgba(30, 41, 59, 0.9)',
          borderRadius: '8px'
        }}
      />
    );
  }

  const isDone = task.columnId === 'done' || (typeof task.columnId === 'string' && task.columnId.endsWith('_done')) || (column && (column.id === 'done' || (typeof column.id === 'string' && column.id.endsWith('_done')) || column.title === 'Hoàn thành'));
  const now = new Date();
  const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = taskDueDate && !isDone && taskDueDate < now;
  const isDueToday = taskDueDate && !isDone && !isOverdue && taskDueDate.toDateString() === now.toDateString();
  const priorityClass = task.priority ? `tag-${task.priority}` : 'tag-medium';
  const priorityLabel = task.priority === 'high' ? '🔥 Khẩn cấp' : (task.priority === 'low' ? '🌱 Thấp' : '⚡ Trung bình');

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '0.75rem',
        cursor: 'default',
        touchAction: 'auto',
        position: 'relative',
        borderLeft: isOverdue ? '4px solid var(--danger)' : (isDueToday ? '4px solid #f59e0b' : '4px solid transparent'),
        boxShadow: isSelected ? '0 0 0 2px var(--primary)' : 'var(--shadow-lg)',
      }}
      className={`glass-panel card-hover task-card-item ${isOverdue ? 'overdue-pulse shake-animation' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {/* Drag Handle - chỉ kéo khi chạm vào icon này */}
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: 'grab',
              touchAction: 'none',
              padding: '0.25rem 0.15rem',
              borderRadius: '6px',
              color: 'var(--primary)',
              background: 'var(--input-bg)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              opacity: 0.85,
            }}
            title="Giữ và kéo để di chuyển"
          >
            <GripVertical size={16} />
          </div>
          {onSelectTask && (
            <input 
              type="checkbox" 
              checked={!!isSelected}
              onChange={(e) => { e.stopPropagation(); onSelectTask(task.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          )}
          {column && (
            <span
              title={column.title}
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: column.color || '#64748b',
                flexShrink: 0,
                boxShadow: `0 0 5px ${column.color || '#64748b'}88`,
              }}
            />
          )}
          <span className={`tag ${priorityClass}`}>{priorityLabel}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={(e) => { e.stopPropagation(); onStartFocus?.(task); }}
            className="btn btn-ghost" 
            style={{ padding: '0.25rem', color: 'var(--primary)' }}
            title="Vào Chế độ Tập trung (Focus Mode)"
          >
            <Zap size={14} />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="btn btn-ghost" 
            style={{ padding: '0.25rem' }}
            title="Sửa công việc"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={handleExportICS}
            className="btn btn-ghost" 
            style={{ padding: '0.25rem', color: 'var(--primary)' }}
            title="Xuất lịch .ics"
          >
            <Calendar size={14} />
          </button>
        </div>
      </div>
      
      <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>{task.title}</h4>
      
      {task.content && (
        <div style={{ marginBottom: '0.4rem' }}>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Xem chi tiết
          </button>
        </div>
      )}

      {totalSubtasks > 0 && (
        <div style={{ marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><CheckSquare size={11}/> Tiến độ ({completedSubtasks}/{totalSubtasks})</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}
      
      {task.dueDate && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--danger)' : (isDueToday ? 'var(--warning)' : 'var(--text-muted)'), display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: (isOverdue || isDueToday) ? 600 : 400 }}>
            {isOverdue || isDueToday ? (
              <Bell size={12} className={isOverdue ? 'bell-ringing-fast' : 'bell-ringing-slow'} />
            ) : (
              <Calendar size={12} />
            )}
            {new Date(task.dueDate).toLocaleString()}
          </div>
          {isOverdue && (
            <span style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              color: 'var(--danger)', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.7rem', 
              fontWeight: 800,
              border: '1px solid rgba(239, 68, 68, 0.5)',
              textTransform: 'uppercase',
              animation: 'pulse-border 1.5s infinite'
            }}>
              🚨 Quá hạn!
            </span>
          )}
          {isDueToday && (
            <span style={{ 
              background: 'rgba(245, 158, 11, 0.2)', 
              color: 'var(--warning)', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.7rem', 
              fontWeight: 800,
              border: '1px solid rgba(245, 158, 11, 0.5)',
              textTransform: 'uppercase'
            }}>
              ⏰ Đến hạn hôm nay!
            </span>
          )}
          {task.reminderOffset > 0 && !isOverdue && !isDueToday && (
            <span style={{ 
              background: 'rgba(168, 85, 247, 0.15)', 
              color: 'var(--primary)', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.68rem', 
              fontWeight: 600,
              border: '1px solid rgba(168, 85, 247, 0.3)',
              whiteSpace: 'nowrap'
            }}>
              🔔 {formatReminderText(task.reminderOffset)}
            </span>
          )}
        </div>
      )}

      {/* Hộp xem chi tiết công việc (Portal ra document.body) */}
      {isExpanded && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--backdrop-bg, rgba(0,0,0,0.6))', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
            padding: '0.75rem'
          }}
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%', maxWidth: '720px', height: '92vh',
              padding: '1rem', borderRadius: 'var(--radius-lg)',
              display: 'flex', flexDirection: 'column',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header compact */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`tag ${priorityClass}`} style={{ fontSize: '0.72rem' }}>{priorityLabel}</span>
                {task.dueDate && (
                  <span style={{ fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Bell size={12} /> {new Date(task.dueDate).toLocaleString()}
                  </span>
                )}
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => setIsExpanded(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <h3 style={{ margin: '0.5rem 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.3, flexShrink: 0 }}>{task.title}</h3>

            {/* Nội dung - chiếm toàn bộ không gian còn lại */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: 'auto',
              background: 'var(--input-bg)', padding: '0.85rem',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
              marginBottom: totalSubtasks > 0 ? '0.5rem' : '0'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {task.content}
              </p>
            </div>

            {/* Checklist (nếu có) */}
            {totalSubtasks > 0 && (
              <div style={{ flexShrink: 0, padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', maxHeight: '120px', overflowY: 'auto' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'block' }}>Checklist ({completedSubtasks}/{totalSubtasks})</span>
                {task.subtasks.map(st => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: st.completed ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: st.completed ? 'line-through' : 'none', padding: '0.1rem 0' }}>
                    <span>{st.completed ? '✅' : '▫️'}</span>
                    <span>{st.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', flexShrink: 0 }}>
              <button className="btn btn-primary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }} onClick={() => setIsExpanded(false)}>Đóng</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
