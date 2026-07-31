import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
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
      <div className="board-container" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem', width: '100%', height: '100%', alignItems: 'flex-start' }}>
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
        
        <button 
          onClick={onAddColumn}
          style={{
            minWidth: '320px',
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
