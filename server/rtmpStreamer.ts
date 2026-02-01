import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Monitoring log file path
const MONITOR_LOG_PATH = path.join(process.cwd(), "stream-monitor.log");

// Log monitoring data to file
function logMonitorData(data: {
  timestamp: string;
  frames: number;
  fps: number;
  bitrate: number;
  droppedFrames: number;
  speed: number;
  quality: number;
  rawMessage?: string;
}) {
  const logLine = JSON.stringify(data) + "\n";
  fs.appendFileSync(MONITOR_LOG_PATH, logLine);
}

// Clear log file on stream start
function clearMonitorLog() {
  try {
    fs.writeFileSync(MONITOR_LOG_PATH, "");
  } catch (e) {
    console.error("[RTMP] Failed to clear monitor log:", e);
  }
}

interface StreamConfig {
  rtmpUrl: string;
  streamKey: string;
  width?: number;
  height?: number;
  frameRate?: number;
  audioBitrate?: string;
  videoBitrate?: string;
}

interface ActiveStream {
  ffmpeg: ChildProcess;
  socket: Socket;
  config: StreamConfig;
  startTime: number;
  isStopping: boolean; // 종료 중인지 추적
}

const activeStreams = new Map<string, ActiveStream>();

export function checkFfmpegAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegCheck = spawn("ffmpeg", ["-version"]);
    ffmpegCheck.on("error", () => resolve(false));
    ffmpegCheck.on("close", (code) => resolve(code === 0));
  });
}

