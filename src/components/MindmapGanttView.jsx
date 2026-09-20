import React, { useState, useMemo } from 'react';
import { GitFork, Calendar, CheckCircle2, Clock, AlertCircle, Sparkles, Move, Maximize2, Minimize2 } from 'lucide-react';

export default function MindmapGanttView({ tasks = [], columns = [], onEditTask }) {
  const [activeTab, setActiveTab] = useState('mindmap'); // 'mindmap' | 'gantt'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'priority' | 'status'

  // Map task status from column
  const getTaskStatus = (task) => {
    const col = columns.find(c => c.id === task.columnId);
    if (!col) return 'todo';
    if (col.id === 'done' || col.id.endsWith('_done') || col.title === 'Hoàn thành') return 'done';
    if (col.id === 'in-progress' || col.id.endsWith('_in-progress') || col.title === 'Đang làm') return 'in-progress';
    return 'todo';
  };

  // Dynamic Grouping for Mindmap Nodes
  const mindmapGroups = useMemo(() => {
    if (selectedCategory === 'priority') {
      return [
        { id: 'urgent', title: '🔥 Khẩn cấp (High)', color: '#ef4444', tasks: tasks.filter(t => t.priority === 'urgent' || t.priority === 'high') },
        { id: 'medium', title: '⚡ Trung bình (Medium)', color: '#f59e0b', tasks: tasks.filter(t => t.priority === 'medium') },
        { id: 'low', title: '🌱 Thấp (Low)', color: '#10b981', tasks: tasks.filter(t => t.priority === 'low' || !t.priority) }
      ];
    }
    if (selectedCategory === 'status') {
      return [
        { id: 'todo', title: '📌 Cần làm', color: '#f59e0b', tasks: tasks.filter(t => getTaskStatus(t) === 'todo') },
        { id: 'in-progress', title: '⚡ Đang thực hiện', color: '#3b82f6', tasks: tasks.filter(t => getTaskStatus(t) === 'in-progress') },
        { id: 'done', title: '✅ Hoàn thành', color: '#10b981', tasks: tasks.filter(t => getTaskStatus(t) === 'done') }
      ];
    }
    // Default Grouping by Column
    return columns.map(col => ({
      id: col.id,
      title: col.title,
      color: col.color || '#8b5cf6',
      tasks: tasks.filter(t => t.columnId === col.id)
    }));
  }, [tasks, columns, selectedCategory]);

  // Gantt Chart Calculations (Date sorting & timeline positions)
  const ganttTasks = useMemo(() => {
    const datedTasks = tasks.map(task => {
      const start = task.createdAt ? new Date(task.createdAt) : new Date();
      let due = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000 * 3);
      if (due < start) due = new Date(start.getTime() + 86400000);
      return {
        ...task,
        startDate: start,
        endDate: due,
        status: getTaskStatus(task)
      };
    });

    datedTasks.sort((a, b) => a.startDate - b.startDate);
    return datedTasks;
  }, [tasks, columns]);

  // Date range calculation for Gantt header
  const timelineDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = -2; i <= 12; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  return (
    <div className="mindmap-header-container" style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Top Header & Switcher */}
      <div className="mindmap-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitFork color="var(--primary, #a855f7)" /> 
            {activeTab === 'mindmap' ? 'Sơ Đồ Tư Duy (Mindmap)' : 'Biểu Đồ Tiến Độ (Gantt Chart)'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', display: 'block', marginTop: '4px' }}>
            {activeTab === 'mindmap' 
              ? 'Trực quan hóa cấu trúc dự án & mối liên hệ giữa các công việc' 
              : 'Theo dõi mốc thời gian, tiến độ hoàn thành & sự phục thuộc thời gian'}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="mindmap-controls-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
          {activeTab === 'mindmap' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mindmap-select-filter"
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'var(--input-bg, rgba(30,41,59,0.6))',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-main, #fff)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                flex: '1 1 180px',
                minWidth: '0'
              }}
            >
              <option value="all">Phân nhóm theo Cột Kanban</option>
              <option value="priority">Phân nhóm theo Độ Ưu Tiên</option>
              <option value="status">Phân nhóm theo Trạng Thái</option>
            </select>
          )}

          <div className="mindmap-tab-toggle" style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--glass-border)', flex: '1 1 auto', justifyContent: 'center' }}>
            <button
              className={`mindmap-tab-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('mindmap')}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                background: activeTab === 'mindmap' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                color: activeTab === 'mindmap' ? '#fff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
                justifyContent: 'center'
              }}
            >
              <GitFork size={15} /> Mindmap
            </button>
            <button
              className={`mindmap-tab-btn ${activeTab === 'gantt' ? 'active' : ''}`}
              onClick={() => setActiveTab('gantt')}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                background: activeTab === 'gantt' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                color: activeTab === 'gantt' ? '#fff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
                justifyContent: 'center'
              }}
            >
              <Calendar size={15} /> Gantt Chart
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div 
        className="mindmap-canvas-container"
        style={{
          background: 'var(--glass-card-bg)',
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
          padding: '16px',
          position: 'relative',
          overflowX: 'auto',
          overflowY: 'visible'
        }}
      >
        {activeTab === 'mindmap' ? (
          /* MINDMAP INTERACTIVE VIEW */
          <div className="mindmap-tree-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '30px' }}>
            {/* Root Central Node */}
            <div
              className="mindmap-root-node"
              style={{
                padding: '12px 24px',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.1rem',
                boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
                maxWidth: '100%',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={20} /> Project Task Master ({tasks.length} công việc)
            </div>

            {/* Branching Groups */}
            <div className="mindmap-branches" style={{ display: 'flex', justifyContent: 'center', gap: '20px', width: '100%', flexWrap: 'wrap' }}>
              {mindmapGroups.map(group => (
                <div
                  key={group.id}
                  className="mindmap-branch-column"
                  style={{
                    flex: '1 1 240px',
                    minWidth: '220px',
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* Category Node */}
                  <div
                    className="mindmap-category-node"
                    style={{
                      '--group-color': group.color,
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '16px',
                      background: 'var(--glass-card-bg)',
                      border: `2px solid ${group.color}`,
                      color: 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textAlign: 'center',
                      marginBottom: '20px',
                      boxShadow: `0 4px 15px ${group.color}33`,
                      cursor: 'pointer'
                    }}
                  >
                    {group.title} ({group.tasks.length})
                  </div>

                  {/* Connecting Line */}
                  <div 
                    style={{
                      width: '2px',
                      height: '16px',
                      background: group.color,
                      marginTop: '-16px',
                      marginBottom: '10px',
                      opacity: 0.6
                    }}
                  />

                  {/* Child Task Nodes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {group.tasks.map(task => (
                      <div
                        key={task.id}
                        className="mindmap-task-node"
                        onClick={() => onEditTask && onEditTask(task)}
                        style={{
                          '--group-color': group.color,
                          padding: '12px 14px',
                          borderRadius: '14px',
                          background: 'var(--glass-card-bg)',
                          border: '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                          {task.title}
                        </div>
                        {task.content && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.content}
                          </div>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '0.73rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks
                          </div>
                        )}
                      </div>
                    ))}

                    {group.tasks.length === 0 && (
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px' }}>
                        Chưa có công việc
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* GANTT TIMELINE CHART VIEW */
          <div className="gantt-chart-wrapper" style={{ minWidth: '700px' }}>
            {/* Timeline Header Days */}
            <div className="gantt-header-row" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tên công việc</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${timelineDays.length}, 1fr)`, gap: '4px', textAlign: 'center' }}>
                {timelineDays.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        fontSize: '0.7rem', 
                        color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: isToday ? 700 : 500,
                        background: isToday ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        padding: '4px 2px',
                        borderRadius: '6px'
                      }}
                    >
                      <div>{day.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                      <div style={{ fontSize: '0.78rem' }}>{day.getDate()}/{day.getMonth() + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ganttTasks.map(task => {
                const startDayIndex = timelineDays.findIndex(d => d.toDateString() === task.startDate.toDateString());
                const endDayIndex = timelineDays.findIndex(d => d.toDateString() === task.endDate.toDateString());

                const startIndex = startDayIndex >= 0 ? startDayIndex : 0;
                const endIndex = endDayIndex >= 0 ? endDayIndex : Math.min(startIndex + 2, timelineDays.length - 1);
                const spanDays = Math.max(1, endIndex - startIndex + 1);

                const statusColor = task.status === 'done' ? 'var(--success, #10b981)' : task.status === 'in-progress' ? 'var(--info, #3b82f6)' : 'var(--warning, #f59e0b)';

                return (
                  <div 
                    key={task.id} 
                    className="gantt-task-row"
                    style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--glass-border)' }}
                  >
                    {/* Left Task Label */}
                    <div 
                      onClick={() => onEditTask && onEditTask(task)}
                      style={{ cursor: 'pointer', paddingRight: '12px' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={11} /> {task.endDate.toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    {/* Right Timeline Bar Container */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${timelineDays.length}, 1fr)`, gap: '4px', position: 'relative', height: '36px', alignItems: 'center' }}>
                      {/* Background Day Grids */}
                      {timelineDays.map((_, i) => (
                        <div key={i} style={{ height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }} />
                      ))}

                      {/* Positioned Gantt Bar */}
                      <div
                        className="gantt-bar-item"
                        onClick={() => onEditTask && onEditTask(task)}
                        title={`${task.title} (${task.startDate.toLocaleDateString('vi-VN')} - ${task.endDate.toLocaleDateString('vi-VN')})`}
                        style={{
                          '--bar-color': statusColor,
                          position: 'absolute',
                          left: `calc(${(startIndex / timelineDays.length) * 100}% + 2px)`,
                          width: `calc(${(spanDays / timelineDays.length) * 100}% - 4px)`,
                          height: '28px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${statusColor}, ${statusColor}dd)`,
                          boxShadow: `0 4px 12px ${statusColor}44`,
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          zIndex: 5
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                        <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>{spanDays}d</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
