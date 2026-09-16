// AI Helper Service - Tích hợp AI Engine học thói quen người dùng (Personalized Adaptive AI)

// Danh sách từ dừng (stop words tiếng Việt & từ vô nghĩa ngắn)
const STOP_WORDS = new Set([
  'lên', 'làm', 'xem', 'đọc', 'bài', 'khoa', 'kí', 'và', 'các', 'cho', 'với', 'trong',
  'theo', 'để', 'những', 'của', 'về', 'tại', 'đã', 'đang', 'sẽ', 'một', 'mới', 'báo', 'cáo'
]);

// Hàm trích xuất các chủ đề / từ khóa chủ đạo có ý nghĩa từ danh sách công việc của user
export const extractUserPatterns = (tasks = []) => {
  if (!tasks || tasks.length === 0) return { topKeywords: [], preferredPriority: 'medium', frequentSubtasks: [] };

  const keywordCount = {};
  let urgentCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  tasks.forEach((t) => {
    // Đếm độ ưu tiên hay dùng
    if (t.priority === 'urgent' || t.priority === 'high') urgentCount++;
    else if (t.priority === 'low') lowCount++;
    else mediumCount++;

    // Tách từ khóa trong tiêu đề
    if (t.title) {
      // Giữ nguyên các thuật ngữ viết hoa hoặc từ ghép có nghĩa (dài > 2 ký tự)
      const cleanTitle = t.title.replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi, ' ');
      const words = cleanTitle.split(/\s+/).filter(w => {
        const lower = w.toLowerCase();
        return w.length >= 3 && !STOP_WORDS.has(lower);
      });

      words.forEach(w => {
        // Chuẩn hóa định dạng từ khóa: Viết hoa từ có nghĩa
        const normalized = w.length <= 4 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        keywordCount[normalized] = (keywordCount[normalized] || 0) + 1;
      });
    }
  });

  // Độ ưu tiên người dùng hay đặt nhất
  let preferredPriority = 'medium';
  if (urgentCount >= mediumCount && urgentCount >= lowCount) preferredPriority = 'urgent';
  else if (lowCount > mediumCount && lowCount > urgentCount) preferredPriority = 'low';

  // Lấy ra các chủ đề/từ khóa xuất hiện nhiều nhất (Top keywords)
  const topKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  return {
    topKeywords,
    preferredPriority,
    totalTasksCount: tasks.length
  };
};

// Hàm tạo danh sách gợi ý cá nhân hóa dựa trên các công việc CHƯA HOÀN THÀNH của user
export const getPersonalizedSuggestions = (tasks = []) => {
  if (!tasks || tasks.length === 0) {
    return ['Viết báo cáo DACS', 'Lên kịch bản thuyết trình', 'Thiết kế UI Website', 'Ôn thi Tiếng Anh'];
  }

  // Lọc chỉ lấy các công việc chưa hoàn thành (bỏ qua các công việc ở cột Hoàn thành/Done)
  const activeTasks = tasks.filter(t => {
    const colId = t.columnId || '';
    return !(colId === 'done' || colId.endsWith('_done') || t.isArchived);
  });

  if (activeTasks.length === 0) {
    return ['Tạo kế hoạch học tập mới', 'Lên kịch bản công việc tuần', 'Rà soát mục tiêu tháng', 'Chuẩn bị bài thuyết trình'];
  }

  const suggestions = [];
  const existingTitles = activeTasks.map(t => t.title.toLowerCase());

  // Tìm các dạng công việc tương tự chưa hoàn thành hoặc gợi ý bước tiếp theo
  activeTasks.slice(-5).reverse().forEach(t => {
    const titleLower = t.title.toLowerCase();
    if (titleLower.includes('báo cáo') && !existingTitles.some(et => et.includes('thuyết trình báo cáo'))) {
      suggestions.push(`Thuyết trình ${t.title}`);
    } else if (titleLower.includes('thiết kế') && !existingTitles.some(et => et.includes('code giao diện'))) {
      suggestions.push(`Lập trình giao diện ${t.title.replace('thiết kế', '').trim()}`);
    } else if (titleLower.includes('học') || titleLower.includes('ôn')) {
      suggestions.push(`Làm bài tập ${t.title}`);
    } else {
      suggestions.push(`Hoàn thiện ${t.title}`);
    }
  });

  // Mẫu mặc định bổ sung nếu thiếu
  const defaultPresets = ['Viết báo cáo đồ án', 'Chuẩn bị Slide thuyết trình', 'Rà soát kế hoạch tuần'];
  defaultPresets.forEach(dp => {
    if (suggestions.length < 4 && !suggestions.includes(dp)) {
      suggestions.push(dp);
    }
  });

  return Array.from(new Set(suggestions)).slice(0, 4);
};

