import { Keypoint } from '@tensorflow-models/face-landmarks-detection';
import { MESH_INDICES, THRESHOLDS } from '../constants';

// Euclidean distance
const distance = (p1: Keypoint, p2: Keypoint) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Eye Aspect Ratio
export const calculateEAR = (keypoints: Keypoint[], indices: number[]) => {
  if (!keypoints || keypoints.length === 0) return 0;

  // indices: [left, top1, top2, right, bottom2, bottom1]
  const p1 = keypoints[indices[0]];
  const p2 = keypoints[indices[1]];
  const p3 = keypoints[indices[2]];
  const p4 = keypoints[indices[3]];
  const p5 = keypoints[indices[4]];
  const p6 = keypoints[indices[5]];

  // Standard EAR formula
  const numerator = distance(p2, p6) + distance(p3, p5);
  const denominator = 2 * distance(p1, p4);

  return numerator / denominator;
};

// Mouth Aspect Ratio
export const calculateMAR = (keypoints: Keypoint[]) => {
  const indices = MESH_INDICES.MOUTH;
  
  const top = keypoints[13];
  const bottom = keypoints[14];
  const left = keypoints[61]; 
  const right = keypoints[291]; 

  const height = distance(top, bottom);
  const width = distance(left, right);

  return height / width;
};

export const calculateFatigueScore = (
  ear: number, 
  mar: number, 
  currentScore: number
): number => {
  let delta = 0;
  
  // 1. EYES CLOSED (Aggressive)
  // If EAR < 0.16 (new threshold), user is blinking or sleeping.
  if (ear < THRESHOLDS.EAR_CLOSED) {
      // +5 per frame. Slower build up. 
      // 30fps -> 20 frames (0.66s) to reach 100.
      // Standard blink is ~0.1-0.4s. 
      // This prevents alarms on long blinks but catches sleep.
      delta = 5.0; 
  }
  // 2. DROWSY (Warning)
  else if (ear < THRESHOLDS.EAR_DROWSY) {
      // Very slow creep for heavy eyes
      delta = 0.5; 
  }
  // 3. EYES OPEN (Recovery)
  else {
      // -4.0 recovery per frame. Fast recovery.
      // If you open your eyes, the score should drop immediately.
      delta = -4.0; 
  }

  // Yawn penalty
  if (mar > THRESHOLDS.MAR_YAWN) {
      delta += 1.0;
  }

  const newScore = Math.min(100, Math.max(0, currentScore + delta));
  return parseFloat(newScore.toFixed(1));
};