import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { MESH_INDICES, THRESHOLDS, COLORS } from '../constants';
import { calculateEAR, calculateMAR, calculateFatigueScore } from '../services/detectorUtils';
import { DetectionStats } from '../types';
import { CameraOff } from 'lucide-react';

interface ScannerProps {
  onStatsUpdate: (stats: DetectionStats) => void;
  isActive: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onStatsUpdate, isActive }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Internal state for smoothing & throttling
  const fatigueScoreRef = useRef(0);
  const lastUpdateRef = useRef(0); // For React State updates
  const lastDetectionTimeRef = useRef(0); // For AI Inference throttling

  // 1. Initialize TensorFlow Backend explicitly
  useEffect(() => {
    const initTF = async () => {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log("TensorFlow Backend Initialized: ", tf.getBackend());
    };
    initTF();
  }, []);

  const handleUserMedia = useCallback(() => {
    console.log("Webcam stream started");
    setIsWebcamReady(true);
    setCameraError(null);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Camera Error:", error);
    let errorMsg = "Unable to access camera.";
    if (typeof error === 'object' && 'name' in error) {
      if (error.name === 'NotAllowedError') errorMsg = "Permission denied. Please allow camera access.";
      else if (error.name === 'NotFoundError') errorMsg = "No camera found.";
      else if (error.name === 'NotReadableError') errorMsg = "Camera is in use by another app.";
    }
    setCameraError(errorMsg);
    setIsWebcamReady(false);
  }, []);

  const runDetector = useCallback(async () => {
    // Initialize detector if needed (only when active)
    if (!detectorRef.current && isActive && !modelLoading) {
      setModelLoading(true);
      try {
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs' as const,
          refineLandmarks: true,
          maxFaces: 1
        };
        detectorRef.current = await faceLandmarksDetection.createDetector(model, detectorConfig);
        console.log("Detector loaded");
      } catch (err) {
        console.error("Failed to load detector", err);
        setModelLoading(false);
        return;
      } finally {
        setModelLoading(false);
      }
    }

    const detect = async () => {
      // Check if everything is ready
      if (
        isActive &&
        webcamRef.current &&
        webcamRef.current.video &&
        detectorRef.current
      ) {
        const video = webcamRef.current.video;

        // 2. Strict Video Readiness Check
        if (video.readyState < 2 || video.videoWidth === 0) {
          if (isActive) requestRef.current = requestAnimationFrame(detect);
          return;
        }

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // 3. Fix for MediaPipe: Explicitly set video element dimensions
        video.width = videoWidth;
        video.height = videoHeight;

        // Resize canvas if needed
        if (canvasRef.current && (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight)) {
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
        }

        // --- OPTIMIZATION: Throttle Inference ---
        // Run AI only every ~100ms (10 FPS) to save battery/CPU
        // AnimationFrame runs at 60FPS, causing overheat if unchecked
        const now = Date.now();
        if (now - lastDetectionTimeRef.current >= 100) {
          lastDetectionTimeRef.current = now;

          try {
            // Detect faces
            const faces = await detectorRef.current.estimateFaces(video);

            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, videoWidth, videoHeight);

                if (faces.length > 0) {
                  const keypoints = faces[0].keypoints;

                  // --- VISUALIZATION ---
                  // Draw face mesh dots (Cyan)
                  ctx.fillStyle = COLORS.CYAN;
                  for (let i = 0; i < keypoints.length; i += 10) {
                    const x = keypoints[i].x;
                    const y = keypoints[i].y;
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, 2 * Math.PI);
                    ctx.fill();
                  }

                  // Draw Eye landmarks specifically (Yellow)
                  ctx.fillStyle = COLORS.YELLOW;
                  [...MESH_INDICES.LEFT_EYE, ...MESH_INDICES.RIGHT_EYE].forEach(index => {
                    const p = keypoints[index];
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                  });

                  // --- CALCULATIONS ---
                  const leftEar = calculateEAR(keypoints, MESH_INDICES.LEFT_EYE);
                  const rightEar = calculateEAR(keypoints, MESH_INDICES.RIGHT_EYE);
                  const avgEar = (leftEar + rightEar) / 2;
                  const mar = calculateMAR(keypoints);

                  // Update Fatigue Score
                  fatigueScoreRef.current = calculateFatigueScore(avgEar, mar, fatigueScoreRef.current);

                  // --- HUD DEBUG INFO (ON CANVAS) ---
                  ctx.font = 'bold 20px Courier New';
                  const isClosed = avgEar < THRESHOLDS.EAR_CLOSED;
                  const isDrowsy = avgEar < THRESHOLDS.EAR_DROWSY;

                  ctx.fillStyle = isClosed ? COLORS.RED : (isDrowsy ? COLORS.YELLOW : COLORS.GREEN);
                  ctx.fillText(`EAR: ${avgEar.toFixed(2)}`, 20, 40);

                  ctx.fillStyle = COLORS.CYAN;
                  ctx.fillText(`SCORE: ${fatigueScoreRef.current.toFixed(0)}`, 20, 70);

                  let statusText = "AWAKE";
                  if (isClosed) statusText = "CLOSED !!!";
                  else if (isDrowsy) statusText = "DROWSY";

                  ctx.fillStyle = isClosed ? COLORS.RED : (isDrowsy ? COLORS.YELLOW : COLORS.GREEN);
                  ctx.fillText(`STATUS: ${statusText}`, 20, 100);

                  if (isClosed) {
                    // Draw red border warning on canvas
                    ctx.strokeStyle = COLORS.RED;
                    ctx.lineWidth = 10;
                    ctx.strokeRect(0, 0, videoWidth, videoHeight);
                  }

                  // --- REACT UPDATE THROTTLE ---
                  // Only update React state every 100ms or if urgent
                  if (now - lastUpdateRef.current > 100 || fatigueScoreRef.current > THRESHOLDS.FATIGUE_TRIGGER) {
                    lastUpdateRef.current = now;
                    onStatsUpdate({
                      ear: avgEar,
                      mar: mar,
                      fatigueScore: fatigueScoreRef.current,
                      isDrowsy: isDrowsy,
                      isYawning: mar > THRESHOLDS.MAR_YAWN,
                      tilt: { pitch: 0, yaw: 0, roll: 0 }
                    });
                  }

                } else {
                  // Face Lost
                  const ctx = canvasRef.current.getContext('2d');
                  if (ctx) {
                    // Blink the "No Face" warning
                    if (Math.floor(Date.now() / 500) % 2 === 0) {
                      ctx.font = 'bold 24px Orbitron';
                      ctx.fillStyle = COLORS.RED;
                      ctx.fillText("NO FACE DETECTED", 40, videoHeight / 2);
                      ctx.font = '16px monospace';
                      ctx.fillStyle = COLORS.CYAN;
                      ctx.fillText("Move Closer / Check Light", 40, videoHeight / 2 + 30);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error("Detection loop error:", error);
          }
        }
      }

      // Keep looping if active
      if (isActive) {
        requestRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  }, [isActive, onStatsUpdate, modelLoading]);

  // Start/Stop detection loop based on active state
  useEffect(() => {
    if (isActive && isWebcamReady) {
      runDetector();
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, isWebcamReady, runDetector]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        playsInline={true}
        disablePictureInPicture={false}
        forceScreenshotSourceSize={false}
        imageSmoothing={true}
        screenshotFormat="image/webp"
        screenshotQuality={0.92}
        onUserMedia={handleUserMedia}
        onUserMediaError={handleUserMediaError}
        className="absolute inset-0 w-full h-full object-cover z-10"
        videoConstraints={{
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-20"
      />

      {/* Decorative HUD */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
      </div>

      {!isWebcamReady && !cameraError && (
        <div className="absolute inset-0 z-40 bg-black flex items-center justify-center">
          <div className="text-cyan-500 animate-pulse font-display tracking-widest">INITIALIZING SENSORS...</div>
        </div>
      )}

      {modelLoading && isWebcamReady && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center">
          <div className="text-cyan-500 animate-pulse font-display tracking-widest">LOADING NEURAL NET...</div>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 rounded-full bg-red-500/10 mb-4 animate-pulse">
            <CameraOff size={48} className="text-red-500" />
          </div>
          <h3 className="text-xl font-display text-white mb-2">CAMERA OFFILINE</h3>
          <p className="text-gray-400 font-mono text-sm max-w-xs">{cameraError}</p>
          <div className="mt-6 text-xs text-cyan-500/60 uppercase tracking-widest">Check Permissions</div>
        </div>
      )}
    </div>
  );
};

export default Scanner;