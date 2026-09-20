// Utilities for flexible task reminder offsets and notifications

export const REMINDER_OPTIONS = [
  { value: 0, label: '🔔 Đúng thời điểm hết hạn' },
  { value: 15, label: '⏰ Trước 15 phút' },
  { value: 30, label: '⏰ Trước 30 phút' },
  { value: 60, label: '⏰ Trước 1 giờ' },
  { value: 120, label: '⏰ Trước 2 giờ' },
  { value: 180, label: '⏰ Trước 3 giờ' },
  { value: 360, label: '⏰ Trước 6 giờ' },
  { value: 720, label: '⏰ Trước 12 giờ' },
  { value: 1440, label: '📅 Trước 1 ngày' },
  { value: 2880, label: '📅 Trước 2 ngày' },
  { value: 4320, label: '📅 Trước 3 ngày' },
  { value: 10080, label: '📆 Trước 1 tuần' },
  { value: 'custom', label: '⚙️ Tùy chỉnh...' },
];

export const formatReminderText = (minutes) => {
  const m = Number(minutes);
  if (isNaN(m) || m <= 0) return 'Đúng thời điểm hết hạn';
  if (m % 10080 === 0) return `Trước ${m / 10080} tuần`;
  if (m % 1440 === 0) return `Trước ${m / 1440} ngày`;
  if (m % 60 === 0) return `Trước ${m / 60} giờ`;
  return `Trước ${m} phút`;
};

export const getNotifyTime = (dueDate, reminderOffset = 0) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  const offsetMs = (Number(reminderOffset) || 0) * 60 * 1000;
  return new Date(due.getTime() - offsetMs);
};
