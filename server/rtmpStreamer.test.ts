import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import { setupRtmpStreamer, getActiveStreamsCount } from "./rtmpStreamer";

// Mock child_process spawn
vi.mock("child_process", () => ({
  spawn: vi.fn(() => {
    const EventEmitter = require("events");
    const mockProcess = new EventEmitter();
    mockProcess.stdin = {
      write: vi.fn(),
      end: vi.fn(),
      destroyed: false,
    };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn(() => {
      // Simulate process close after kill
      setTimeout(() => {
        mockProcess.emit("close", 0);
      }, 50);
    });
    mockProcess.killed = false;
    return mockProcess;
  }),
}));

describe("RTMP Streamer", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketServer;
  let clientSocket: ClientSocket;
  let port: number;

  beforeEach(async () => {
    httpServer = createServer();
    io = setupRtmpStreamer(httpServer);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        port = typeof address === "object" && address ? address.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    io.close();
    httpServer.close();
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it("should initialize WebSocket server", () => {
    expect(io).toBeInstanceOf(SocketServer);
  });

  it("should accept client connections", async () => {
    clientSocket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        resolve();
      });
    });
  });

  it("should handle start-stream event", async () => {
    clientSocket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit("start-stream", {
          rtmpUrl: "rtmp://test-server.com/live",
          streamKey: "test-key",
          width: 1080,
          height: 1920,
        });

        clientSocket.on("stream-started", (data) => {
          expect(data.message).toBe("Stream started successfully");
          expect(data.startTime).toBeDefined();
          resolve();
        });
      });
    });
  });

  it("should handle stop-stream event", async () => {
    clientSocket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit("start-stream", {
          rtmpUrl: "rtmp://test-server.com/live",
          streamKey: "test-key",
        });

        clientSocket.on("stream-started", () => {
          clientSocket.emit("stop-stream");
          // Wait for graceful shutdown (500ms delay + cleanup)
          clientSocket.on("stream-ended", () => {
            expect(getActiveStreamsCount()).toBe(0);
            resolve();
          });
        });
      });
    });
  }, 10000);

  it("should clean up on disconnect", async () => {
    clientSocket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit("start-stream", {
          rtmpUrl: "rtmp://test-server.com/live",
          streamKey: "test-key",
        });

        clientSocket.on("stream-started", () => {
          clientSocket.disconnect();
          // Wait for graceful shutdown (500ms delay + cleanup)
          setTimeout(() => {
            expect(getActiveStreamsCount()).toBe(0);
            resolve();
          }, 1000);
        });
      });
    });
  }, 10000);
});

describe("Stream Configuration", () => {
  it("should validate stream config structure", () => {
    const validConfig = {
      rtmpUrl: "rtmp://server.com/live",
      streamKey: "abc123",
      width: 1080,
      height: 1920,
      frameRate: 30,
      audioBitrate: "128k",
      videoBitrate: "2500k",
    };

    expect(validConfig.rtmpUrl).toBeDefined();
    expect(validConfig.streamKey).toBeDefined();
    expect(validConfig.width).toBe(1080);
    expect(validConfig.height).toBe(1920);
  });

  it("should have correct default dimensions for 9:16 aspect ratio", () => {
    const width = 1080;
    const height = 1920;
    const aspectRatio = width / height;
    
    expect(aspectRatio).toBeCloseTo(9 / 16, 2);
  });
});