// Thuật toán Auto-Scheduler: Tự động quét lịch trống trong ngày/tuần để xếp lịch cho từng Subtask
export const autoScheduleSubtasks = (subtasks = [], existingTasks = [], baseStartDate = new Date()) => {
  // Lấy các khoảng thời gian đã bận từ existingTasks (những task có dueDate)
  const busySlots = existingTasks
    .filter(t => t.dueDate)
    .map(t => {
      const end = new Date(t.dueDate);
      const start = new Date(end.getTime() - (t.estimatedMinutes || 60) * 60 * 1000);
      return { start, end };
    });

  let currentPointer = new Date(baseStartDate);
  // Nếu đã qua 17:00 chiều hôm nay, chuyển sang 8:00 sáng hôm sau
  if (currentPointer.getHours() >= 17) {
    currentPointer.setDate(currentPointer.getDate() + 1);
    currentPointer.setHours(8, 0, 0, 0);
  } else if (currentPointer.getHours() < 8) {
    currentPointer.setHours(8, 0, 0, 0);
  } else {
    // Làm tròn lên khung giờ tiếp theo (ví dụ 9:15 -> 9:30)
    const mins = currentPointer.getMinutes();
    const roundedMins = mins <= 30 ? 30 : 60;
    if (roundedMins === 60) {
      currentPointer.setHours(currentPointer.getHours() + 1, 0, 0, 0);
    } else {
      currentPointer.setMinutes(30, 0, 0);
    }
  }

  return subtasks.map((st, idx) => {
    const durationMinutes = st.durationMinutes || 45; // Mặc định 45 phút nếu không khai báo
    
    // Tìm khung giờ trống kéo dài durationMinutes
    let slotFound = false;
    let slotStart = new Date(currentPointer);
    let slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    while (!slotFound) {
      // Giờ làm việc nằm trong khoảng 8:00 - 18:00
      if (slotEnd.getHours() > 18 || (slotEnd.getHours() === 18 && slotEnd.getMinutes() > 0)) {
        // Chuyển sang 8h sáng ngày tiếp theo
        slotStart.setDate(slotStart.getDate() + 1);
        slotStart.setHours(8, 0, 0, 0);
        slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
        continue;
      }

      // Kiểm tra xem slotStart -> slotEnd có va chạm với busySlots không
      const overlap = busySlots.some(b => slotStart < b.end && slotEnd > b.start);

      if (overlap) {
        // Nếu trùng lịch, nhích lên 30 phút và thử lại
        slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
        slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      } else {
        slotFound = true;
      }
    }

    // Cập nhật currentPointer cho subtask kế tiếp (nghỉ 15p giữa các subtask)
    currentPointer = new Date(slotEnd.getTime() + 15 * 60 * 1000);

    const pad = (n) => (n < 10 ? '0' + n : n);
    const timeStr = `${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())} - ${pad(slotEnd.getHours())}:${pad(slotEnd.getMinutes())}`;
    const dateStr = `${slotStart.getDate()}/${slotStart.getMonth() + 1}`;

    return {
      ...st,
      durationMinutes,
      scheduledStart: slotStart.toISOString(),
      scheduledEnd: slotEnd.toISOString(),
      timeDisplay: `${dateStr} (${timeStr})`
    };
  });
};

