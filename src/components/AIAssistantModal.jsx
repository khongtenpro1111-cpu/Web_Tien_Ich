import React, { useState, useMemo } from 'react';
import { Sparkles, Bot, CheckCircle2, Loader2, X, Zap } from 'lucide-react';
import { generateTaskBreakdown, summarizeTasksAI, getPersonalizedSuggestions } from '../services/aiService';
import toast from 'react-hot-toast';

export default function AIAssistantModal({ isOpen, onClose, onToggle, onAddTask, tasks = [], columns = [] }) {
  const [goalInput, setGoalInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [activeTab, setActiveTab] = useState('breakdown'); // 'breakdown' | 'summary'

  // AI Tự động học và tạo gợi ý cá nhân hóa theo các công việc hiện tại của user
  const personalizedSuggestions = useMemo(() => {
    return getPersonalizedSuggestions(tasks);
  }, [tasks]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!goalInput.trim()) {
      toast.error('Vui lòng nhập mục tiêu công việc!');
      return;
    }

    setLoading(true);
    setAiResult(null);
    try {
      const result = await generateTaskBreakdown(goalInput, tasks);
      setAiResult(result);
      toast.success('AI đã phân tích & học theo thói quen của bạn!');
    } catch (err) {
      toast.error('Có lỗi xảy ra khi tạo kế hoạch AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAITask = () => {
    if (!aiResult) return;
    onAddTask(aiResult);
    toast.success('Đã thêm công việc do AI đề xuất vào bảng Kanban!');
    setAiResult(null);
    setGoalInput('');
    onClose();
  };

  return (
    <>
      {/* Khung Chat AI dạng Centered Modal khi mở */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--backdrop-bg, rgba(0, 0, 0, 0.65))',
            backdropFilter: 'blur(8px)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '88vh',
              background: 'var(--bg-surface, #1e1b4b)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(168, 85, 247, 0.25)',
              borderRadius: '20px',
              padding: '24px',
              color: 'var(--text-main, #fff)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              animation: 'popupZoom 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={22} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(90deg, #c084fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  TaskMaster AI Assistant
                </h3>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Trợ lý phân tích & Lập kế hoạch tự động</span>
              </div>
            </div>
            <button className="icon-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
            <button
              className={`ai-modal-tab ${activeTab === 'breakdown' ? 'active' : ''}`}
              onClick={() => setActiveTab('breakdown')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'breakdown' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                color: activeTab === 'breakdown' ? '#fff' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              ⚡ Tự động tách công việc
            </button>
            <button
              className={`ai-modal-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'summary' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                color: activeTab === 'summary' ? '#fff' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              📊 Tóm tắt tiến độ AI
            </button>
          </div>

          {activeTab === 'breakdown' ? (
            <div>
              <form onSubmit={handleGenerate}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                    Nhập mục tiêu hoặc công việc bạn muốn thực hiện:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lên kế hoạch thuyết trình NVDA, Viết báo cáo đồ án..."
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.95rem'
                    }}
                  />
                  {/* Gợi ý mẫu học từ công việc người dùng */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {personalizedSuggestions.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        className="ai-suggestion-chip"
                        onClick={() => setGoalInput(sample)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          color: '#e9d5ff',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        💡 {sample}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="ai-btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> AI đang phân tích dữ liệu...
                    </>
                  ) : (
                    <>
                      <Zap size={18} /> AI Phân tích & Tạo Subtasks thông minh
                    </>
                  )}
                </button>
              </form>

              {aiResult && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(168, 85, 247, 0.12)', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#c084fc', fontWeight: 700 }}>{aiResult.title}</h4>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: aiResult.priority === 'urgent' ? '#ef4444' : aiResult.priority === 'medium' ? '#f59e0b' : '#10b981',
                      color: '#fff',
                      fontWeight: 600
                    }}>
                      {aiResult.priority === 'urgent' ? '🔥 KHẨN CẤP' : aiResult.priority === 'medium' ? '⚡ TRUNG BÌNH' : '🌱 THẤP'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '0.78rem', opacity: 0.9, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      {aiResult.categoryTag}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      ⏱️ Thời gian: {aiResult.estimatedTime}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '14px', lineHeight: '1.5', whiteSpace: 'pre-line', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    {aiResult.content}
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📅 Lịch làm việc tự động (Auto-Scheduled Subtasks):
                      </strong>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                        ✨ AI xếp lịch rảnh
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {aiResult.subtasks.map((st, idx) => (
                        <div
                          key={st.id}
                          style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#e2e8f0', flex: 1 }}>
                              {idx + 1}. {st.title}
                            </span>
                            {st.durationMinutes && (
                              <span style={{ fontSize: '0.72rem', opacity: 0.8, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                ⏱️ {st.durationMinutes}p
                              </span>
                            )}
                          </div>
                          {st.timeDisplay && (
                            <div style={{ fontSize: '0.76rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span>🕒 Lịch đề xuất:</span>
                              <strong style={{ color: '#c084fc' }}>{st.timeDisplay}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleApplyAITask}
                    className="ai-btn-apply"
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={18} /> Thêm Kế Hoạch AI & Xếp Lịch Vào Kanban
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={18} /> Phân tích tình hình hiện tại
              </h4>
              <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.9 }}>
                {summarizeTasksAI(tasks, columns)}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Nút Bong bóng AI Avatar nổi góc dưới bên phải (Phía trên nút +) */}
      <button
        onClick={() => {
          if (onToggle) onToggle();
        }}
        title="Mở Trợ lý AI"
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          zIndex: 1001,
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(168, 85, 247, 0.5), 0 0 15px rgba(99, 102, 241, 0.4)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          outline: 'none'
        }}
        className="ai-floating-btn"
      >
        <Sparkles size={24} className="sparkle-rotate" />
        <span
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #1e1b4b'
          }}
        />
      </button>
    </>
  );
}