export function setupRtmpStreamer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for video chunks
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[RTMP] Client connected: ${socket.id}`);

    socket.on("start-stream", (config: StreamConfig) => {
      try {
        startStream(socket, config);
      } catch (error) {
        socket.emit("stream-error", {
          message: error instanceof Error ? error.message : "Failed to start stream",
        });
      }
    });

    socket.on("stream-data", (data: ArrayBuffer) => {
      const stream = activeStreams.get(socket.id);
      if (stream && stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed && !stream.isStopping) {
        try {
          stream.ffmpeg.stdin.write(Buffer.from(data));
        } catch (error) {
          console.error(`[RTMP] Error writing to ffmpeg:`, error);
        }
      }
    });

    socket.on("stop-stream", () => {
      stopStream(socket.id);
    });

    socket.on("disconnect", () => {
      console.log(`[RTMP] Client disconnected: ${socket.id}`);
      stopStream(socket.id);
    });
  });

  return io;
}

// 종료 관련 메시지인지 확인하는 함수
function isShutdownMessage(message: string): boolean {
  const shutdownPatterns = [
    "Relay session is disconnected",
    "Error writing trailer",
    "Conversion failed",
    "Operation not permitted",
    "av_interleaved_write_frame",
    "Broken pipe",
    "Connection reset by peer",
  ];
  return shutdownPatterns.some(pattern => message.includes(pattern));
}

function startStream(socket: Socket, config: StreamConfig): void {
  // Stop existing stream if any
  stopStream(socket.id);
  
  // Clear monitor log for new stream
  clearMonitorLog();

  const {
    rtmpUrl,
    streamKey,
    width = 1080,
    height = 1920,
    frameRate = 30,
    audioBitrate = "192k",
    videoBitrate = "5500k", // Default 5500kbps for high quality
  } = config;

  const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;

  console.log(`[RTMP] Starting stream to: ${rtmpUrl}/***`);

  // FFmpeg command for RTMP streaming
  // Input: WebM from browser (VP8/VP9 video + Opus audio)
  // Output: H.264 + AAC for RTMP
  const bitrateNum = parseInt(videoBitrate);
  const ffmpegArgs = [
    // Input settings - wait for keyframe before processing
    "-fflags", "+genpts+discardcorrupt",
    "-i", "pipe:0",
    // Video encoding
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "zerolatency",
    "-profile:v", "baseline",
    "-level", "4.0",
    // Bitrate settings
    "-b:v", "4000k",
    "-maxrate", "5000k",
    "-bufsize", "10000k",
    "-pix_fmt", "yuv420p",
    // Keyframe settings
    "-g", "60",
    "-keyint_min", "30",
    "-sc_threshold", "0",
    // Video filter
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=30`,
    // Audio encoding
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    "-ac", "2",
    // Sync settings
    "-vsync", "cfr",
    "-async", "1",
    // Output format
    "-f", "flv",
    "-flvflags", "no_duration_filesize",
    fullRtmpUrl,
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  ffmpeg.stdout?.on("data", (data) => {
    console.log(`[RTMP] ffmpeg stdout: ${data}`);
  });

  ffmpeg.stderr?.on("data", (data) => {
    const message = data.toString();
    const stream = activeStreams.get(socket.id);
    
    // 종료 중이거나 종료 관련 메시지는 에러로 처리하지 않음
    if (stream?.isStopping || isShutdownMessage(message)) {
      if (message.includes("Error") || message.includes("error") || message.includes("failed")) {
        console.log(`[RTMP] Stream ending: ${message.trim()}`);
        // 종료 관련 메시지는 클라이언트에 에러로 보내지 않음
      }
      return;
    }
    
    // 실제 에러 메시지 처리
    if (message.includes("Error") || message.includes("error") || message.includes("failed")) {
      console.error(`[RTMP] ffmpeg error: ${message}`);
      socket.emit("stream-error", { message });
    } else if (message.includes("frame=")) {
      // Extract frame info for status updates
      const frameMatch = message.match(/frame=\s*(\d+)/);
      const fpsMatch = message.match(/fps=\s*([\d.]+)/);
      const bitrateMatch = message.match(/bitrate=\s*([\d.]+)kbits/);
      const dropMatch = message.match(/drop=\s*(\d+)/);
      const speedMatch = message.match(/speed=\s*([\d.]+)x/);
      const qMatch = message.match(/q=\s*([\d.]+)/);
      
      if (frameMatch) {
        const statusData = {
          frames: parseInt(frameMatch[1]),
          fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
          bitrate: bitrateMatch ? parseFloat(bitrateMatch[1]) : 0,
          droppedFrames: dropMatch ? parseInt(dropMatch[1]) : 0,
          speed: speedMatch ? parseFloat(speedMatch[1]) : 1,
          quality: qMatch ? parseFloat(qMatch[1]) : 0,
          status: "streaming" as const,
        };
        
        // Log to file for analysis
        logMonitorData({
          timestamp: new Date().toISOString(),
          ...statusData,
          rawMessage: message.trim(),
        });
        
        socket.emit("stream-status", statusData);
      }
    }
  });

  ffmpeg.on("close", (code) => {
    const stream = activeStreams.get(socket.id);
    const wasIntentionallyStopped = stream?.isStopping;
    
    console.log(`[RTMP] ffmpeg process exited with code ${code}${wasIntentionallyStopped ? ' (intentional stop)' : ''}`);
    activeStreams.delete(socket.id);
    
    // 의도적 종료인 경우 정상 종료로 처리
    socket.emit("stream-ended", { 
      code,
      intentional: wasIntentionallyStopped,
      message: wasIntentionallyStopped ? "방송이 정상적으로 종료되었습니다." : undefined
    });
  });

  ffmpeg.on("error", (error) => {
    const stream = activeStreams.get(socket.id);
    if (stream?.isStopping) {
      console.log(`[RTMP] ffmpeg process ended during shutdown`);
      return;
    }
    
    console.error(`[RTMP] ffmpeg process error:`, error);
    socket.emit("stream-error", { message: error.message });
    activeStreams.delete(socket.id);
  });

  activeStreams.set(socket.id, {
    ffmpeg,
    socket,
    config,
    startTime: Date.now(),
    isStopping: false,
  });

  socket.emit("stream-started", {
    message: "Stream started successfully",
    startTime: Date.now(),
  });
}

function stopStream(socketId: string): void {
  const stream = activeStreams.get(socketId);
  if (stream) {
    console.log(`[RTMP] Stopping stream for: ${socketId}`);
    
    // 종료 중 플래그 설정
    stream.isStopping = true;
    
    try {
      // stdin을 먼저 정상적으로 종료
      if (stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
        stream.ffmpeg.stdin.end();
      }
      
      // 잠시 후 프로세스 종료 (graceful shutdown을 위해)
      setTimeout(() => {
        try {
          if (!stream.ffmpeg.killed) {
            stream.ffmpeg.kill("SIGTERM");
          }
        } catch (e) {
          // 이미 종료된 경우 무시
        }
      }, 500);
      
    } catch (error) {
      console.error(`[RTMP] Error stopping stream:`, error);
    }
    
    // 맵에서는 바로 삭제하지 않고 close 이벤트에서 삭제
  }
}

export function getActiveStreamsCount(): number {
  return activeStreams.size;
}
