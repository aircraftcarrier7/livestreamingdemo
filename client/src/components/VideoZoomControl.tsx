import { useStream } from "@/contexts/StreamContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";

export function VideoZoomControl() {
  const {
    videoZoom,
    setVideoZoom,
    videoOffsetX,
    setVideoOffsetX,
    videoOffsetY,
    setVideoOffsetY,
    playlist,
  } = useStream();

  const handleZoomChange = (value: number[]) => {
    setVideoZoom(value[0]);
  };

  const handleOffsetXChange = (value: number[]) => {
    setVideoOffsetX(value[0]);
  };

  const handleOffsetYChange = (value: number[]) => {
    setVideoOffsetY(value[0]);
  };

  const resetZoom = () => {
    setVideoZoom(1);
    setVideoOffsetX(0);
    setVideoOffsetY(0);
  };

  const zoomIn = () => {
    setVideoZoom(Math.min(3, videoZoom + 0.1));
  };

  const zoomOut = () => {
    setVideoZoom(Math.max(0.5, videoZoom - 0.1));
  };

  const hasVideo = playlist.length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <ZoomIn className="h-4 w-4" />
            자료화면 확대/이동
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={resetZoom}
            disabled={!hasVideo || (videoZoom === 1 && videoOffsetX === 0 && videoOffsetY === 0)}
            title="초기화"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            초기화
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 pb-3">
        {/* Zoom control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <ZoomIn className="h-3 w-3" />
              확대/축소
            </span>
            <span className="text-muted-foreground">{Math.round(videoZoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={zoomOut}
              disabled={!hasVideo || videoZoom <= 0.5}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Slider
              value={[videoZoom]}
              min={0.5}
              max={3}
              step={0.05}
              onValueChange={handleZoomChange}
              disabled={!hasVideo}
              className="flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={zoomIn}
              disabled={!hasVideo || videoZoom >= 3}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* X offset control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Move className="h-3 w-3" />
              좌우 이동
            </span>
            <span className="text-muted-foreground">{videoOffsetX > 0 ? '+' : ''}{videoOffsetX}px</span>
          </div>
          <Slider
            value={[videoOffsetX]}
            min={-500}
            max={500}
            step={10}
            onValueChange={handleOffsetXChange}
            disabled={!hasVideo}
          />
        </div>

        {/* Y offset control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Move className="h-3 w-3" />
              상하 이동
            </span>
            <span className="text-muted-foreground">{videoOffsetY > 0 ? '+' : ''}{videoOffsetY}px</span>
          </div>
          <Slider
            value={[videoOffsetY]}
            min={-500}
            max={500}
            step={10}
            onValueChange={handleOffsetYChange}
            disabled={!hasVideo}
          />
        </div>

        <div className="text-[9px] text-muted-foreground text-center">
          자료화면 영역을 확대하거나 위치를 조정합니다
        </div>
      </CardContent>
    </Card>
  );
}
