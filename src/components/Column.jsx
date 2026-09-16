import React, { useMemo, useState } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { Edit2, Trash2, Check, X } from 'lucide-react';

export default function Column({ column, tasks, onEditTask, selectedTaskIds = [], onSelectTask, onOpenEditModal, onDeleteColumn }) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const isFixedColumn = column.isDefault || ['todo', 'in-progress', 'done'].some(id => column.id === id || column.id.endsWith('_' + id));

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          width: '280px',
          minWidth: '280px',
          minHeight: '500px',
          background: 'rgba(30, 41, 59, 0.3)',
          border: '2px solid var(--primary)',
          borderRadius: '8px',
          opacity: 0.4,
        }}
      ></div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="glass-panel kanban-column"
      style={{
        ...style,
        width: '280px',
        minWidth: '280px',
        maxHeight: '100%',
        minHeight: '200px',
        background: 'var(--glass-card-bg, rgba(30, 41, 59, 0.5))',
        padding: '1rem',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${column.color || '#64748b'}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <h3 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 700, 
              margin: 0, 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.4rem',
              color: column.color || '#fff',
              letterSpacing: '0.3px',
              textShadow: `0 0 10px ${column.color || '#3b82f6'}44`,
              minWidth: 0,
              width: '100%',
            }}
          >
            <span 
              style={{ 
                width: '9px', 
                height: '9px', 
                borderRadius: '50%', 
                background: column.color || '#fff', 
                boxShadow: `0 0 8px ${column.color || '#fff'}`,
                display: 'inline-block',
                flexShrink: 0,
                marginTop: '0.4rem',
              }} 
            />
            <span
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                lineHeight: '1.3',
                minWidth: 0,
                flex: '1 1 auto',
              }}
              title={column.title}
            >
              {column.title}
            </span>
            <span 
              style={{ 
                marginLeft: '2px', 
                padding: '2px 8px', 
                background: `${column.color || '#fff'}22`, 
                border: `1px solid ${column.color || '#fff'}44`,
                borderRadius: '12px', 
                fontSize: '0.8rem', 
                fontWeight: 600,
                color: column.color || '#fff',
                flexShrink: 0,
                marginTop: '0.1rem',
              }}
            >
              {tasks.length}
            </span>
          </h3>
        </div>
        
        {!isFixedColumn && (
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }} onClick={() => onOpenEditModal?.(column)} title="Sửa cột">
              <Edit2 size={14} />
            </button>
            <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }} onClick={() => onDeleteColumn?.(column.id)} title="Xóa cột">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="column-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <SortableContext items={taskIds}>
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              column={column}
              onEdit={() => onEditTask?.(task)} 
              isSelected={selectedTaskIds.includes(task.id)}
              onSelectTask={onSelectTask}
            />
          ))}
        </SortableContext>
      </div>
      <style>{`
        .column-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .column-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .column-scroll::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb, rgba(0,0,0,0.25));
          border-radius: 4px;
        }
        .column-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover, rgba(0,0,0,0.4));
        }
      `}</style>
    </div>
  );
}
