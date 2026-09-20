import React, { useState, useMemo } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isBefore, startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';

export default function CalendarView({ tasks = [], columns = [], onEditTask, onAddTask, onUpdateTask }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [tasks]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onUpdateTask) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Keep the same time, just change the date
        const oldDate = new Date(task.dueDate);
        const newDate = new Date(day);
        newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
        
        onUpdateTask({
          ...task,
          dueDate: newDate.toISOString()
        });
      }
    }
  };

  const rowsCount = daysInMonth.length / 7;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 0 1rem 0' }}>
      <div className="calendar-month-header" style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        background: 'var(--glass-bg, rgba(30, 41, 59, 0.65))',
        backdropFilter: 'blur(20px)',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.1))'
      }}>
        {/* Left: Icon + Month/Year selects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <CalendarIcon size={20} color="var(--primary)" />
          <select
            value={currentMonth.getMonth()}
            onChange={(e) => {
              const d = new Date(currentMonth);
              d.setMonth(parseInt(e.target.value));
              setCurrentMonth(d);
            }}
            style={{
              background: 'var(--input-bg, rgba(255,255,255,0.08))',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
              color: 'var(--text-main)',
              borderRadius: '10px',
              padding: '0.3rem 0.5rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              textAlignLast: 'center',
            }}
          >
            {['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>/</span>
          <select
            value={currentMonth.getFullYear()}
            onChange={(e) => {
              const d = new Date(currentMonth);
              d.setFullYear(parseInt(e.target.value));
              setCurrentMonth(d);
            }}
            style={{
              background: 'var(--input-bg, rgba(255,255,255,0.08))',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
              color: 'var(--text-main)',
              borderRadius: '10px',
              padding: '0.3rem 0.5rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              textAlignLast: 'center',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Right: Today + Prev/Next */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
          <button
            className="btn btn-ghost"
            style={{ background: 'var(--input-bg, rgba(255,255,255,0.05))', borderRadius: '20px', padding: '0.4rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={goToToday}
          >Hôm nay</button>
          <div style={{ display: 'flex', background: 'var(--input-bg, rgba(255,255,255,0.05))', borderRadius: '20px', overflow: 'hidden' }}>
            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', borderRadius: 0 }} onClick={prevMonth}><ChevronLeft size={18} /></button>
            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', borderRadius: 0 }} onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', overflow: 'hidden', padding: 0, minHeight: 0 }}>
        {/* Header Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: 'var(--input-bg, rgba(0,0,0,0.2))', borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.1))' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
            <div key={day} style={{ padding: '0.75rem 0.25rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: `repeat(${rowsCount}, 1fr)`, gap: '1px', background: 'var(--glass-border, rgba(255,255,255,0.05))', minHeight: 0 }}>
          {daysInMonth.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const isPast = isBefore(day, startOfDay(new Date()));

            if (!isCurrentMonth) {
              return (
                <div 
                  key={day.toString()} 
                  style={{ 
                    background: 'var(--calendar-cell-inactive)', 
                    minHeight: '50px', 
                    opacity: 0.1,
                    cursor: 'default'
                  }}
                />
              );
            }

            return (
              <div 
                key={day.toString()} 
                className="calendar-cell"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day)}
                style={{ 
                  background: isToday ? 'var(--calendar-cell-today)' : 'var(--calendar-cell-active)', 
                  border: isToday ? '1px solid var(--primary)' : 'none',
                  minHeight: '50px', 
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget || e.target.classList.contains('calendar-cell-header') || e.target.classList.contains('calendar-tasks-scroll')) {
                    onAddTask(day);
                  }
                }}
              >
                <div className="calendar-cell-header" style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' 
                }}>
                  <div className="add-btn-hover" style={{ opacity: 0, transition: 'opacity 0.2s', color: 'var(--text-muted)' }}>
                    <Plus size={16} />
                  </div>
                  <div style={{
                    width: '28px', height: '28px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? 'var(--primary)' : 'transparent',
                    color: isToday ? '#fff' : (isPast ? 'var(--text-muted)' : 'var(--text-main)'),
                    fontWeight: isToday ? 'bold' : 'normal',
                    fontSize: '0.9rem',
                    boxShadow: isToday ? '0 0 15px rgba(139, 92, 246, 0.8)' : 'none'
                  }}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '2px' 
                }} className="calendar-tasks-scroll">
                  {dayTasks.map(task => {
                    const isDone = task.columnId === 'done' || (typeof task.columnId === 'string' && task.columnId.endsWith('_done')) || columns.some(c => c.id === task.columnId && c.title === 'Hoàn thành');
                    const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date();
                    
                    let bgVar, borderVar, icon;
                    if (isDone) {
                      bgVar = 'rgba(255,255,255,0.05)';
                      borderVar = 'rgba(255,255,255,0.1)';
                      icon = '✅';
                    } else if (isOverdue) {
                      bgVar = 'rgba(239, 68, 68, 0.15)';
                      borderVar = 'rgba(239, 68, 68, 0.4)';
                      icon = '🚨';
                    } else {
                      if (task.priority === 'high') { bgVar = 'rgba(239, 68, 68, 0.2)'; borderVar = 'rgba(239, 68, 68, 0.5)'; icon = '🔥'; }
                      else if (task.priority === 'low') { bgVar = 'rgba(34, 197, 94, 0.15)'; borderVar = 'rgba(34, 197, 94, 0.4)'; icon = '🌱'; }
                      else { bgVar = 'rgba(59, 130, 246, 0.15)'; borderVar = 'rgba(59, 130, 246, 0.4)'; icon = '⚡'; }
                    }

                    return (
                      <div 
                        key={task.id}
                        className="calendar-task-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                        style={{
                          padding: '6px 8px',
                          background: bgVar,
                          border: `1px solid ${borderVar}`,
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'grab',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textDecoration: isDone ? 'line-through' : 'none',
                          color: isDone ? 'var(--text-muted)' : 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(5px)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.transform = 'none'; 
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                        title={`${icon} ${task.title}\n⏰ ${format(new Date(task.dueDate), 'HH:mm')}`}
                      >
                        <span style={{ fontSize: '0.8rem' }}>{icon}</span>
                        <span style={{ fontWeight: '600', opacity: 0.9 }}>{format(new Date(task.dueDate), 'HH:mm')}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isDone ? 'normal' : '500' }}>{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .calendar-cell:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .calendar-cell:hover .add-btn-hover {
          opacity: 1 !important;
        }
        .calendar-tasks-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .calendar-tasks-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .calendar-tasks-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .calendar-tasks-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
