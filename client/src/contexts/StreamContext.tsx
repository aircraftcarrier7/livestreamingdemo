import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import type {
  StreamConfig,
  StreamStatus,
  CompositionMode,
  WebcamRotation,
  PlaylistItem,
} from "../../../shared/streamTypes";
import { CANVAS_WIDTH, CANVAS_HEIGHT, GAP_HEIGHT, ASPECT_16_9, ASPECT_4_3 } from "../../../shared/streamTypes";

interface StreamContextType {
  // RTMP Settings
  rtmpUrl: string;
  setRtmpUrl: (url: string) => void;
  streamKey: string;
  setStreamKey: (key: string) => void;

  // Stream status
  isStreaming: boolean;
  streamStatus: StreamStatus;
  startStream: () => void;
  stopStream: () => void;

  // Webcam
  webcamStream: MediaStream | null;
  webcamRotation: WebcamRotation;
  setWebcamRotation: (rotation: WebcamRotation) => void;
  webcamMirrored: boolean;
  setWebcamMirrored: (mirrored: boolean) => void;
  startWebcam: (deviceId?: string) => Promise<void>;
  stopWebcam: () => void;
  availableCameras: MediaDeviceInfo[];
  selectedCameraId: string;
  setSelectedCameraId: (id: string) => void;

  // Playlist
  playlist: PlaylistItem[];
  addToPlaylist: (files: FileList) => void;
  removeFromPlaylist: (id: string) => void;
  reorderPlaylist: (fromIndex: number, toIndex: number) => void;
  currentVideoIndex: number;
  setCurrentVideoIndex: (index: number) => void;

