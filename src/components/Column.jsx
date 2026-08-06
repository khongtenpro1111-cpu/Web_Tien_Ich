import React, { useMemo, useState } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { Edit2, Trash2, Check, X } from 'lucide-react';

export default function Column({ column, tasks, onEditTask, selectedTaskIds = [], onSelectTask, onEditColumn, onDeleteColumn }) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState(column.color || '#64748b');

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

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      onEditColumn?.(column.id, editTitle.trim(), editColor);
    } else {
      setEditTitle(column.title);
      setEditColor(column.color || '#64748b');
    }
    setIsEditing(false);
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
        <div {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none', flex: 1, display: 'flex', alignItems: 'center' }}>
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <input 
                type="color" 
                value={editColor} 
                onChange={(e) => setEditColor(e.target.value)} 
                style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              />
              <input 
                autoFocus
                className="input"
                style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface)', flex: 1 }}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); }}
              />
            </div>
          ) : (
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', color: column.color || '#fff' }}>
              {column.title}
              <span style={{ marginLeft: '8px', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {tasks.length}
              </span>
            </h3>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
          {isEditing ? (
            <>
              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={handleSaveTitle}><Check size={16} color="var(--success)" /></button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => { setEditTitle(column.title); setEditColor(column.color || '#64748b'); setIsEditing(false); }}><X size={16} color="var(--danger)" /></button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }} onClick={() => setIsEditing(true)}>
                <Edit2 size={14} />
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }} onClick={() => onDeleteColumn?.(column.id)}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="column-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <SortableContext items={taskIds}>
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={() => onEditTask?.(task)} 
              isSelected={selectedTaskIds.includes(task.id)}
              onSelectTask={onSelectTask}
            />
          ))}
        </SortableContext>
      </div>
      <style>{`
        .column-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .column-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .column-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .column-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