// AI Engine phân tích và tạo Subtasks thông minh + Auto-Schedule
export const generateTaskBreakdown = async (promptGoal, existingTasks = []) => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const lowerGoal = promptGoal.toLowerCase();
  const userPattern = extractUserPatterns(existingTasks);

  // 1. Phân tích độ ưu tiên
  let priority = userPattern.preferredPriority || 'medium';
  if (
    lowerGoal.includes('gấp') || lowerGoal.includes('ngay') || 
    lowerGoal.includes('báo cáo') || lowerGoal.includes('nộp') || 
    lowerGoal.includes('thi') || lowerGoal.includes('deadline') ||
    lowerGoal.includes('dacs') || lowerGoal.includes('dacn')
  ) {
    priority = 'urgent';
  } else if (
    lowerGoal.includes('đọc') || lowerGoal.includes('xem') || 
    lowerGoal.includes('rảnh') || lowerGoal.includes('tìm hiểu')
  ) {
    priority = 'low';
  }

  // 2. Phân tích ngữ cảnh & tạo Subtasks kèm thời lượng (phút)
  const relatedTask = existingTasks.find(t => 
    t.title && (t.title.toLowerCase().includes(lowerGoal) || lowerGoal.includes(t.title.toLowerCase()))
  );

  let categoryTag = '📌 Tổng quan';
  let estimatedTime = '2-3 giờ';
  let rawSubtasks = [];

  if (lowerGoal.includes('báo cáo') || lowerGoal.includes('dacs') || lowerGoal.includes('dacn') || lowerGoal.includes('đồ án')) {
    categoryTag = '🎓 Học tập & Nghiên cứu';
    estimatedTime = '3-4 giờ';
    rawSubtasks = [
      { id: 'sub-1', title: 'Thu thập thông tin & số liệu tài liệu tham khảo', durationMinutes: 45, completed: false },
      { id: 'sub-2', title: 'Xây dựng dàn ý chi tiết & các mục chính báo cáo', durationMinutes: 30, completed: false },
      { id: 'sub-3', title: 'Soạn thảo nội dung các chương chính & kết quả', durationMinutes: 90, completed: false },
      { id: 'sub-4', title: 'Rà soát lỗi chính tả, căn chỉnh chuẩn định dạng', durationMinutes: 30, completed: false },
      { id: 'sub-5', title: 'Xuất file PDF & gửi giảng viên hướng dẫn duyệt', durationMinutes: 15, completed: false }
    ];
  } else if (lowerGoal.includes('thuyết trình') || lowerGoal.includes('slide') || lowerGoal.includes('present')) {
    categoryTag = '🎤 Thuyết trình & Báo cáo';
    estimatedTime = '2.5 giờ';
    rawSubtasks = [
      { id: 'sub-1', title: 'Xác định thông điệp chính & bố cục Slide', durationMinutes: 30, completed: false },
      { id: 'sub-2', title: 'Thiết kế bộ Slide giao diện chuyên nghiệp', durationMinutes: 60, completed: false },
      { id: 'sub-3', title: 'Soạn kịch bản nói chi tiết cho từng Slide', durationMinutes: 45, completed: false },
      { id: 'sub-4', title: 'Luyện tập nói thử & bấm giờ', durationMinutes: 30, completed: false }
    ];
  } else if (lowerGoal.includes('thiết kế') || lowerGoal.includes('ui') || lowerGoal.includes('ux') || lowerGoal.includes('website') || lowerGoal.includes('code')) {
    categoryTag = '💻 Lập trình & Thiết kế';
    estimatedTime = '3 giờ';
    rawSubtasks = [
      { id: 'sub-1', title: 'Nghiên cứu yêu cầu & phác thảo ý tưởng Wireframe', durationMinutes: 45, completed: false },
      { id: 'sub-2', title: 'Thiết kế giao diện UI / Dựng khung Code chính', durationMinutes: 90, completed: false },
      { id: 'sub-3', title: 'Kiểm thử responsive trên Mobile & Desktop', durationMinutes: 30, completed: false },
      { id: 'sub-4', title: 'Tối ưu hiệu năng & đóng gói sản phẩm', durationMinutes: 30, completed: false }
    ];
  } else if (lowerGoal.includes('học') || lowerGoal.includes('ôn thi') || lowerGoal.includes('đọc')) {
    categoryTag = '📚 Học tập & Phát triển';
    estimatedTime = '2 giờ';
    rawSubtasks = [
      { id: 'sub-1', title: 'Đọc lý thuyết & ghi chú khái niệm quan trọng', durationMinutes: 45, completed: false },
      { id: 'sub-2', title: 'Tạo sơ đồ tư duy (Mindmap) hệ thống kiến thức', durationMinutes: 30, completed: false },
      { id: 'sub-3', title: 'Giải các bài tập ví dụ thực hành', durationMinutes: 45, completed: false }
    ];
  } else {
    categoryTag = '⚡ Công việc chung';
    estimatedTime = '2 giờ';
    rawSubtasks = [
      { id: 'sub-1', title: 'Chuẩn bị tài nguyên & công cụ cần thiết', durationMinutes: 30, completed: false },
      { id: 'sub-2', title: 'Triển khai giai đoạn 1 của mục tiêu', durationMinutes: 60, completed: false },
      { id: 'sub-3', title: 'Hoàn thiện & kiểm tra kết quả đạt được', durationMinutes: 30, completed: false }
    ];
  }

  // 3. Tự động xếp lịch thông minh (Auto-Schedule)
  const scheduledSubtasks = autoScheduleSubtasks(rawSubtasks, existingTasks);
  const lastSubtask = scheduledSubtasks[scheduledSubtasks.length - 1];
  const suggestedDueDate = lastSubtask ? lastSubtask.scheduledEnd : new Date(Date.now() + 2 * 3600 * 1000).toISOString();

  // 4. Lời khuyên cá nhân hóa
  let adaptiveAdvice = `💡 Đã học từ thói quen của bạn (${userPattern.totalTasksCount} công việc). `;
  if (relatedTask) {
    adaptiveAdvice += `Phát hiện liên quan tới công việc "${relatedTask.title}".`;
  } else if (userPattern.topKeywords.length > 0) {
    adaptiveAdvice += `Công việc phù hợp với nhóm chủ đề [${userPattern.topKeywords.slice(0, 3).join(', ')}].`;
  } else {
    adaptiveAdvice += `AI đã tự động xếp lịch rảnh tối ưu vào Lịch công việc cho bạn.`;
  }

  return {
    title: promptGoal.trim(),
    content: `[AI Smart Scheduler] Phân loại: ${categoryTag} | Tổng ước tính: ${estimatedTime}\n${adaptiveAdvice}`,
    priority,
    subtasks: scheduledSubtasks,
    dueDate: suggestedDueDate,
    estimatedTime,
    categoryTag,
    aiGenerated: true,
    autoScheduled: true
  };
};

