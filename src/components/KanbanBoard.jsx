import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import Column from './Column';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

export default function KanbanBoard({ 
  tasks, setTasks, columns, setColumns, onEditTask, onUpdateTask,
  selectedTaskIds = [], onSelectTask, onAddColumn, onEditColumn, onDeleteColumn 
}) {
  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);
  
  const [activeColumn, setActiveColumn] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newColTitle.trim()) return;
    onAddColumn(newColTitle.trim(), '#8b5cf6');
    setNewColTitle('');
    setIsAdding(false);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="board-container" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem', width: '100%', height: '100%', alignItems: 'stretch' }}>
        <SortableContext items={columnsId}>
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={tasks.filter((task) => task.columnId === col.id)}
              onEditTask={onEditTask}
              selectedTaskIds={selectedTaskIds}
              onSelectTask={onSelectTask}
              onEditColumn={onEditColumn}
              onDeleteColumn={onDeleteColumn}
            />
          ))}
        </SortableContext>
        
        {isAdding ? (
          <form 
            onSubmit={handleAddSubmit}
            style={{
              minWidth: '280px',
              padding: '1rem',
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <input 
              type="text" 
              placeholder="Tên cột mới..." 
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              className="input"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => { setIsAdding(false); setNewColTitle(''); }}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                Lưu
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setIsAdding(true)}
            style={{
              minWidth: '280px',
              height: 'fit-content',
              padding: '1rem',
              background: 'rgba(255,255,255,0.02)',
              border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <Plus size={20} /> Thêm Cột Mới
          </button>
        )}
      </div>

      <DragOverlay>
        {activeColumn && (
          <Column
            column={activeColumn}
            tasks={tasks.filter((task) => task.columnId === activeColumn.id)}
          />
        )}
        {activeTask && <TaskCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );

  function onDragStart(event) {
    if (event.active.data.current?.type === 'Column') {
      setActiveColumn(event.active.data.current.column);
      return;
    }
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  function onDragEnd(event) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAColumn = active.data.current?.type === 'Column';
    if (isActiveAColumn) {
      setColumns((columns) => {
        const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
        const overColumnIndex = columns.findIndex((col) => col.id === overId);
        return arrayMove(columns, activeColumnIndex, overColumnIndex);
      });
    }
  }

  function onDragOver(event) {
    // We removed searchTerm from KanbanBoard, so we don't need to block drag on search anymore.
    // However, dragging while filtering by priority/status might still cause index mismatch if we aren't careful, 
    // but dnd-kit arrayMove on the full `tasks` list will work fine.

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === 'Task';
    const isOverATask = over.data.current?.type === 'Task';
    const isOverAColumn = over.data.current?.type === 'Column';

    if (!isActiveATask) return;

    if (isActiveATask && isOverATask) {
      if (setTasks) {
        setTasks((prevTasks) => {
          const activeIndex = prevTasks.findIndex((t) => t.id === activeId);
          const overIndex = prevTasks.findIndex((t) => t.id === overId);

          if (prevTasks[activeIndex].columnId !== prevTasks[overIndex].columnId) {
            const newTasks = [...prevTasks];
            newTasks[activeIndex].columnId = prevTasks[overIndex].columnId;
            if (onUpdateTask) onUpdateTask(newTasks[activeIndex]);
            return arrayMove(newTasks, activeIndex, overIndex);
          }
          return arrayMove(prevTasks, activeIndex, overIndex);
        });
      }
    }

    if (isActiveATask && isOverAColumn) {
      if (setTasks) {
        setTasks((prevTasks) => {
          const activeIndex = prevTasks.findIndex((t) => t.id === activeId);
          const newTasks = [...prevTasks];
          newTasks[activeIndex].columnId = overId;
          if (onUpdateTask) onUpdateTask(newTasks[activeIndex]);
          return arrayMove(newTasks, activeIndex, activeIndex);
        });
      }
    }
  }
}
