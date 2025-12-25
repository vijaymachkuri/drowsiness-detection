export interface DetectionStats {
  ear: number; // Eye Aspect Ratio
  mar: number; // Mouth Aspect Ratio
  fatigueScore: number; // 0-100
  isDrowsy: boolean;
  isYawning: boolean;
  tilt: {
    pitch: number;
    yaw: number;
    roll: number;
  };
}

export interface FatigueEvent {
  id: string;
  timestamp: number;
  type: 'DROWSINESS' | 'YAWN' | 'DISTRACTION';
  severity: number;
}

export interface SystemState {
  isMonitoring: boolean;
  isModelLoading: boolean;
  cameraPermission: boolean;
}

export enum AlertLevel {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}