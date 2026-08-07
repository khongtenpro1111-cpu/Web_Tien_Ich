import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createEvent } from 'ics';
import { Edit2, Calendar, CheckSquare, Bell } from 'lucide-react';

export default function TaskCard({ task, column, onEdit, isSelected, onSelectTask }) {
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

  const isDone = task.columnId === 'done' || task.columnId.endsWith('_done');
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
  const isDueToday = task.dueDate && !isDone && !isOverdue && new Date(task.dueDate).toDateString() === new Date().toDateString();
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
        cursor: 'grab',
        touchAction: 'manipulation',
        position: 'relative',
        borderLeft: isOverdue ? '4px solid var(--danger)' : '4px solid transparent',
        boxShadow: isSelected ? '0 0 0 2px var(--primary)' : 'var(--shadow-lg)',
      }}
      {...attributes}
      {...listeners}
      className={`glass-panel card-hover task-card-item ${isOverdue ? 'overdue-pulse shake-animation' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: '0.4rem', fontWeight: 500, lineHeight: 1.4 }}>
        {task.content}
      </p>

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
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
              color: '#fca5a5', 
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
        </div>
      )}
    </div>
  );
}
