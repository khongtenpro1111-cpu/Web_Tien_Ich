/* Bản quyền thuộc về TKyl - Copyright © TKyl */
import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import ArchiveView from './components/ArchiveView';
import AuthScreen from './components/AuthScreen';
import TaskModal from './components/TaskModal';
import UserProfileModal from './components/UserProfileModal';
import ConfirmModal from './components/ConfirmModal';
import { Calendar, Bell, Plus, Search, Trash2, MoveRight, Star, Filter, LayoutGrid, CalendarDays, Archive, LogOut } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';

const initialColumns = [
  { id: 'todo', title: 'Cần làm', color: '#64748b', order: 0 },
  { id: 'in-progress', title: 'Đang làm', color: '#3b82f6', order: 1 },
  { id: 'done', title: 'Hoàn thành', color: '#10b981', order: 2 },
];

const initialTasks = [
  { id: '1', columnId: 'todo', title: 'Thiết kế giao diện', content: 'Làm giao diện dark mode', priority: 'high', subtasks: [] },
  { id: '2', columnId: 'todo', title: 'Học React', content: 'Học về hooks', priority: 'medium', subtasks: [] },
];

function App() {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Authentication Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'calendar'
  const [loading, setLoading] = useState(true);

  // Firestore Sync for Scoped Data
  useEffect(() => {
    if (!currentUser) {
      setColumns([]);
      setTasks([]);
      return;
    }

    // Migrate old orphaned tasks/columns that don't have a userId yet
    const migrateOrphanedData = async () => {
      try {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        tasksSnap.forEach(d => {
          const data = d.data();
          let updates = {};
          if (!data.userId) updates.userId = currentUser.uid;
          if (data.isArchived === undefined) updates.isArchived = false;
          if (Object.keys(updates).length > 0) {
            updateDoc(d.ref, updates);
          }
        });

        const colsSnap = await getDocs(collection(db, 'columns'));
        colsSnap.forEach(d => {
          if (!d.data().userId) {
            updateDoc(d.ref, { userId: currentUser.uid });
          }
        });
      } catch (e) {
        console.error("Migration error:", e);
      }
    };
    migrateOrphanedData();

    const qCols = query(collection(db, 'columns'), where('userId', '==', currentUser.uid));
    const unsubscribeColumns = onSnapshot(qCols, (snapshot) => {
      if (snapshot.empty) {
        // Migrate columns from localStorage or use initialColumns
        const localCols = localStorage.getItem('kanban-columns');
        const parsedCols = localCols ? JSON.parse(localCols) : initialColumns;
        parsedCols.forEach(col => {
          setDoc(doc(db, 'columns', col.id), { ...col, userId: currentUser.uid });
        });
      } else {
        const colsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        colsData.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : initialColumns.findIndex(c => c.id === a.id);
          const orderB = b.order !== undefined ? b.order : initialColumns.findIndex(c => c.id === b.id);
          return orderA - orderB;
        });
        setColumns(colsData);
      }
    }, (error) => {
      console.error("Lỗi tải cột:", error);
      setLoading(false);
    });

    const qTasks = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      if (snapshot.empty) {
        // Cứu dữ liệu cũ từ localStorage nếu Firestore trống (Khắc phục lỗi mất dữ liệu do chưa bật DB)
        const localTasks = localStorage.getItem('kanban-tasks');
        if (localTasks) {
          try {
            const parsed = JSON.parse(localTasks);
            parsed.forEach(t => {
              const { id, ...taskData } = t;
              // Clean undefined
              const cleanTask = { ...taskData, userId: currentUser.uid, isArchived: false, notified: false };
              Object.keys(cleanTask).forEach(key => {
                if (cleanTask[key] === undefined) delete cleanTask[key];
              });
              addDoc(collection(db, 'tasks'), cleanTask).catch(e => console.error(e));
            });
            // Xóa localStorage sau khi đã cứu thành công (tuỳ chọn, tạm thời giữ lại để an toàn)
          } catch (e) {
            console.error("Lỗi phục hồi tasks:", e);
          }
        }
      }
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tasksData = allTasks.filter(t => t.isArchived !== true); // Filter archived on client side
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi tải công việc:", error);
      setLoading(false);
    });

    // Fallback để tránh bị treo màn hình tải
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubscribeColumns();
      unsubscribeTasks();
      clearTimeout(fallbackTimer);
    };
  }, [currentUser]);

  // Audio reminder effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let hasOverdue = false;
      let newTasks = [...tasks];
      let changed = false;

      newTasks.forEach(task => {
        if (task.dueDate && !task.notified) {
          const due = new Date(task.dueDate);
          if (now >= due && task.columnId !== 'done') {
            hasOverdue = true;
            task.notified = true;
            changed = true;
            toast(`Đến hạn: ${task.title}`, {
              icon: '⏰',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
                border: '1px solid #ef4444'
              },
              duration: 10000
            });
          }
        }
      });
      if (changed) setTasks(newTasks);
      
      if (hasOverdue) {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(e => console.log('Audio play failed', e));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  const handleSaveTask = async (taskData) => {
    try {
      const { id, ...dataToSave } = taskData;
      const cleanTask = { ...dataToSave, notified: false };
      Object.keys(cleanTask).forEach(key => {
        if (cleanTask[key] === undefined) delete cleanTask[key];
      });
      
      if (taskToEdit) {
        await updateDoc(doc(db, 'tasks', taskToEdit.id), cleanTask);
        toast.success('Đã cập nhật công việc!');
      } else {
        await addDoc(collection(db, 'tasks'), { ...cleanTask, isArchived: false, userId: currentUser.uid });
        toast.success('Đã tạo công việc mới!');
      }
    } catch (e) {
      toast.error('Lỗi khi lưu!');
      console.error(e);
    }
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    try {
      await signOut(auth);
      toast.success("Đã đăng xuất thành công");
    } catch (error) {
      toast.error("Lỗi khi đăng xuất!");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Bạn có chắc muốn xoá công việc này?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        toast.success('Đã xoá công việc!');
      } catch (e) {
        toast.error('Lỗi khi xoá!');
      }
    }
  };

  const handleAddColumn = async (title, color) => {
    try {
      const colId = title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order || 0)) : 0;
      await setDoc(doc(db, 'columns', colId), { title, color, order: maxOrder + 1, userId: currentUser.uid });
      toast.success('Đã thêm cột mới!');
    } catch (e) {
      toast.error('Lỗi thêm cột');
    }
  };

  const handleEditColumn = async (colId, newTitle, newColor) => {
    try {
      await updateDoc(doc(db, 'columns', colId), { title: newTitle, color: newColor });
    } catch (e) {
      toast.error('Lỗi sửa cột');
    }
  };

  const handleDeleteColumn = async (colId) => {
    if (window.confirm('Bạn có chắc xoá cột này? Các công việc sẽ mất theo.')) {
      try {
        const tasksInCol = tasks.filter(t => t.columnId === colId);
        for (const t of tasksInCol) {
          await deleteDoc(doc(db, 'tasks', t.id));
        }
        await deleteDoc(doc(db, 'columns', colId));
        toast.success('Đã xoá cột!');
      } catch (e) {
        toast.error('Lỗi xoá cột');
      }
    }
  };

  // Bulk Actions
  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn?`)) {
      for (const id of selectedTaskIds) {
        await deleteDoc(doc(db, 'tasks', id));
      }
      setSelectedTaskIds([]);
      toast.success('Đã xóa hàng loạt!');
    }
  };

  const handleBulkMove = async (targetCol) => {
    for (const id of selectedTaskIds) {
      await updateDoc(doc(db, 'tasks', id), { columnId: targetCol });
    }
    setSelectedTaskIds([]);
    toast.success('Đã di chuyển hàng loạt!');
  };

  const handleBulkArchive = async () => {
    for (const id of selectedTaskIds) {
      await updateDoc(doc(db, 'tasks', id), { isArchived: true });
    }
    setSelectedTaskIds([]);
    toast.success('Đã lưu trữ hàng loạt!');
  };

  const handleBulkPriority = async (e) => {
    const priority = e.target.value;
    for (const id of selectedTaskIds) {
      await updateDoc(doc(db, 'tasks', id), { priority });
    }
    setSelectedTaskIds([]);
    toast.success('Đã đổi độ ưu tiên hàng loạt!');
  };

  const alertCount = tasks.filter(t => t.dueDate && (new Date(t.dueDate) < new Date() || new Date(t.dueDate).toDateString() === new Date().toDateString()) && t.columnId !== 'done').length;

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const searchMatch = !searchTerm || task.title.toLowerCase().includes(searchTerm.toLowerCase()) || (task.content && task.content.toLowerCase().includes(searchTerm.toLowerCase()));
      const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
      let statusMatch = true;
      if (filterStatus === 'overdue') {
        statusMatch = task.dueDate && new Date(task.dueDate) < new Date() && task.columnId !== 'done';
      } else if (filterStatus === 'done') {
        statusMatch = task.columnId === 'done';
      }
      return searchMatch && priorityMatch && statusMatch;
    });
  }, [tasks, searchTerm, filterPriority, filterStatus]);

  if (authLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>;
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      <div className="sidebar">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '2rem', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(139,92,246,0.3)' }}>TaskMaster</h2>
        <button 
          className="btn btn-primary" 
          style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
          onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
        >
          <Plus size={20} /> Tạo Mới
        </button>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 0.5rem 0.5rem' }}>Góc nhìn</p>
          <button 
            className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start', opacity: viewMode === 'kanban' ? 1 : 0.7 }}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid size={18} /> Dạng Bảng (Kanban)
          </button>
          <button 
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start', opacity: viewMode === 'calendar' ? 1 : 0.7 }}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays size={18} /> Dạng Lịch (Calendar)
          </button>
          <button 
            className={`btn ${viewMode === 'archive' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start', opacity: viewMode === 'archive' ? 1 : 0.7 }}
            onClick={() => setViewMode('archive')}
          >
            <Archive size={18} /> Kho lưu trữ
          </button>
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 0.5rem 0.5rem' }}>Thống kê nhanh</p>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', pointerEvents: 'none' }}>
            <Calendar size={18} /> Hôm nay ({tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length})
          </button>
          <button 
            className={`btn btn-ghost`} 
            style={{ justifyContent: 'flex-start', pointerEvents: 'none' }}
          >
            <Bell size={18} /> 
            Đến hạn / Quá hạn ({alertCount})
            </button>
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © 2026 Bản quyền thuộc về TKyl
          </div>
        </div>
        
        <div className="main-content" style={{ position: 'relative' }}>
        <header className="header" style={{ padding: '0 2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, minWidth: '150px' }}>
            {viewMode === 'kanban' ? 'Bảng Công Việc' : 'Lịch Công Việc'}
          </h1>
          
          <div style={{ display: 'flex', flex: 1, gap: '1rem', alignItems: 'center', minWidth: '300px' }}>
            <div style={{ flex: 1, position: 'relative', maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="input" 
                placeholder="Tìm kiếm công việc..." 
                style={{ paddingLeft: '2.5rem', background: 'rgba(30,41,59,0.4)', borderRadius: '20px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(30,41,59,0.4)', padding: '0.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Filter size={16} color="var(--text-muted)" style={{ margin: '0.5rem' }} />
              <select className="input" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.25rem 0.5rem' }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="all">Mọi ưu tiên</option>
                <option value="high">🔥 Khẩn cấp</option>
                <option value="medium">⚡ Trung bình</option>
                <option value="low">🌱 Thấp</option>
              </select>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.25rem 0' }} />
              <select className="input" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.25rem 0.5rem' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Mọi trạng thái</option>
                <option value="overdue">🚨 Quá hạn</option>
                <option value="done">✅ Hoàn thành</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: 'rgba(30,41,59,0.4)',
              padding: '0.25rem 0.75rem 0.25rem 0.25rem',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                onClick={() => setIsProfileModalOpen(true)}
                title="Sửa hồ sơ"
              >
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--primary), var(--info))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {currentUser?.displayName ? currentUser.displayName[0] : (currentUser?.email ? currentUser.email[0] : 'U')}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.displayName || currentUser?.email || 'Người dùng'}
                </span>
              </div>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
              <div 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer'
                }}
                className="hover-danger"
                onClick={() => setIsLogoutModalOpen(true)}
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu từ Cloud...</h2>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard 
            tasks={filteredTasks} 
            setTasks={setTasks}
            columns={columns} 
            setColumns={setColumns}
            onUpdateTask={async (updatedTask) => {
              try {
                await updateDoc(doc(db, 'tasks', updatedTask.id), { columnId: updatedTask.columnId });
              } catch (e) {
                console.error("Lỗi cập nhật cột", e);
              }
            }}
            onEditTask={handleEditTask}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={toggleTaskSelection}
            onAddColumn={handleAddColumn}
            onEditColumn={handleEditColumn}
            onDeleteColumn={handleDeleteColumn}
          />
        ) : viewMode === 'archive' ? (
          <ArchiveView userId={currentUser.uid} />
        ) : (
          <CalendarView 
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onAddTask={(date) => {
              const prefilledDate = new Date(date);
              prefilledDate.setHours(12, 0, 0, 0);
              setTaskToEdit({ 
                title: '', 
                content: '', 
                columnId: columns[0]?.id || 'todo', 
                priority: 'medium',
                dueDate: prefilledDate.toISOString(),
                subtasks: []
              });
              setIsModalOpen(true);
            }}
            onUpdateTask={async (updatedTask) => {
              try {
                await updateDoc(doc(db, 'tasks', updatedTask.id), { dueDate: updatedTask.dueDate });
              } catch (e) {
                console.error("Lỗi cập nhật ngày", e);
              }
            }}
          />
        )}

        {viewMode === 'kanban' && selectedTaskIds.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-surface)', padding: '1rem 2rem', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '1.5rem', zIndex: 50,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontWeight: 'bold' }}>Đã chọn: {selectedTaskIds.length} thẻ</span>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="input" value="" onChange={(e) => { if(e.target.value) handleBulkMove(e.target.value) }} style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.2)' }}>
                <option value="" disabled>Di chuyển tới...</option>
                {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
              </select>
              <button className="btn" onClick={handleBulkArchive} style={{ background: 'var(--success)' }}>Lưu trữ</button>
              <button className="btn" onClick={handleBulkDelete} style={{ background: 'var(--danger)' }}><Trash2 size={16} /> Xoá</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={18} color="var(--text-muted)" />
              <select className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem' }} onChange={handleBulkPriority} value="">
                <option value="" disabled>Đổi ưu tiên...</option>
                <option value="high">🔥 Khẩn cấp</option>
                <option value="medium">⚡ Trung bình</option>
                <option value="low">🌱 Thấp</option>
              </select>
            </div>
            <button className="btn btn-ghost" onClick={() => setSelectedTaskIds([])}>Hủy chọn</button>
          </div>
        )}
      </div>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        columns={columns}
      />
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={currentUser} />
      <ConfirmModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?"
        confirmText="Đăng xuất"
      />
    </div>
  );
}

export default App;