export const summarizeTasksAI = (tasks = [], columns = []) => {
  const total = tasks.length;
  if (total === 0) return '💡 Trợ lý AI: Hiện chưa có công việc nào trong danh sách. Hãy tạo mục tiêu mới để AI bắt đầu học thói quen và lập kế hoạch giúp bạn!';
  
  // Hàm kiểm tra task đã xong hay chưa (dựa vào columnId hoặc đối chiếu cột Hoàn thành)
  const isTaskCompleted = (t) => {
    if (t.isArchived) return true;
    const colId = (t.columnId || '').toLowerCase();
    if (colId === 'done' || colId.endsWith('_done') || colId === 'hoàn thành') return true;
    
    // Nếu truyền danh sách columns vào, đối chiếu title của cột chứa task
    if (columns && columns.length > 0) {
      const col = columns.find(c => c.id === t.columnId);
      if (col && (col.title === 'Hoàn thành' || col.id === 'done' || col.id.endsWith('_done'))) {
        return true;
      }
    }
    return false;
  };

  const doneTasks = tasks.filter(isTaskCompleted).length;
  const activeUncompletedTasks = tasks.filter(t => !isTaskCompleted(t));

  // Trong TaskModal/TaskCard, mức độ khẩn cấp được lưu là 'urgent' hoặc 'high'
  const urgentTasks = activeUncompletedTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
  const overdueTasks = activeUncompletedTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;
  const progressPercent = Math.round((doneTasks / total) * 100);

  const pattern = extractUserPatterns(activeUncompletedTasks.length > 0 ? activeUncompletedTasks : tasks);

  let summary = `📊 Phân tích trí tuệ nhân tạo (AI Adaptive Learning):\n`;
  summary += `• Tiến độ chung: ${doneTasks}/${total} công việc (${progressPercent}%)\n`;

  if (progressPercent >= 80) {
    summary += `🌟 Đánh giá: Phong độ làm việc tuyệt vời! Bạn đang duy trì hiệu suất rất cao.\n`;
  } else if (progressPercent >= 50) {
    summary += `⚡ Đánh giá: Tiến độ đang đi đúng hướng, hãy giải quyết tiếp các việc còn dở dang.\n`;
  } else {
    summary += `💡 Đánh giá: Tỷ lệ hoàn thành còn thấp. AI đề xuất bạn nên tập trung dứt điểm 1-2 việc nhỏ trước.\n`;
  }

  if (overdueTasks > 0) {
    summary += `🚨 Cảnh báo khẩn: Có ${overdueTasks} công việc chưa hoàn thành đã QUÁ HẠN. Cần giải quyết ngay!\n`;
  }

  if (urgentTasks > 0) {
    summary += `🔥 Lưu ý: Có ${urgentTasks} công việc KHẨN CẤP chưa hoàn thành cần ưu tiên xử lý hôm nay.`;
  }

  return summary;
};
