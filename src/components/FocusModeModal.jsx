import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Volume2, X, CheckSquare, Square, Flame, Waves, CloudRain, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FocusModeModal({ isOpen, onClose, task, onUpdateTaskSubtasks }) {
  // Pomodoro States
  const [mode, setMode] = useState('work'); // 'work' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Ambient Audio States using Web Audio API
  const [activeSound, setActiveSound] = useState('none'); // 'none' | 'rain' | 'ocean' | 'alpha'
  const [volume, setVolume] = useState(0.4);
  const audioCtxRef = useRef(null);
  const soundNodesRef = useRef([]);

  const modeDurations = {
    work: (task?.priority === 'urgent' ? 35 : 25) * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  // Reset timer when mode or task changes
  useEffect(() => {
    setTimeLeft(modeDurations[mode]);
    setIsRunning(false);
  }, [mode, task]);

  // Pomodoro Countdown Effect
  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playBeepNotification();

      if (mode === 'work') {
        const nextSessions = completedSessions + 1;
        setCompletedSessions(nextSessions);
        toast.success('🎉 Xuất sắc! Bạn đã hoàn thành 1 phiên Pomodoro tập trung!');
        if (nextSessions % 4 === 0) {
          setMode('longBreak');
        } else {
          setMode('shortBreak');
        }
      } else {
        toast('Thời gian nghỉ đã hết. Hãy tiếp tục công việc nhé!', { icon: '⚡' });
        setMode('work');
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode, completedSessions]);

  // Ambient Sound Engine (Hybrid: HTML5 Audio Stream + Local Web Audio Synth Fallback)
  const audioRef = useRef(null);

  const soundUrls = {
    rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg',
    ocean: 'https://actions.google.com/sounds/v1/weather/ocean_waves.ogg',
    alpha: 'https://actions.google.com/sounds/v1/science_fiction/deep_space_hum.ogg'
  };

  const stopAmbientSound = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
      audioRef.current = null;
    }
    if (soundNodesRef.current) {
      soundNodesRef.current.forEach(node => {
        try { node.stop ? node.stop() : node.disconnect(); } catch (e) {}
      });
      soundNodesRef.current = [];
    }
  };

  // Local Synthesizer for 100% Guaranteed Audible Ambient Sounds on all Speakers
  const playLocalSynthSound = async (soundType, currentVol) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      stopAmbientSound();

      const masterGain = ctx.createGain();
      masterGainRef.current = masterGain;
      // Khuếch đại âm lượng lên 2.5x
      masterGain.gain.setValueAtTime(currentVol * 2.5, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (soundType === 'rain') {
        // Mưa đêm: White noise lọc thông thấp 1600Hz + dao động nhẹ
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.7;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1600;

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        soundNodesRef.current = [noise, filter, masterGain];
      } else if (soundType === 'ocean') {
        // Sóng biển: Noise lọc dải tần biến thiên lặp lại nhịp nhàng
        const bufferSize = ctx.sampleRate * 3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.6;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 750;
        filter.Q.value = 0.8;

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.15; // 6.6s wave cycle
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 450;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        lfo.start();
        soundNodesRef.current = [noise, filter, lfo, lfoGain, masterGain];
      } else if (soundType === 'alpha') {
        // Sóng não 432Hz: Hợp âm thư giãn 432Hz (Nốt La 432Hz + Nốt Đô# 540Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 432;
        osc2.frequency.value = 442; // 10Hz Alpha pulse

        const subGain = ctx.createGain();
        subGain.gain.value = 0.5;

        osc1.connect(subGain);
        osc2.connect(subGain);
        subGain.connect(masterGain);
        osc1.start();
        osc2.start();
        soundNodesRef.current = [osc1, osc2, subGain, masterGain];
      }
      return true;
    } catch (e) {
      console.error('Synth error', e);
      return false;
    }
  };

  // Nút thử nghiệm phát chuông âm thanh tức thì
  const handleTestChime = async () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nốt La 5 (880Hz) cực kỳ rõ
      gain.gain.setValueAtTime(0.5 * volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      toast.success('🔊 Đã phát tiếng chuông thử nghiệm!');
    } catch (e) {
      toast.error('Không thể phát âm thanh thử nghiệm');
    }
  };

  const handleSelectSound = async (soundType) => {
    const nextSound = activeSound === soundType ? 'none' : soundType;
    setActiveSound(nextSound);
    stopAmbientSound();

    if (nextSound === 'none') {
      toast('Đã tắt âm thanh sinh thái');
      return;
    }

    const soundNames = {
      rain: '🌧️ Mưa đêm',
      ocean: '🌊 Sóng biển',
      alpha: '🧠 Sóng não 432Hz'
    };

    // Ưu tiên phát Luồng Âm thanh Thực tế HD từ Google Sound CDN (Mưa thật, Sóng thật)
    if (soundUrls[nextSound]) {
      try {
        const audio = new Audio(soundUrls[nextSound]);
        audio.loop = true;
        audio.volume = volume;
        audioRef.current = audio;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          toast.success(`Đã phát âm thanh: ${soundNames[nextSound]}`);
          return;
        }
      } catch (err) {
        console.warn('Online stream fallback to local synth', err);
      }
    }

    // Nếu không kết nối mạng được thì mới phát bằng Synth nội bộ
    await playLocalSynthSound(nextSound, volume);
    toast.success(`Đã phát âm thanh (Offline): ${soundNames[nextSound]}`);
  };

  // Sync volume slider with active audio (HTML5 Audio Element & Web Audio Synth Master Gain)
  const masterGainRef = useRef(null);

  useEffect(() => {
    // 1. Cập nhật âm lượng cho HTML5 Audio stream
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    // 2. Cập nhật âm lượng cho Web Audio Synthesizer thời gian thực
    if (masterGainRef.current && audioCtxRef.current) {
      try {
        masterGainRef.current.gain.setValueAtTime(volume * 2.5, audioCtxRef.current.currentTime);
      } catch (e) {}
    }
  }, [volume]);

  // Cleanup audio on unmount or modal close
  useEffect(() => {
    return () => stopAmbientSound();
  }, []);

  const playBeepNotification = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  if (!isOpen) return null;

  const totalDuration = modeDurations[mode];
  const progressPercent = Math.round(((totalDuration - timeLeft) / totalDuration) * 100);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

  const toggleSubtask = (stId) => {
    if (!task || !onUpdateTaskSubtasks) return;
    const updated = (task.subtasks || []).map(st => st.id === stId ? { ...st, completed: !st.completed } : st);
    onUpdateTaskSubtasks(task.id, updated);
  };

  return (
    <div
      className="focus-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
        backdropFilter: 'blur(16px)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        overflowY: 'auto',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      {/* Top Navigation Bar */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <Zap size={22} color="#c084fc" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f3e8ff' }}>Chế Độ Tập Trung</h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Không xao nhãng • Hiệu suất tối đa</span>
          </div>
        </div>

        <button
          onClick={() => {
            stopAmbientSound();
            onClose();
          }}
          className="icon-btn"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            padding: '10px',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Center Focus Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '650px', width: '100%' }}>
        {/* Mode Selectors */}
        <div className="focus-mode-selectors" style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', justifyContent: 'center' }}>
          <button
            onClick={() => setMode('work')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.78rem',
              background: mode === 'work' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
              color: mode === 'work' ? '#fff' : 'rgba(255,255,255,0.7)',
              transition: 'all 0.25s ease',
              flex: 1,
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            🔥 Tập trung ({modeDurations.work / 60}p)
          </button>
          <button
            onClick={() => setMode('shortBreak')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.78rem',
              background: mode === 'shortBreak' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: mode === 'shortBreak' ? '#fff' : 'rgba(255,255,255,0.7)',
              transition: 'all 0.25s ease',
              flex: 1,
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            ☕ Nghỉ ngắn (5p)
          </button>
          <button
            onClick={() => setMode('longBreak')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.78rem',
              background: mode === 'longBreak' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
              color: mode === 'longBreak' ? '#fff' : 'rgba(255,255,255,0.7)',
              transition: 'all 0.25s ease',
              flex: 1,
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            🌴 Nghỉ dài (15p)
          </button>
        </div>

        {/* Circular Timer Visualizer */}
        <div style={{ position: 'relative', width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="115" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
            <circle
              cx="130"
              cy="130"
              r="115"
              stroke={mode === 'work' ? '#c084fc' : mode === 'shortBreak' ? '#34d399' : '#60a5fa'}
              strokeWidth="12"
              fill="none"
              strokeDasharray={2 * Math.PI * 115}
              strokeDashoffset={2 * Math.PI * 115 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '2px', fontFamily: 'monospace', textShadow: '0 0 25px rgba(192, 132, 252, 0.4)' }}>
              {formattedTime}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px', color: '#c084fc' }}>
              Phiên hoàn thành: <strong>{completedSessions}</strong>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => setTimeLeft(modeDurations[mode])}
            title="Đặt lại đồng hồ"
            style={{
              padding: '12px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="focus-start-btn"
            style={{
              padding: '12px 22px',
              borderRadius: '35px',
              border: 'none',
              background: isRunning ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              boxShadow: isRunning ? '0 6px 20px rgba(239, 68, 68, 0.4)' : '0 6px 25px rgba(168, 85, 247, 0.5)',
              transition: 'all 0.25s ease'
            }}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Tạm Dừng' : 'Bắt Đầu'}
          </button>

          <button
            onClick={() => setTimeLeft(0)}
            title="Bỏ qua phiên này"
            style={{
              padding: '12px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Bottom Panel: Task details & Ambient sound control */}
      <div className="focus-bottom-panel" style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'rgba(255,255,255,0.04)', padding: '18px 24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Task Details & Subtasks */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={18} /> {task ? task.title : 'Công việc tự do'}
          </h4>
          {task?.subtasks && task.subtasks.length > 0 ? (
            <div style={{ maxHeight: '110px', overflowY: 'auto', paddingRight: '6px' }}>
              {task.subtasks.map(st => (
                <div
                  key={st.id}
                  onClick={() => toggleSubtask(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    padding: '4px 0',
                    cursor: 'pointer',
                    opacity: st.completed ? 0.6 : 1,
                    textDecoration: st.completed ? 'line-through' : 'none'
                  }}
                >
                  {st.completed ? <CheckSquare size={16} color="#10b981" /> : <Square size={16} color="#94a3b8" />}
                  <span>{st.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
              {task?.content || 'Giữ tâm trí thanh thản và tập trung giải quyết mục tiêu hiện tại!'}
            </p>
          )}
        </div>

        {/* Ambient Sound Selector */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={18} /> Âm thanh Sinh thái (Ambient Sound)
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleTestChime}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.25)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#c084fc',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="Bấm để phát thử tiếng chuông kiểm tra loa"
              >
                🔔 Thử loa
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{ width: '90px', accentColor: '#a855f7', cursor: 'pointer' }}
                title="Điều chỉnh âm lượng thời gian thực"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => handleSelectSound('rain')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: activeSound === 'rain' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(0,0,0,0.2)',
                color: activeSound === 'rain' ? '#c084fc' : '#e2e8f0',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: activeSound === 'rain' ? 700 : 400
              }}
            >
              <CloudRain size={14} /> Mưa đêm
            </button>

            <button
              onClick={() => handleSelectSound('ocean')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: activeSound === 'ocean' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(0,0,0,0.2)',
                color: activeSound === 'ocean' ? '#60a5fa' : '#e2e8f0',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: activeSound === 'ocean' ? 700 : 400
              }}
            >
              <Waves size={14} /> Sóng biển
            </button>

            <button
              onClick={() => handleSelectSound('alpha')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: activeSound === 'alpha' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0,0,0,0.2)',
                color: activeSound === 'alpha' ? '#34d399' : '#e2e8f0',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: activeSound === 'alpha' ? 700 : 400
              }}
            >
              <Zap size={14} /> Sóng não 432Hz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
