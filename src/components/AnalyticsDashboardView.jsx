import React, { useMemo } from 'react';
import { Trophy, Flame, Target, Award, TrendingUp, CheckCircle2, Clock, Zap, Star, ShieldCheck, BarChart3, PieChart } from 'lucide-react';

export default function AnalyticsDashboardView({ tasks = [], columns = [] }) {
  // Compute Key Analytics Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;
    let highPriorityCount = 0;
    let totalSubtasks = 0;
    let completedSubtasks = 0;

    const now = new Date();

    tasks.forEach(t => {
      const col = columns.find(c => c.id === t.columnId);
      const isDone = col ? (col.id === 'done' || col.id.endsWith('_done') || col.title === 'Hoàn thành') : false;
      const isInProg = col ? (col.id === 'in-progress' || col.id.endsWith('_in-progress') || col.title === 'Đang làm') : false;

      if (isDone) completedCount++;
      else if (isInProg) inProgressCount++;

      if (t.dueDate && new Date(t.dueDate) < now && !isDone) {
        overdueCount++;
      }

      if (t.priority === 'urgent' || t.priority === 'high') {
        highPriorityCount++;
      }

      if (t.subtasks && t.subtasks.length > 0) {
        totalSubtasks += t.subtasks.length;
        completedSubtasks += t.subtasks.filter(st => st.completed).length;
      }
    });

    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const subtaskRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    // Gamification Points Calculation
    // Base 50 points per task done + 10 points per subtask done + 100 bonus for zero overdue
    const xpPoints = (completedCount * 50) + (completedSubtasks * 10) + (overdueCount === 0 && completedCount > 0 ? 100 : 0);
    const userLevel = Math.floor(xpPoints / 200) + 1;
    const currentLevelProgress = Math.round(((xpPoints % 200) / 200) * 100);

    // Dynamic Badges
    const badges = [
      { id: 'first_step', title: 'Khởi Đầu Năng Nổ', desc: 'Hoàn thành công việc đầu tiên', icon: '🚀', unlocked: completedCount >= 1 },
      { id: 'master_focus', title: 'Bậc Thầy Tập Trung', desc: 'Đạt trên 50% tiến độ hoàn thành', icon: '🎯', unlocked: completionRate >= 50 },
      { id: 'streak_flame', title: 'Ngọn Lửa Chuỗi Ngày', desc: 'Không có công việc nào bị quá hạn', icon: '🔥', unlocked: overdueCount === 0 && total > 0 },
      { id: 'subtask_hero', title: 'Chiến Binh Chi Tiết', desc: 'Hoàn thành 5 công việc con', icon: '⚡', unlocked: completedSubtasks >= 5 },
      { id: 'level_five', title: 'Huyền Thoại Năng Suất', desc: 'Đạt Level 3 trở lên', icon: '👑', unlocked: userLevel >= 3 }
    ];

    return {
      total,
      completedCount,
      inProgressCount,
      overdueCount,
      highPriorityCount,
      completionRate,
      subtaskRate,
      xpPoints,
      userLevel,
      currentLevelProgress,
      badges
    };
  }, [tasks, columns]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner: Gamification User Level & XP Progress */}
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.2) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(139, 92, 246, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 6px 20px rgba(168, 85, 247, 0.4)'
              }}
            >
              👑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Cấp Độ Năng Suất: <span style={{ color: 'var(--primary)' }}>Level {metrics.userLevel}</span>
                </h2>
                <span style={{ fontSize: '0.8rem', padding: '2px 10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: 'var(--warning)', fontWeight: 700 }}>
                  ⚡ {metrics.xpPoints} XP
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Tích lũy kinh nghiệm từ việc hoàn thành công việc đúng hạn!
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={24} color="#f97316" />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)' }}>
              {metrics.overdueCount === 0 ? 'Chuỗi Phong Độ Tốt 🔥' : `${metrics.completedCount} Tác vụ Xong`}
            </span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
            <span>Tiến trình lên Level {metrics.userLevel + 1}</span>
            <span>{metrics.xpPoints % 200} / 200 XP ({metrics.currentLevelProgress}%)</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'var(--input-bg, rgba(0,0,0,0.2))', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div 
              style={{
                width: `${metrics.currentLevelProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                borderRadius: '10px',
                transition: 'width 0.6s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--glass-card-bg)', borderRadius: '18px', border: '1px solid var(--glass-border)', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--primary)' }}>
            <Target size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng công việc</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.total}</h3>
          </div>
        </div>

        <div style={{ background: 'var(--glass-card-bg)', borderRadius: '18px', border: '1px solid var(--glass-border)', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tỷ lệ hoàn thành</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{metrics.completionRate}%</h3>
          </div>
        </div>

        <div style={{ background: 'var(--glass-card-bg)', borderRadius: '18px', border: '1px solid var(--glass-border)', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--info)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đang thực hiện</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)' }}>{metrics.inProgressCount}</h3>
          </div>
        </div>

        <div style={{ background: 'var(--glass-card-bg)', borderRadius: '18px', border: '1px solid var(--glass-border)', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quá hạn</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{metrics.overdueCount}</h3>
          </div>
        </div>
      </div>

      {/* Badges & Achievements Gallery */}
      <div 
        style={{
          background: 'var(--glass-card-bg)',
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
          padding: '24px'
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award color="var(--warning, #f59e0b)" /> Bộ Huy Hiệu Danh Dự (Achievements)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {metrics.badges.map(badge => (
            <div
              key={badge.id}
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: badge.unlocked ? 'rgba(168, 85, 247, 0.15)' : 'var(--input-bg, rgba(0,0,0,0.03))',
                border: badge.unlocked ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--glass-border)',
                opacity: badge.unlocked ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.25s ease'
              }}
            >
              <div 
                style={{
                  fontSize: '1.8rem',
                  filter: badge.unlocked ? 'none' : 'grayscale(100%)',
                  padding: '8px',
                  borderRadius: '12px',
                  background: 'var(--input-bg, rgba(0,0,0,0.1))'
                }}
              >
                {badge.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: badge.unlocked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {badge.title}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {badge.desc}
                </div>
                <span 
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    background: badge.unlocked ? 'rgba(16, 185, 129, 0.2)' : 'var(--glass-border)',
                    color: badge.unlocked ? 'var(--success)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  {badge.unlocked ? '✓ Đã mở khóa' : '🔒 Khóa'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
