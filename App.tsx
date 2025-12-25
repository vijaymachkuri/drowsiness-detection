import React, { useState, useEffect, useCallback, useRef } from 'react';
import Scanner from './components/Scanner';
import Dashboard from './components/Dashboard';
import { DetectionStats, AlertLevel, FatigueEvent } from './types';
import { THRESHOLDS } from './constants';
import { audioService } from './services/audioService';
import { storageService } from './services/storageService';
import { Power, Settings, Shield, BellOff } from 'lucide-react';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState<DetectionStats>({
    ear: 0,
    mar: 0,
    fatigueScore: 0,
    isDrowsy: false,
    isYawning: false,
    tilt: { pitch: 0, yaw: 0, roll: 0 }
  });
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(AlertLevel.NORMAL);
  const [historyData, setHistoryData] = useState<{time: string, score: number}[]>([]);
  
  // Ref to throttle event saving
  const lastEventSaveTime = useRef(0);

  // Initialize Audio Context on user interaction
  const toggleSystem = () => {
    if (!isActive) {
      // STARTING
      audioService.playPing(); 
      setIsActive(true);
    } else {
      // STOPPING
      setIsActive(false);
      audioService.stopAlarm();
      setAlertLevel(AlertLevel.NORMAL);
      // Reset stats visualization
      setStats(prev => ({ ...prev, fatigueScore: 0 }));
    }
  };

  const dismissAlarm = () => {
    audioService.stopAlarm();
    setAlertLevel(AlertLevel.NORMAL);
    // Reset score slightly to prevent immediate re-trigger if eyes are still adjusting
    setStats(prev => ({ ...prev, fatigueScore: 0 }));
  };

  const handleStatsUpdate = useCallback((newStats: DetectionStats) => {
    setStats(newStats);

    // Update Chart Data
    setHistoryData(prev => {
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      const newData = [...prev, { time: timeStr, score: newStats.fatigueScore }];
      return newData.slice(-50); // Keep last 50 points
    });

    // Alert Logic
    if (newStats.fatigueScore > THRESHOLDS.FATIGUE_TRIGGER) {
      setAlertLevel(AlertLevel.CRITICAL);
      audioService.playAlarm();
      
      // Save Event Throttled (Max once every 5 seconds)
      const now = Date.now();
      if (now - lastEventSaveTime.current > 5000) { 
          lastEventSaveTime.current = now;
          const event: FatigueEvent = {
              id: now.toString(),
              timestamp: now,
              type: 'DROWSINESS',
              severity: newStats.fatigueScore
          };
          storageService.saveEvent(event);
      }
    } else if (newStats.fatigueScore > THRESHOLDS.FATIGUE_TRIGGER - 20) {
      setAlertLevel(AlertLevel.WARNING);
      audioService.stopAlarm();
    } else {
      setAlertLevel(AlertLevel.NORMAL);
      audioService.stopAlarm();
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-20 border-b border-cyan-500/20 bg-black/80 backdrop-blur-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 rounded border border-cyan-500/50 flex items-center justify-center">
             <Shield className="text-cyan-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-white uppercase font-display leading-none">
              Drowsiness <span className="text-cyan-400">Detector</span>
            </h1>
            <p className="text-[10px] text-cyan-500/60 tracking-[0.2em] uppercase">Driver Monitoring System</p>
          </div>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={toggleSystem}
             className={`flex items-center gap-2 px-6 py-2 rounded-sm border transition-all duration-300 font-bold tracking-wider ${
                isActive 
                ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_20px_rgba(255,0,0,0.4)]' 
                : 'bg-cyan-500/20 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]'
             }`}
           >
             <Power size={18} />
             <span className="font-display">{isActive ? 'STOP SYSTEM' : 'START SYSTEM'}</span>
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Camera Feed */}
        <div className="lg:w-1/2 flex flex-col">
          {/* Explicit height ensures camera is visible on all devices */}
          <div className="relative h-[500px] lg:h-auto lg:flex-1 w-full bg-black/50 rounded-xl overflow-hidden shadow-2xl shadow-cyan-900/20">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500 z-30"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500 z-30"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500 z-30"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500 z-30"></div>
            
            <Scanner onStatsUpdate={handleStatsUpdate} isActive={isActive} />
            
            {/* Warning Overlay */}
            {alertLevel === AlertLevel.CRITICAL && (
               <div className="absolute inset-0 z-50 bg-red-900/40 backdrop-blur-sm animate-pulse flex items-center justify-center p-4">
                  <div className="border-4 border-red-500 bg-black p-8 text-center shadow-[0_0_100px_rgba(255,0,0,0.6)] rounded-xl max-w-md w-full relative overflow-hidden">
                     {/* Scanline effect inside box */}
                     <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:10px_10px] pointer-events-none opacity-20"></div>
                     
                     <div className="relative z-10">
                        <AlertLevelIcon />
                        <h2 className="text-5xl font-display font-black text-red-500 tracking-widest mb-2 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">WARNING</h2>
                        <p className="text-white text-xl tracking-[0.2em] font-mono mb-8 border-b border-red-900 pb-4">FATIGUE DETECTED</p>
                        
                        <button 
                            onClick={dismissAlarm}
                            className="w-full group bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded flex items-center justify-center gap-3 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-900/50"
                        >
                            <BellOff size={24} className="animate-bounce" />
                            <span className="font-display tracking-wider text-lg">DISMISS ALARM</span>
                        </button>
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Data */}
        <div className="lg:w-1/2 flex flex-col h-full">
          <Dashboard stats={stats} alertLevel={alertLevel} historyData={historyData} />
          
          {/* Logs Panel */}
          <div className="mt-6 flex-1 bg-gray-900/50 border border-cyan-500/20 p-4 rounded-lg overflow-hidden flex flex-col min-h-[200px]">
             <div className="flex justify-between items-center mb-4 border-b border-cyan-500/20 pb-2">
                <h3 className="font-display text-sm text-cyan-400 uppercase tracking-widest">System Log</h3>
                <span className="text-xs text-gray-500 font-mono">LIVE FEED</span>
             </div>
             <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 max-h-[200px] pr-2 scrollbar-thin scrollbar-thumb-cyan-500/20">
                {historyData.slice().reverse().map((log, i) => (
                  <div key={i} className="flex justify-between text-gray-400 border-b border-gray-800 pb-1 hover:bg-white/5 transition-colors">
                    <span className="text-cyan-500/50">[{log.time}]</span>
                    <span>FATIGUE_SCORE_UPDATE</span>
                    <span className={log.score > 50 ? 'text-red-400 font-bold' : 'text-green-400'}>VAL: {log.score.toFixed(1)}</span>
                  </div>
                ))}
                {!isActive && (
                  <div className="text-yellow-500/50 italic">[SYSTEM] Standby mode engaged... Waiting for activation.</div>
                )}
             </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-2 bg-black border-t border-gray-900 text-center z-20">
         <p className="text-[10px] text-gray-600 font-mono">DROWSINESS DETECTOR © 2025 // TENSORFLOW.JS INTEGRATED // MEDIAPIPE MESH</p>
      </footer>
    </div>
  );
};

const AlertLevelIcon = () => (
    <div className="flex justify-center mb-4">
        <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-xl opacity-50 animate-pulse"></div>
            <Shield size={64} className="text-red-500 relative z-10" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black font-bold text-2xl">!</div>
        </div>
    </div>
);

export default App;