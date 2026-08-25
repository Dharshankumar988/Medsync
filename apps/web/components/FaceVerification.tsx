'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

interface FaceVerificationProps {
  onVerify: (file: File) => Promise<boolean>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function FaceVerification({ onVerify, onSuccess, onError }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('Initializing camera and AI models...');
  
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const requestRef = useRef<number>();
  const lastApiCallTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5
        });
        setIsModelLoaded(true);
        setFeedback('AI Models Loaded. Please position your face.');
      } catch (err) {
        console.error('MediaPipe Init Error', err);
        setFeedback('Error loading face detection models.');
        if (onError) onError('Error loading face detection models.');
      }
    };
    initMediaPipe();

    return () => {
      if (faceDetectorRef.current) {
        faceDetectorRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError]);

  // Start Camera
  useEffect(() => {
    if (!isModelLoaded) return;
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraActive(true);
          };
        }
      } catch (err) {
        console.error('Camera Error', err);
        setFeedback('Could not access camera.');
        if (onError) onError('Could not access camera.');
      }
    };
    startCamera();
  }, [isModelLoaded, onError]);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceDetectorRef.current || !isCameraActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We draw the raw video to canvas for visual feedback
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
      const startTimeMs = performance.now();
      const detections = faceDetectorRef.current.detectForVideo(video, startTimeMs).detections;
      
      if (detections && detections.length > 0) {
        const face = detections[0];
        
        // Draw bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          face.boundingBox!.originX,
          face.boundingBox!.originY,
          face.boundingBox!.width,
          face.boundingBox!.height
        );
        
        // Throttle API call to 500ms
        const now = Date.now();
        if (now - lastApiCallTimeRef.current > 500 && !isProcessing) {
          lastApiCallTimeRef.current = now;
          
          // Crop Face
          const tempCanvas = document.createElement('canvas');
          const padding = 20; // add some padding around the face
          const targetW = face.boundingBox!.width + padding * 2;
          const targetH = face.boundingBox!.height + padding * 2;
          
          tempCanvas.width = targetW;
          tempCanvas.height = targetH;
          const tCtx = tempCanvas.getContext('2d');
          
          if (tCtx) {
            tCtx.drawImage(
              video,
              Math.max(0, face.boundingBox!.originX - padding),
              Math.max(0, face.boundingBox!.originY - padding),
              targetW,
              targetH,
              0, 0, targetW, targetH
            );
            
            tempCanvas.toBlob(async (blob) => {
              if (blob) {
                const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
                setIsProcessing(true);
                try {
                  const result = await onVerify(file);
                  if (result) {
                    setFeedback('Verification successful!');
                    if (onSuccess) onSuccess();
                    // Stop loop on success
                    return;
                  } else {
                    setFeedback('Face not recognized. Keep looking at the camera.');
                  }
                } catch (err) {
                  console.error(err);
                  setFeedback('Error verifying face.');
                } finally {
                  setIsProcessing(false);
                }
              }
            }, 'image/jpeg');
          }
        }
      } else {
        setFeedback('No face detected. Please position your face in the frame.');
      }
    } catch (err) {
      console.error(err);
    }
    
    requestRef.current = requestAnimationFrame(processFrame);
  }, [isCameraActive, isProcessing, onSuccess, onVerify]);

  // Start processing loop when camera is active
  useEffect(() => {
    if (isCameraActive) {
      requestRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraActive, processFrame]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-indigo-500 max-w-md w-full bg-slate-900 aspect-video flex items-center justify-center">
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-300">
            <span className="animate-pulse">Loading camera...</span>
          </div>
        )}
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover" 
          playsInline 
          muted 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover z-10"
        />
      </div>
      
      <div className={`p-3 rounded-lg text-sm font-medium w-full text-center ${
        feedback.includes('successful') ? 'bg-green-100 text-green-700' : 
        feedback.includes('Error') ? 'bg-red-100 text-red-700' : 
        'bg-blue-50 text-blue-700'
      }`}>
        {feedback}
        {isProcessing && <span className="ml-2 inline-block animate-spin">⟳</span>}
      </div>
    </div>
  );
}
