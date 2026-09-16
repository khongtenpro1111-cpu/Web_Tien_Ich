import React, { useMemo, useState } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { Edit2, Trash2, Check, X, GripVertical } from 'lucide-react';

export default function Column({ 
  column, 
  tasks, 
  onDeleteColumn, 
  onOpenEditModal, 
  onEditTask, 
  isFixedColumn = column.isDefault || ['todo', 'in-progress', 'done'].some(id => column.id === id || column.id.endsWith('_' + id)), 
  selectedTaskIds = [], 
  onSelectTask, 
  onStartFocus 
}) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

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
    disabled: isFixedColumn,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="glass-panel"
        style={{
          ...style,
          width: '280px',
          minWidth: '280px',
          height: '100%',
          maxHeight: '100%',
          opacity: 0.4,
          border: '2px dashed var(--primary)',
        }}
      />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isFixedColumn && (
            <button {...attributes} {...listeners} className="btn btn-ghost" style={{ cursor: 'grab', padding: '0.2rem' }}>
              <GripVertical size={16} />
            </button>
          )}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: column.color || '#64748b' }} />
            {column.title}
            <span
              style={{
                fontSize: '0.75rem',
                background: 'var(--input-bg)',
                padding: '0.1rem 0.4rem',
                borderRadius: '10px',
                color: 'var(--text-muted)',
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

      <div className="column-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, overflowY: 'auto', padding: '10px 6px 10px 4px', margin: '-6px 0' }}>
        <SortableContext items={taskIds}>
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              column={column}
              onEdit={() => onEditTask?.(task)} 
              isSelected={selectedTaskIds.includes(task.id)}
              onSelectTask={onSelectTask}
              onStartFocus={onStartFocus}
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
