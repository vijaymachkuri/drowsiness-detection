
// MediaPipe FaceMesh Indices
export const MESH_INDICES = {
  // Left Eye (33, 160, 158, 133, 153, 144)
  LEFT_EYE: [33, 160, 158, 133, 153, 144],
  // Right Eye (362, 385, 387, 263, 373, 380)
  RIGHT_EYE: [362, 385, 387, 263, 373, 380],
  // Mouth (Inner lips for openness)
  MOUTH: [13, 312, 317, 14, 87, 82], 
  // Face Bounds for Tilt (Top, Bottom, Left, Right)
  FACE_OVAL: [10, 152, 234, 454]
};

export const THRESHOLDS = {
  // Fine-tuned settings for better accuracy
  EAR_DROWSY: 0.22,  // Lowered from 0.32: Eyes must be significantly droopy
  EAR_CLOSED: 0.16,  // Lowered from 0.25: Eyes must be clearly closed
  MAR_YAWN: 0.5,     // Mouth openness for yawn
  FATIGUE_TRIGGER: 80, // Trigger alarm at score 80
  CONSECUTIVE_FRAMES: 5,
};

export const COLORS = {
  CYAN: '#00f3ff',
  RED: '#ff003c',
  GREEN: '#39ff14',
  YELLOW: '#fcee0a',
  DARK: '#050505',
  PANEL: '#0a0a0a99'
};
