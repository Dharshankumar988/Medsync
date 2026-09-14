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
  const overlayRef = useRef<HTMLDivElement>(null);
  
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
      if (videoRef.current && videoRef.current.srcObject) {
        const srcStream = videoRef.current.srcObject as MediaStream;
        srcStream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
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
        
        // Update overlay color to indicate detection
        if (overlayRef.current) {
          overlayRef.current.style.borderColor = '#10b981'; // Emerald 500
        }

        
        // Throttle API call to 500ms
        const now = Date.now();
        if (now - lastApiCallTimeRef.current > 500 && !isProcessing) {
          lastApiCallTimeRef.current = now;
          
          // Send Full Frame to backend for reliable identification
          const tempCanvas = document.createElement('canvas');
          const targetW = video.videoWidth;
          const targetH = video.videoHeight;
          
          tempCanvas.width = targetW;
          tempCanvas.height = targetH;
          const tCtx = tempCanvas.getContext('2d');
          
          if (tCtx) {
            tCtx.drawImage(
              video,
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
        if (overlayRef.current) {
          overlayRef.current.style.borderColor = 'rgba(255,255,255,0.7)';
        }
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
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
          playsInline 
          muted 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover z-10 transform scale-x-[-1]"
        />
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          {/* Darkened background around the reticle */}
          <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"></div>
          
          {/* Modern Reticle / Corner brackets */}
          <div 
            ref={overlayRef}
            className="relative w-[220px] h-[280px] sm:w-[260px] sm:h-[320px] transition-colors duration-300"
            style={{ borderColor: 'rgba(255,255,255,0.7)' }}
          >
            {/* Top Left */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-2xl border-[inherit]"></div>
            {/* Top Right */}
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-2xl border-[inherit]"></div>
            {/* Bottom Left */}
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-2xl border-[inherit]"></div>
            {/* Bottom Right */}
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-2xl border-[inherit]"></div>
            
            {/* Inner oval for face shape guidance */}
            <div className="absolute inset-2 border-2 border-dashed border-white/20 rounded-[40%]"></div>
          </div>
        </div>
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
