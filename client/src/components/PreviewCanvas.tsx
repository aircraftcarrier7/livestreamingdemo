import { useEffect, useRef, useState, useCallback } from "react";
import { useStream } from "@/contexts/StreamContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Radio, PictureInPicture2, X } from "lucide-react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../../shared/streamTypes";

export function PreviewCanvas() {
  const { canvasRef, previewCanvasRef, isStreaming, streamStatus } = useStream();
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const pipStreamRef = useRef<MediaStream | null>(null);

  // Check PiP support
  useEffect(() => {
    setIsPipSupported('pictureInPictureEnabled' in document && document.pictureInPictureEnabled);
  }, []);

  // Initialize canvases - run on every render to ensure refs are set
  useEffect(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;

    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      console.log("Main canvas initialized:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);
    }

    if (previewCanvas) {
      // Preview is scaled down for display
      previewCanvas.width = 300;
      previewCanvas.height = 533;
      console.log("Preview canvas initialized: 300 x 533");
    }
  });

  // Create video element for PiP from main canvas stream
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create hidden video element for PiP
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    pipVideoRef.current = video;

    // Handle PiP events
    video.addEventListener('enterpictureinpicture', () => setIsPipActive(true));
    video.addEventListener('leavepictureinpicture', () => setIsPipActive(false));

    // Function to update stream from canvas
    const updateStream = () => {
      try {
        // Capture stream from main canvas (full resolution)
        const stream = canvas.captureStream(30);
        pipStreamRef.current = stream;
        video.srcObject = stream;
        
        // Ensure video plays
        video.play().catch(err => {
          console.log('PiP video play error:', err);
        });
      } catch (err) {
        console.log('Canvas capture error:', err);
      }
    };

    // Initial stream setup
    updateStream();

    // Update stream periodically to keep it fresh
    const intervalId = setInterval(updateStream, 5000);

    return () => {
      clearInterval(intervalId);
      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(() => {});
      }
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach(track => track.stop());
        pipStreamRef.current = null;
      }
      video.remove();
      pipVideoRef.current = null;
    };
  }, [canvasRef]);

  // Auto-enable PiP when window loses focus (if streaming)
  useEffect(() => {
    if (!isPipSupported || !isStreaming) return;

    const handleVisibilityChange = async () => {
      const video = pipVideoRef.current;
      if (!video) return;

      if (document.hidden && isStreaming && !isPipActive) {
        try {
          // Ensure video is playing before requesting PiP
          if (video.paused) {
            await video.play();
          }
          await video.requestPictureInPicture();
        } catch (error) {
          console.log('Auto PiP failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPipSupported, isStreaming, isPipActive]);

  // Toggle PiP manually
  const togglePip = useCallback(async () => {
    const video = pipVideoRef.current;
    if (!video || !isPipSupported) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        // Ensure video is playing before requesting PiP
        if (video.paused) {
          await video.play();
        }
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP toggle failed:', error);
    }
  }, [isPipSupported]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            미리보기
          </span>
          <div className="flex items-center gap-2">
            {isPipSupported && (
              <Button
                size="sm"
                variant={isPipActive ? "secondary" : "ghost"}
                className="h-6 px-2 text-[10px]"
                onClick={togglePip}
                title="Picture-in-Picture 모드 (창 전환 시 자동 활성화)"
              >
                {isPipActive ? (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    PiP 종료
                  </>
                ) : (
                  <>
                    <PictureInPicture2 className="h-3 w-3 mr-1" />
                    PiP
                  </>
                )}
              </Button>
            )}
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="relative mx-auto" style={{ maxWidth: "300px" }}>
          {/* Hidden main canvas for streaming */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Visible preview canvas */}
          <canvas
            ref={previewCanvasRef}
            className="w-full rounded-lg border bg-black"
            style={{ aspectRatio: "9/16", width: '300px' }}
          />

          {/* Overlay info */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-white/80 bg-black/50 rounded px-2 py-1">
            <span>9:16 | {CANVAS_WIDTH}x{CANVAS_HEIGHT}</span>
            {streamStatus.status === "streaming" && (
              <span>{streamStatus.fps.toFixed(0)} FPS</span>
            )}
          </div>

          {/* PiP active indicator */}
          {isPipActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
              <div className="text-center text-white">
                <PictureInPicture2 className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">PiP 모드 활성화</p>
                <p className="text-xs text-white/70">별도 창에서 미리보기 중</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground text-center">
          {isPipSupported ? (
            <>실시간 합성 미리보기 • 방송 중 창 전환 시 자동 PiP</>
          ) : (
            <>실시간 합성 미리보기</>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
