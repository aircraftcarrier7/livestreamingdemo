// Stream configuration types
export interface StreamConfig {
  rtmpUrl: string;
  streamKey: string;
  width?: number;
  height?: number;
  frameRate?: number;
  audioBitrate?: string;
  videoBitrate?: string;
}

export interface StreamStatus {
  frames: number;
  fps: number;
  bitrate: number;
  status: "idle" | "connecting" | "streaming" | "error" | "ended";
  // Network monitoring
  droppedFrames?: number;
  speed?: number; // Encoding speed (1x = realtime)
  quality?: number; // Quality factor (lower = better)
}

// Composition mode types
export type CompositionMode = "cam-only" | "video-only" | "composite-1" | "composite-2";

// Webcam rotation types
export type WebcamRotation = 0 | 90 | 180 | 270;

// Playlist item types
export interface PlaylistItem {
  id: string;
  name: string;
  file: File;
  url: string;
  duration?: number;
}

// Canvas dimensions for 9:16 aspect ratio
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
export const GAP_HEIGHT = 20; // Gap between video and cam

// Aspect ratio constants
export const ASPECT_16_9 = 16 / 9;
export const ASPECT_4_3 = 4 / 3;
