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
import { Calendar, Bell, Plus, Search, Trash2, MoveRight, Star, Filter, LayoutGrid, CalendarDays, Archive, LogOut, Menu, Sun, Moon } from 'lucide-react';
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
  const [userProfile, setUserProfile] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    type: 'danger',
    icon: null,
    onConfirm: () => {},
  });

  const triggerConfirm = (title, message, onConfirm, confirmText = 'Xác nhận', type = 'danger', icon = null) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      type,
      icon,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month' | 'year' | 'calendar' | 'archive'
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Firestore Sync for Scoped Data
  useEffect(() => {
    if (!currentUser) {
      setColumns([]);
      setTasks([]);
      setUserProfile(null);
      return;
    }

    const unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        setUserProfile(null);
      }
    });

    const migrateOrphanedData = async () => {
      try {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        tasksSnap.forEach(d => {
          const data = d.data();
          if (data.userId === currentUser.uid || !data.userId) {
            let updates = {};
            if (!data.userId) updates.userId = currentUser.uid;
            if (data.isArchived === undefined) updates.isArchived = false;
            // Migrate task's global default columnId to user-scoped columnId
            if (['todo', 'in-progress', 'done'].includes(data.columnId)) {
              updates.columnId = `${currentUser.uid}_${data.columnId}`;
            }
            if (Object.keys(updates).length > 0) {
              updateDoc(d.ref, updates);
            }
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
      const docs = snapshot.docs;
      const hasTodo = docs.some(d => d.id === `${currentUser.uid}_todo`);
      const hasInProgress = docs.some(d => d.id === `${currentUser.uid}_in-progress`);
      const hasDone = docs.some(d => d.id === `${currentUser.uid}_done`);

      // Self-healing: If user is missing ALL 3 default columns
      if (!hasTodo && !hasInProgress && !hasDone) {
        const localCols = localStorage.getItem('kanban-columns');
        const parsedCols = localCols ? JSON.parse(localCols) : initialColumns;
        parsedCols.forEach(col => {
          const uniqueId = `${currentUser.uid}_${col.id}`;
          setDoc(doc(db, 'columns', uniqueId), { 
            ...col, 
            id: uniqueId, 
            userId: currentUser.uid,
            isDefault: true,
          });
        });
      } else {
        const colsData = docs.map(d => {
          const data = { id: d.id, ...d.data() };
          // Mark default columns
          const baseId = d.id.replace(`${currentUser.uid}_`, '');
          if (['todo', 'in-progress', 'done'].includes(baseId)) {
            data.isDefault = true;
          }
          return data;
        });
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
               if (['todo', 'in-progress', 'done'].includes(cleanTask.columnId)) {
                 cleanTask.columnId = `${currentUser.uid}_${cleanTask.columnId}`;
               }
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
      unsubscribeUser();
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
          const column = columns.find(c => c.id === task.columnId);
          const isDoneColumn = column ? (column.id === 'done' || column.id.endsWith('_done') || column.title === 'Hoàn thành') : false;

          if (now >= due && !isDoneColumn) {
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
  }, [tasks, columns]);

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

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setCurrentUser({ ...auth.currentUser });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Đã đăng xuất thành công");
    } catch (error) {
      toast.error("Lỗi khi đăng xuất!");
    }
  };

  const handleDeleteTask = (taskId) => {
    triggerConfirm(
      'Xóa công việc',
      'Bạn có chắc muốn xoá công việc này không?',
      async () => {
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
          toast.success('Đã xoá công việc!');
        } catch (e) {
          toast.error('Lỗi khi xoá!');
        }
      }
    );
  };

  const handleAddColumn = async (title, color) => {
    try {
      const currentPlanType = ['day', 'week', 'month', 'year'].includes(viewMode) ? viewMode : 'day';
      const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order || 0)) : 0;
      await addDoc(collection(db, 'columns'), { title, color, order: maxOrder + 1, userId: currentUser.uid, planType: currentPlanType });
      toast.success('Đã thêm cột mới!');
    } catch (e) {
      console.error('Lỗi thêm cột:', e);
      toast.error('Lỗi thêm cột: ' + e.message);
    }
  };

  const handleEditColumn = async (colId, newTitle, newColor) => {
    try {
      await updateDoc(doc(db, 'columns', colId), { title: newTitle, color: newColor });
    } catch (e) {
      toast.error('Lỗi sửa cột');
    }
  };

  const handleDeleteColumn = (colId) => {
    // Block deletion of default columns
    const col = columns.find(c => c.id === colId);
    if (col?.isDefault) {
      toast.error('Không thể xoá cột mặc định! Bạn chỉ có thể chỉnh sửa.');
      return;
    }

    triggerConfirm(
      'Xóa cột công việc',
      'Bạn có chắc xoá cột này? Các công việc trong cột sẽ được chuyển về cột "Cần làm".',
      async () => {
        try {
          const tasksInCol = tasks.filter(t => t.columnId === colId);
          // Find the default todo column to move tasks there
          const defaultTodoCol = columns.find(c => c.id === `${currentUser.uid}_todo`) || columns.find(c => c.isDefault);

          for (const t of tasksInCol) {
            if (defaultTodoCol) {
              await updateDoc(doc(db, 'tasks', t.id), { columnId: defaultTodoCol.id });
            } else {
              await deleteDoc(doc(db, 'tasks', t.id));
            }
          }

          await deleteDoc(doc(db, 'columns', colId));
          toast.success('Đã xoá cột! Công việc đã chuyển về "Cần làm".');
        } catch (e) {
          toast.error('Lỗi xoá cột');
        }
      }
    );
  };

  // Bulk Actions


  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkDelete = () => {
    triggerConfirm(
      'Xóa nhiều công việc',
      `Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn?`,
      async () => {
        try {
          for (const id of selectedTaskIds) {
            await deleteDoc(doc(db, 'tasks', id));
          }
          setSelectedTaskIds([]);
          toast.success('Đã xóa hàng loạt!');
        } catch (e) {
          toast.error('Lỗi xóa hàng loạt');
        }
      }
    );
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
      // Lọc theo loại kế hoạch (mặc định là 'day')
      const currentPlanType = task.planType || 'day';
      if (['day', 'week', 'month', 'year'].includes(viewMode) && currentPlanType !== viewMode) {
        return false;
      }

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
  }, [tasks, searchTerm, filterPriority, filterStatus, viewMode]);

  if (authLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>;
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 2000,
        }}
      />
      {isMobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
      )}
      <div className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '2rem', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(139,92,246,0.3)' }}>TaskMaster</h2>
        <button 
          className="btn btn-primary" 
          style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
          onClick={() => { setTaskToEdit(null); setIsModalOpen(true); setIsMobileSidebarOpen(false); }}
        >
          <Plus size={20} /> Tạo Mới
        </button>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 0.5rem 0.5rem' }}>Kế hoạch</p>
          <button 
            className={`btn ${viewMode === 'day' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => { setViewMode('day'); setIsMobileSidebarOpen(false); }}
          >
            <LayoutGrid size={18} /> Kế hoạch Ngày
          </button>
          <button 
            className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => { setViewMode('week'); setIsMobileSidebarOpen(false); }}
          >
            <LayoutGrid size={18} /> Kế hoạch Tuần
          </button>
          <button 
            className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => { setViewMode('month'); setIsMobileSidebarOpen(false); }}
          >
            <Calendar size={18} /> Kế hoạch Tháng
          </button>
          <button 
            className={`btn ${viewMode === 'year' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => { setViewMode('year'); setIsMobileSidebarOpen(false); }}
          >
            <Archive size={18} /> Kế hoạch Năm
          </button>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', margin: '1rem 0 0.5rem 0.5rem' }}>Góc nhìn</p>
          <button 
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => { setViewMode('calendar'); setIsMobileSidebarOpen(false); }}
          >
            <CalendarDays size={18} /> Lịch Công Việc
          </button>
          <button 
            className={`btn ${viewMode === 'archive' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => { setViewMode('archive'); setIsMobileSidebarOpen(false); }}
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
        <header className="header">
          <div className="header-brand">
            <button 
              className="menu-toggle"
              onClick={() => setIsMobileSidebarOpen(true)}
              style={{ marginRight: '0.25rem' }}
            >
              <Menu size={20} />
            </button>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, minWidth: '120px', margin: 0 }}>
              {viewMode === 'day' ? 'Kế hoạch Ngày' : 
               viewMode === 'week' ? 'Kế hoạch Tuần' : 
               viewMode === 'month' ? 'Kế hoạch Tháng' : 
               viewMode === 'year' ? 'Kế hoạch Năm' : 
               viewMode === 'calendar' ? 'Lịch Công Việc' : 'Kho lưu trữ'}
            </h1>
          </div>
          
          <div className="header-search-filters">
            <div style={{ flex: 1, position: 'relative', maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="input" 
                placeholder="Tìm kiếm công việc..." 
                style={{ paddingLeft: '2.5rem', background: 'var(--input-bg)', borderRadius: '20px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="header-filter-group" style={{ display: 'flex', gap: '0.5rem', background: 'var(--input-bg, rgba(30,41,59,0.4))', padding: '0.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Filter className="header-filter-icon" size={16} color="var(--text-muted)" style={{ margin: '0.5rem' }} />
              <select className="input header-filter-select" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.25rem 0.5rem' }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="all">Mọi ưu tiên</option>
                <option value="high">🔥 Khẩn cấp</option>
                <option value="medium">⚡ Trung bình</option>
                <option value="low">🌱 Thấp</option>
              </select>
              <div className="header-filter-divider" style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.25rem 0' }} />
              <select className="input header-filter-select" style={{ border: 'none', background: 'transparent', width: 'auto', padding: '0.25rem 0.5rem' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Mọi trạng thái</option>
                <option value="overdue">🚨 Quá hạn</option>
                <option value="done">✅ Hoàn thành</option>
              </select>
            </div>
          </div>

          <div className="header-user">
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsThemeMenuOpen(prev => !prev)}
                className="btn btn-ghost theme-toggle-btn"
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '50%', 
                  width: '40px', 
                  height: '40px', 
                  background: 'var(--input-bg, rgba(30,41,59,0.4))', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
                title="Đổi màu chủ đề"
              >
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--info))' }} />
              </button>

              {isThemeMenuOpen && (
                <div style={{
                  position: 'absolute', top: '120%', right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--glass-border, rgba(255,255,255,0.15))',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  minWidth: '170px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {[
                    { id: 'dark', label: '🌙 Tối (Mặc định)', color: '#8b5cf6' },
                    { id: 'light', label: '☀️ Sáng', color: '#7c3aed' },
                    { id: 'ocean', label: '🌊 Đại Dương', color: '#06b6d4' },
                    { id: 'emerald', label: '🌲 Lục Bảo', color: '#10b981' },
                    { id: 'sunset', label: '🌅 Hoàng Hôn', color: '#f97316' },
                    { id: 'rose', label: '🌸 Hoa Hồng (Sáng)', color: '#f43f5e' },
                    { id: 'cyberpunk', label: '⚡ Cyberpunk', color: '#ec4899' },
                    { id: 'sunshine', label: '🌻 Nắng Vàng Tươi (Sáng)', color: '#facc15' },
                    { id: 'amber', label: '🍯 Hổ Phách (Vàng Đậm)', color: '#eab308' },
                    { id: 'midnight', label: '🌌 Đêm Thâm Thẫm', color: '#6366f1' },
                    { id: 'mint', label: '🌿 Bạc Hà (Sáng)', color: '#0d9488' },
                    { id: 'crimson', label: '🔥 Đỏ Thẫm', color: '#dc2626' },
                    { id: 'lavender', label: '🪻 Oải Hương (Sáng)', color: '#a855f7' },
                    { id: 'forest', label: '🍃 Rừng Xanh', color: '#84cc16' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setIsThemeMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.4rem 0.6rem', borderRadius: '8px',
                        border: 'none', background: theme === t.id ? 'var(--input-bg, rgba(255,255,255,0.1))' : 'transparent',
                        color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left'
                      }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: 'var(--input-bg, rgba(30,41,59,0.4))',
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
                  background: (userProfile?.photoURL || currentUser?.photoURL) ? `url(${userProfile?.photoURL || currentUser?.photoURL}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary), var(--info))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  overflow: 'hidden'
                }}>
                  {!(userProfile?.photoURL || currentUser?.photoURL) && (currentUser?.displayName ? currentUser.displayName[0] : (currentUser?.email ? currentUser.email[0] : 'U'))}
                </div>
                <span className="header-username" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.displayName || currentUser?.email || 'Người dùng'}
                </span>
              </div>
              <div className="header-divider" style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
              <div 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer'
                }}
                className="hover-danger"
                onClick={() => triggerConfirm('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?', handleLogout, 'Đăng xuất', 'danger', <LogOut size={32} />)}
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
        ) : ['day', 'week', 'month', 'year'].includes(viewMode) ? (
          <KanbanBoard 
            tasks={filteredTasks} 
            setTasks={setTasks}
            columns={columns.filter(c => c.isDefault || c.planType === viewMode)} 
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

        {['day', 'week', 'month', 'year'].includes(viewMode) && selectedTaskIds.length > 0 && (
          <div 
            className="bulk-actions-toolbar"
            style={{
              position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--glass-bg, rgba(30, 41, 59, 0.95))',
              backdropFilter: 'blur(20px)',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 999,
              border: '1px solid var(--glass-border, rgba(255,255,255,0.15))',
              maxWidth: '92vw',
              overflowX: 'auto',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Đã chọn: {selectedTaskIds.length}</span>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            
            <select className="input" value="" onChange={(e) => { if(e.target.value) handleBulkMove(e.target.value) }} style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', background: 'rgba(59, 130, 246, 0.2)', width: 'auto' }}>
              <option value="" disabled>Di chuyển...</option>
              {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
            </select>

            <select className="input" style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} onChange={handleBulkPriority} value="">
              <option value="" disabled>Đổi ưu tiên...</option>
              <option value="high">🔥 Khẩn cấp</option>
              <option value="medium">⚡ Trung bình</option>
              <option value="low">🌱 Thấp</option>
            </select>

            <button className="btn" onClick={handleBulkArchive} style={{ background: 'var(--success)', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}>Lưu trữ</button>
            <button className="btn" onClick={handleBulkDelete} style={{ background: 'var(--danger)', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}><Trash2 size={14} /> Xoá</button>
            
            <button className="btn btn-ghost" onClick={() => setSelectedTaskIds([])} style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}>Hủy chọn</button>
          </div>
        )}
      </div>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        columns={columns}
        defaultPlanType={['day', 'week', 'month', 'year'].includes(viewMode) ? viewMode : 'day'}
      />
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        currentUser={currentUser} 
        userProfile={userProfile} 
        refreshUser={refreshUser}
        onLogout={() => triggerConfirm('Đổi tài khoản', 'Bạn có chắc chắn muốn đăng xuất để đổi tài khoản khác không?', handleLogout, 'Đăng xuất', 'danger', <LogOut size={32} />)}
      />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
        icon={confirmConfig.icon}
      />
      <button 
        className="mobile-fab" 
        onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
        title="Tạo mới công việc"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

export default App;
