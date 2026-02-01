import { useStream } from "@/contexts/StreamContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, RotateCw, Video, VideoOff, FlipHorizontal } from "lucide-react";
import type { WebcamRotation } from "../../../shared/streamTypes";

export function WebcamPanel() {
  const {
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
  } = useStream();

  const rotationOptions: { value: WebcamRotation; label: string }[] = [
    { value: 0, label: "0° (기본)" },
    { value: 90, label: "90° (시계방향)" },
    { value: 180, label: "180° (뒤집기)" },
    { value: 270, label: "270° (반시계방향)" },
  ];

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (webcamStream) {
      await startWebcam(deviceId);
    }
  };

  const handleToggleWebcam = async () => {
    if (webcamStream) {
      stopWebcam();
    } else {
      await startWebcam(selectedCameraId);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" />
          웹캠 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 pb-3">
        <div className="space-y-1">
          <Label className="text-xs">카메라 선택</Label>
          <Select value={selectedCameraId} onValueChange={handleCameraChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="카메라를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {availableCameras.map((camera) => (
                <SelectItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `카메라 ${camera.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">회전</Label>
            <Select
              value={String(webcamRotation)}
              onValueChange={(v) => setWebcamRotation(Number(v) as WebcamRotation)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rotationOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    <span className="flex items-center gap-2">
                      <RotateCw
                        className="h-3 w-3"
                        style={{ transform: `rotate(${option.value}deg)` }}
                      />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">좌우 반전</Label>
            <div className="flex items-center h-8 gap-2 px-2 border rounded-md bg-background">
              <FlipHorizontal className={`h-4 w-4 ${webcamMirrored ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                checked={webcamMirrored}
                onCheckedChange={setWebcamMirrored}
              />
            </div>
          </div>
        </div>

        <Button
          className="w-full h-9"
          variant={webcamStream ? "destructive" : "secondary"}
          onClick={handleToggleWebcam}
        >
          {webcamStream ? (
            <>
              <VideoOff className="mr-2 h-4 w-4" />
              웹캠 끄기
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              웹캠 켜기
            </>
          )}
        </Button>

        {webcamStream && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            웹캠 활성화됨
          </div>
        )}
      </CardContent>
    </Card>
  );
}