  // Video player
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  volume: number;
  setVolume: (volume: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Composition
  compositionMode: CompositionMode;
  setCompositionMode: (mode: CompositionMode) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Video zoom
  videoZoom: number;
  setVideoZoom: (zoom: number) => void;
  videoOffsetX: number;
  setVideoOffsetX: (offset: number) => void;
  videoOffsetY: number;
  setVideoOffsetY: (offset: number) => void;
}

const StreamContext = createContext<StreamContextType | null>(null);

export function StreamProvider({ children }: { children: React.ReactNode }) {
  // RTMP Settings
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");

  // Stream status
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    frames: 0,
    fps: 0,
    bitrate: 0,
    status: "idle",
  });

  // Webcam
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamRotation, setWebcamRotation] = useState<WebcamRotation>(0);
  const [webcamMirrored, setWebcamMirrored] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  // Playlist
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Video player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Composition
  const [compositionMode, setCompositionMode] = useState<CompositionMode>("composite-1");

  // Video zoom and offset
  const [videoZoom, setVideoZoom] = useState(1);
  const [videoOffsetX, setVideoOffsetX] = useState(0);
  const [videoOffsetY, setVideoOffsetY] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationFrameRef = useRef<number>(0);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const shouldAutoPlayRef = useRef<boolean>(false); // 다음 영상 자동 재생 여부

  // Initialize video element for playlist playback
  useEffect(() => {
    if (!videoRef.current) {
      const video = document.createElement('video');
      video.autoplay = false;
      video.playsInline = true;
      video.muted = false;
      video.style.display = 'none';
      document.body.appendChild(video);
      videoRef.current = video;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, []);

  // Initialize available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn("MediaDevices API not available. Camera features will be disabled.");
          return;
        }
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");
        setAvailableCameras(cameras);
        if (cameras.length > 0 && !selectedCameraId) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch (error) {
        console.warn("Failed to get cameras (this is normal if no camera is available):", error);
      }
    }
    getCameras();
  }, []);

  // Start webcam
  const startWebcam = useCallback(async (deviceId?: string) => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("MediaDevices API not available. Cannot start webcam.");
        return;
      }

      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setWebcamStream(stream);

      // Create hidden video element for webcam
      if (!webcamVideoRef.current) {
        webcamVideoRef.current = document.createElement("video");
        webcamVideoRef.current.autoplay = true;
        webcamVideoRef.current.playsInline = true;
        webcamVideoRef.current.muted = true;
      }
      webcamVideoRef.current.srcObject = stream;
      await webcamVideoRef.current.play();
    } catch (error) {
      console.error("Failed to start webcam:", error);
      throw error;
    }
  }, [webcamStream]);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
  }, [webcamStream]);

  // Playlist management
  const addToPlaylist = useCallback((files: FileList) => {
    const newItems: PlaylistItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
    }));
    setPlaylist((prev) => [...prev, ...newItems]);
  }, []);

  const removeFromPlaylist = useCallback((id: string) => {
    setPlaylist((prev) => {
      const itemIndex = prev.findIndex((p) => p.id === id);
      const item = prev[itemIndex];

      if (item) {
        URL.revokeObjectURL(item.url);
      }

      const newPlaylist = prev.filter((p) => p.id !== id);

      // 현재 재생 중인 영상을 삭제하는 경우
      setCurrentVideoIndex((prevIndex) => {
        if (newPlaylist.length === 0) {
          // 모든 영상이 삭제된 경우 비디오 정지
          const video = videoRef.current;
          if (video) {
            video.pause();
            video.src = '';
            video.load();
          }
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          return 0;
        } else if (itemIndex === prevIndex) {
          // 현재 재생 중인 영상을 삭제한 경우
          const video = videoRef.current;
          if (video) {
            video.pause();
            video.src = '';
            video.load();
          }
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          // 다음 영상으로 이동 (마지막이면 첫 번째로)
          return prevIndex >= newPlaylist.length ? 0 : prevIndex;
        } else if (itemIndex < prevIndex) {
          // 현재 재생 중인 영상 앞의 영상을 삭제한 경우
          return prevIndex - 1;
        }
        return prevIndex;
      });

      return newPlaylist;
    });
  }, [videoRef]);

  const reorderPlaylist = useCallback((fromIndex: number, toIndex: number) => {
    setPlaylist((prev) => {
      const newList = [...prev];
      const [removed] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, removed);
      return newList;
    });

    // 현재 재생 중인 영상의 새 인덱스 계산
    setCurrentVideoIndex((prevIndex) => {
      if (prevIndex === fromIndex) {
        // 재생 중인 영상을 이동한 경우
        return toIndex;
      } else if (fromIndex < prevIndex && toIndex >= prevIndex) {
        // 재생 중인 영상 앞에서 뒤로 이동
        return prevIndex - 1;
      } else if (fromIndex > prevIndex && toIndex <= prevIndex) {
        // 재생 중인 영상 뒤에서 앞으로 이동
        return prevIndex + 1;
      }
      return prevIndex;
    });
  }, []);

  // Canvas composition rendering
  const renderComposition = useCallback(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const video = videoRef.current;
    const webcamVideo = webcamVideoRef.current;

    // Calculate dimensions based on composition mode
    switch (compositionMode) {
      case "cam-only": {
        // Draw webcam full screen
        if (webcamVideo && webcamVideo.readyState >= 2) {
          drawRotatedWebcam(ctx, webcamVideo, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, webcamRotation, webcamMirrored);
        }
        break;
      }

      case "video-only": {
        // Full screen video (letterboxed to fit 9:16) with zoom and offset
        if (video && video.readyState >= 2) {
          const videoAspect = video.videoWidth / video.videoHeight;
          let baseWidth = CANVAS_WIDTH;
          let baseHeight = CANVAS_WIDTH / videoAspect;
          let baseX = 0;
          let baseY = (CANVAS_HEIGHT - baseHeight) / 2;

          if (baseHeight > CANVAS_HEIGHT) {
            baseHeight = CANVAS_HEIGHT;
            baseWidth = CANVAS_HEIGHT * videoAspect;
            baseX = (CANVAS_WIDTH - baseWidth) / 2;
            baseY = 0;
          }

          // Apply zoom and offset
          const zoomedWidth = baseWidth * videoZoom;
          const zoomedHeight = baseHeight * videoZoom;
          const zoomedX = baseX - (zoomedWidth - baseWidth) / 2 + videoOffsetX;
          const zoomedY = baseY - (zoomedHeight - baseHeight) / 2 + videoOffsetY;

          ctx.drawImage(video, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
        }
        break;
      }

      case "composite-1": {
        // Video 16:9 at top + 20px gap + Cam 4:3 at bottom + black margins
        const videoHeight = Math.floor(CANVAS_WIDTH / ASPECT_16_9);
        const camHeight = Math.floor(CANVAS_WIDTH / ASPECT_4_3);
        const camY = videoHeight + GAP_HEIGHT;

        // Draw video at top with zoom and offset
        if (video && video.readyState >= 2) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, CANVAS_WIDTH, videoHeight);
          ctx.clip();

          const zoomedWidth = CANVAS_WIDTH * videoZoom;
          const zoomedHeight = videoHeight * videoZoom;
          const zoomedX = -(zoomedWidth - CANVAS_WIDTH) / 2 + videoOffsetX;
          const zoomedY = -(zoomedHeight - videoHeight) / 2 + videoOffsetY;

          ctx.drawImage(video, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
          ctx.restore();
        }

        // Draw webcam below with 4:3 aspect ratio
        if (webcamVideo && webcamVideo.readyState >= 2) {
          drawRotatedWebcam(ctx, webcamVideo, 0, camY, CANVAS_WIDTH, camHeight, webcamRotation, webcamMirrored);
        }
        break;
      }

      case "composite-2": {
        // Video 16:9 at top + 20px gap + Cam fills remaining space
        const videoHeight = Math.floor(CANVAS_WIDTH / ASPECT_16_9);
        const camY = videoHeight + GAP_HEIGHT;
        const camHeight = CANVAS_HEIGHT - camY;

        // Draw video at top with zoom and offset
        if (video && video.readyState >= 2) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, CANVAS_WIDTH, videoHeight);
          ctx.clip();

          const zoomedWidth = CANVAS_WIDTH * videoZoom;
          const zoomedHeight = videoHeight * videoZoom;
          const zoomedX = -(zoomedWidth - CANVAS_WIDTH) / 2 + videoOffsetX;
          const zoomedY = -(zoomedHeight - videoHeight) / 2 + videoOffsetY;

          ctx.drawImage(video, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
          ctx.restore();
        }

        // Draw webcam filling remaining space
        if (webcamVideo && webcamVideo.readyState >= 2) {
          drawRotatedWebcam(ctx, webcamVideo, 0, camY, CANVAS_WIDTH, camHeight, webcamRotation, webcamMirrored);
        }
        break;
      }
    }

    // Copy to preview canvas (scaled down)
    if (previewCanvas) {
      const previewCtx = previewCanvas.getContext("2d");
      if (previewCtx) {
        previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      }
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(renderComposition);
  }, [compositionMode, webcamRotation, webcamMirrored, videoZoom, videoOffsetX, videoOffsetY]);

  // Helper function to draw rotated webcam
  function drawRotatedWebcam(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: WebcamRotation,
    mirrored: boolean = false
  ) {
    ctx.save();

    // Calculate center of drawing area
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply mirroring (horizontal flip)
    if (mirrored) {
      ctx.scale(-1, 1);
    }

    // Swap width/height for 90/270 degree rotations
    let drawWidth = width;
    let drawHeight = height;
    if (rotation === 90 || rotation === 270) {
      drawWidth = height;
      drawHeight = width;
    }

    // Calculate source crop to maintain aspect ratio
    const videoAspect = video.videoWidth / video.videoHeight;
    const targetAspect = drawWidth / drawHeight;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (videoAspect > targetAspect) {
      // Video is wider - crop sides
      sw = video.videoHeight * targetAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      // Video is taller - crop top/bottom
      sh = video.videoWidth / targetAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx.drawImage(
      video,
      sx, sy, sw, sh,
      -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
    );

    ctx.restore();
  }

  // Start composition rendering loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderComposition);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderComposition]);

  // Handle video ended - play next in playlist (auto-play)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (playlist.length > 0) {
        const nextIndex = (currentVideoIndex + 1) % playlist.length;
        shouldAutoPlayRef.current = true; // 다음 영상 자동 재생 플래그 설정
        setCurrentVideoIndex(nextIndex);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
    };
  }, [playlist.length, currentVideoIndex]);

  // Load video when currentVideoIndex changes
  // 현재 재생 중인 영상의 ID를 추적하여 playlist 변경 시 위치 유지
  const currentVideoIdRef = useRef<string | null>(null);
  const currentTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

  // playlist가 변경될 때 현재 재생 상태 저장
  useEffect(() => {
    const video = videoRef.current;
    if (video && playlist.length > 0 && currentVideoIndex < playlist.length) {
      currentVideoIdRef.current = playlist[currentVideoIndex]?.id || null;
      currentTimeRef.current = video.currentTime;
      wasPlayingRef.current = isPlaying;
    }
  }, [playlist.length]); // playlist 길이가 변경될 때만

  // currentVideoIndex가 변경될 때만 비디오 로드
  const prevIndexRef = useRef<number>(currentVideoIndex);
  const prevPlaylistLengthRef = useRef<number>(playlist.length);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playlist.length === 0) return;

    const currentItem = playlist[currentVideoIndex];
    if (!currentItem) return;

    // 현재 재생 중인 영상의 ID가 같고 이미 로드된 경우 스킵
    if (currentVideoIdRef.current === currentItem.id && video.src && video.src.includes(currentItem.url)) {
      prevIndexRef.current = currentVideoIndex;
      prevPlaylistLengthRef.current = playlist.length;
      return;
    }

    // 새 영상 로드
    video.src = currentItem.url;
    currentVideoIdRef.current = currentItem.id;
    video.load();

    // 자동 재생이 필요한 경우에만 재생 (영상 끝나서 다음으로 넘어갈 때)
    if (shouldAutoPlayRef.current) {
      video.onloadeddata = () => {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      };
      shouldAutoPlayRef.current = false;
    } else {
      video.onloadeddata = null;
      setIsPlaying(false);
    }

    prevIndexRef.current = currentVideoIndex;
    prevPlaylistLengthRef.current = playlist.length;
  }, [currentVideoIndex, playlist]);

  // Start streaming
  const startStream = useCallback(() => {
    if (!rtmpUrl || !streamKey) {
      alert("RTMP URL과 스트림키를 입력해주세요.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas not initialized. Please wait for the page to fully load.");
      alert("미리보기 캔버스가 초기화되지 않았습니다. 페이지를 새로고침해주세요.");
      return;
    }

    // Connect to WebSocket server
    // Use VITE_API_URL env var if available (for separate backend deployment), otherwise fallback to same origin
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to streaming server");
      setStreamStatus((prev) => ({ ...prev, status: "connecting" }));

      // Get canvas stream with audio from video
      const canvasStream = canvas.captureStream(30);

      // Add audio track from video if available
      const video = videoRef.current;
      if (video && video.srcObject) {
        const audioTracks = (video.srcObject as MediaStream).getAudioTracks();
        audioTracks.forEach((track) => canvasStream.addTrack(track));
      }

      // Create audio context for mixing
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add video audio if available
      if (video && (video as any).captureStream) {
        try {
          const videoStream = (video as any).captureStream();
          const videoAudioTracks = videoStream.getAudioTracks();
          if (videoAudioTracks.length > 0) {
            const videoSource = audioContext.createMediaStreamSource(
              new MediaStream(videoAudioTracks)
            );
            videoSource.connect(destination);
          }
        } catch (e) {
          console.log("Could not capture video audio:", e);
        }
      }

      // Create final stream with canvas video and mixed audio
      const finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      // Start MediaRecorder with high quality settings
      // VP8 is more stable for real-time streaming than VP9
      const mimeType = "video/webm;codecs=vp8,opus";

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 6000000, // 6Mbps for higher quality input
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.connected) {
          event.data.arrayBuffer().then((buffer) => {
            socket.emit("stream-data", buffer);
          });
        }
      };

      mediaRecorder.start(500); // Send data every 500ms - balance between keyframes and latency

      // Send stream config to server with 5500kbps target bitrate
      socket.emit("start-stream", {
        rtmpUrl,
        streamKey,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        frameRate: 30,
        videoBitrate: "5500k", // Target 5500kbps for high quality streaming
        audioBitrate: "192k", // Higher audio bitrate
      });
    });

    socket.on("stream-started", () => {
      setIsStreaming(true);
      setStreamStatus((prev) => ({ ...prev, status: "streaming" }));
    });

    socket.on("stream-status", (status: Partial<StreamStatus>) => {
      setStreamStatus((prev) => ({ ...prev, ...status }));
    });

    socket.on("stream-error", ({ message }: { message: string }) => {
      // 종료 관련 메시지는 에러로 처리하지 않음
      const isShutdownMessage = [
        "Relay session is disconnected",
        "Error writing trailer",
        "Conversion failed",
        "Operation not permitted",
        "Broken pipe",
      ].some(pattern => message.includes(pattern));

      if (isShutdownMessage) {
        console.log("Stream ending:", message);
        return; // 종료 관련 메시지는 무시
      }

      console.error("Stream error:", message);
      setStreamStatus((prev) => ({ ...prev, status: "error" }));
    });

    socket.on("stream-ended", ({ intentional, message: endMessage }: { code?: number; intentional?: boolean; message?: string }) => {
      setIsStreaming(false);
      setStreamStatus((prev) => ({ ...prev, status: "ended" }));
      if (intentional && endMessage) {
        console.log(endMessage);
      }
    });

    socket.on("disconnect", () => {
      setIsStreaming(false);
      setStreamStatus((prev) => ({ ...prev, status: "idle" }));
    });
  }, [rtmpUrl, streamKey]);

  // Stop streaming
  const stopStream = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit("stop-stream");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsStreaming(false);
    setStreamStatus({
      frames: 0,
      fps: 0,
      bitrate: 0,
      status: "idle",
    });
  }, []);

  const value: StreamContextType = {
    rtmpUrl,
    setRtmpUrl,
    streamKey,
    setStreamKey,
    isStreaming,
    streamStatus,
    startStream,
    stopStream,
    webcamStream,
    webcamRotation,
    setWebcamRotation,
    webcamMirrored,
    setWebcamMirrored,
    startWebcam,
    stopWebcam,
    availableCameras,
    selectedCameraId,
    setSelectedCameraId,
    playlist,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    currentVideoIndex,
    setCurrentVideoIndex,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    volume,
    setVolume,
    videoRef,
    compositionMode,
    setCompositionMode,
    canvasRef,
    previewCanvasRef,
    videoZoom,
    setVideoZoom,
    videoOffsetX,
    setVideoOffsetX,
    videoOffsetY,
    setVideoOffsetY,
  };

  return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>;
}

export function useStream() {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error("useStream must be used within a StreamProvider");
  }
  return context;
}
