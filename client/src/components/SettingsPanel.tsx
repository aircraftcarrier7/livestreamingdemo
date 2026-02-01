import { useStream } from "@/contexts/StreamContext";
import { useMoQStream } from "@/contexts/MoQStreamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Wifi, WifiOff, ChevronDown, ChevronUp, Activity, Save, Trash2, FolderOpen, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PerformanceRecord {
  time: string;
  fps: number;
  bitrate: number;
}

interface RtmpPreset {
  id: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
}

const PRESETS_STORAGE_KEY = "rtmp-streamer-presets";

export function SettingsPanel() {
  const {
    rtmpUrl,
    setRtmpUrl,
    streamKey,
    setStreamKey,
    isStreaming: isRtmpStreaming,
    streamStatus: rtmpStreamStatus,
    startStream: startRtmpStream,
    stopStream: stopRtmpStream,
  } = useStream();

  const {
    isStreaming: isMoqStreaming,
    startStream: startMoqStream,
    stopStream: stopMoqStream,
    error: moqError,
  } = useMoQStream();

  const [streamingMode, setStreamingMode] = useState<"rtmp" | "moq">("rtmp");
  const [moqRelayUrl, setMoqRelayUrl] = useState("https://localhost:4443/live"); // Default mock URL

  const isStreaming = isRtmpStreaming || isMoqStreaming;

  const [performanceHistory, setPerformanceHistory] = useState<PerformanceRecord[]>([]);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const lastRecordTimeRef = useRef<number>(0);

  // Preset management
  const [presets, setPresets] = useState<RtmpPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [presetName, setPresetName] = useState("");
  const [isPresetOpen, setIsPresetOpen] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPresets(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load presets:", e);
    }
  }, []);

  // Save presets to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
      console.error("Failed to save presets:", e);
    }
  }, [presets]);

  // Save current settings as preset
  const savePreset = () => {
    if (!rtmpUrl || !presetName.trim()) return;

    const newPreset: RtmpPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      rtmpUrl,
      streamKey,
    };

    setPresets((prev) => [...prev, newPreset]);
    setPresetName("");
    setSelectedPresetId(newPreset.id);
  };

  // Load selected preset
  const loadPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setRtmpUrl(preset.rtmpUrl);
      setStreamKey(preset.streamKey);
      setSelectedPresetId(presetId);
    }
  };

  // Delete preset
  const deletePreset = (presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (selectedPresetId === presetId) {
      setSelectedPresetId("");
    }
  };

  // 방송 시작/종료 시 초기화
  useEffect(() => {
    if (isStreaming) {
      // Start timer logic
      if (streamStartTime === null) {
        setStreamStartTime(Date.now());
        setPerformanceHistory([]);
      }
    } else {
      setStreamStartTime(null);
      setElapsedTime(0);
    }
  }, [isStreaming]);

  // 경과 시간 업데이트
  useEffect(() => {
    if (!isStreaming || streamStartTime === null) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - streamStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, streamStartTime]);

  // 성능 기록 (RTMP Only for now)
  useEffect(() => {
    if (!isRtmpStreaming || rtmpStreamStatus.status !== "streaming") return;

    const now = Date.now();
    if (now - lastRecordTimeRef.current >= 10000) {
      lastRecordTimeRef.current = now;
      const record: PerformanceRecord = {
        time: formatElapsedTime(elapsedTime),
        fps: rtmpStreamStatus.fps,
        bitrate: rtmpStreamStatus.bitrate,
      };
      setPerformanceHistory((prev) => [...prev.slice(-29), record]); // 최근 30개 유지
    }
  }, [isRtmpStreaming, rtmpStreamStatus, elapsedTime]);

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 평균 성능 계산
  const avgFps = performanceHistory.length > 0
    ? performanceHistory.reduce((sum, r) => sum + r.fps, 0) / performanceHistory.length
    : 0;
  const avgBitrate = performanceHistory.length > 0
    ? performanceHistory.reduce((sum, r) => sum + r.bitrate, 0) / performanceHistory.length
    : 0;

  const handleStartStream = async () => {
    if (streamingMode === "rtmp") {
      startRtmpStream();
    } else {
      await startMoqStream(moqRelayUrl);
    }
  };

  const handleStopStream = () => {
    if (streamingMode === "rtmp") {
      stopRtmpStream();
    } else {
      stopMoqStream();
    }
  };

  return (
    <Card className="w-full" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
      <CardHeader className="pb-2 pt-3" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          방송 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 pb-3">

        {/* Mode Switcher */}
        <Tabs defaultValue="rtmp" value={streamingMode} onValueChange={(v) => setStreamingMode(v as "rtmp" | "moq")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="rtmp" disabled={isStreaming} className="text-xs">RTMP (기본)</TabsTrigger>
            <TabsTrigger value="moq" disabled={isStreaming} className="text-xs flex gap-1">
              MoQ (차세대)
              <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rtmp" className="space-y-3 mt-3">
            {/* Preset Management */}
            <Collapsible open={isPresetOpen} onOpenChange={setIsPresetOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full h-7 text-xs flex items-center justify-between px-2"
                  disabled={isStreaming}
                >
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    프리셋 관리
                    {presets.length > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({presets.length}개 저장됨)
                      </span>
                    )}
                  </span>
                  {isPresetOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {/* Load Preset */}
                {presets.length > 0 && (
                  <div className="flex gap-2">
                    <Select
                      value={selectedPresetId}
                      onValueChange={loadPreset}
                      disabled={isStreaming}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="프리셋 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id} className="text-xs">
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPresetId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => deletePreset(selectedPresetId)}
                        disabled={isStreaming}
                        title="프리셋 삭제"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Save New Preset */}
                <div className="flex gap-2">
                  <Input
                    placeholder="프리셋 이름"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    disabled={isStreaming}
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={savePreset}
                    disabled={isStreaming || !rtmpUrl || !presetName.trim()}
                    title="현재 설정 저장"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    <span className="text-xs">저장</span>
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-1">
              <Label htmlFor="rtmp-url" className="text-xs">RTMP 서버 URL</Label>
              <Input
                id="rtmp-url"
                placeholder="rtmp://your-server.com/live"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                disabled={isStreaming}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="stream-key" className="text-xs">스트림키</Label>
              <Input
                id="stream-key"
                type="password"
                placeholder="스트림키를 입력하세요"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                disabled={isStreaming}
                className="h-8 text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="moq" className="space-y-3 mt-3">
            <div className="space-y-1">
              <Label htmlFor="moq-url" className="text-xs">MoQ Relay URL (WebTransport)</Label>
              <Input
                id="moq-url"
                placeholder="https://relay.moq.pub/live"
                value={moqRelayUrl}
                onChange={(e) => setMoqRelayUrl(e.target.value)}
                disabled={isStreaming}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                * Chrome 97+ 필요. HTTPS 필수 (로컬호스트 제외).
              </p>
            </div>
            {moqError && (
              <div className="p-2 bg-destructive/10 text-destructive text-xs rounded">
                서버 오류: {moqError}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Status Display (Only shown for RTMP for now, or unified if simple) */}
        {streamingMode === 'rtmp' && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${rtmpStreamStatus.status === 'streaming' ? 'bg-green-500' :
                rtmpStreamStatus.status === 'error' ? 'bg-red-500' :
                  rtmpStreamStatus.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
              }`} />
            <span className="text-xs font-medium">
              {rtmpStreamStatus.status === 'streaming' ? '방송 중' :
                rtmpStreamStatus.status === 'connecting' ? '연결 중...' :
                  rtmpStreamStatus.status === 'error' ? '오류 발생' : '대기 중'}
            </span>
            {rtmpStreamStatus.status === "streaming" && (
              <>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatElapsedTime(elapsedTime)}
                </span>
                <span className="text-[10px] text-muted-foreground">|</span>
                <span className="text-[10px] text-muted-foreground">
                  {rtmpStreamStatus.fps.toFixed(1)} FPS
                </span>
              </>
            )}
          </div>
        )}

        {streamingMode === 'moq' && isMoqStreaming && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium">MoQ 전송 중</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {formatElapsedTime(elapsedTime)}
            </span>
          </div>
        )}

        {/* Network Monitor (RTMP Only) */}
        {streamingMode === 'rtmp' && rtmpStreamStatus.status === "streaming" && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <div className="text-[10px] text-muted-foreground">인코딩 속도</div>
              <div className={`text-sm font-medium ${(rtmpStreamStatus.speed || 1) < 0.9 ? 'text-destructive' : (rtmpStreamStatus.speed || 1) < 1 ? 'text-yellow-500' : 'text-green-500'}`}>
                {(rtmpStreamStatus.speed || 1).toFixed(2)}x
              </div>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="text-[10px] text-muted-foreground">드롭 프레임</div>
              <div className={`text-sm font-medium ${(rtmpStreamStatus.droppedFrames || 0) > 10 ? 'text-destructive' : (rtmpStreamStatus.droppedFrames || 0) > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                {rtmpStreamStatus.droppedFrames || 0}
              </div>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="text-[10px] text-muted-foreground">품질 (Q)</div>
              <div className="text-sm font-medium">
                {(rtmpStreamStatus.quality || 0).toFixed(1)}
              </div>
            </div>
          </div>
        )}

        <Button
          className="w-full h-9"
          variant={isStreaming ? "destructive" : "default"}
          onClick={isStreaming ? handleStopStream : handleStartStream}
          disabled={streamingMode === "rtmp" ? (!rtmpUrl || !streamKey) : (!moqRelayUrl)}
        >
          {isStreaming ? (
            <>
              <WifiOff className="mr-2 h-4 w-4" />
              방송 중지
            </>
          ) : (
            <>
              <Wifi className="mr-2 h-4 w-4" />
              방송 시작
            </>
          )}
        </Button>

        {/* Performance History - Collapsible (RTMP Only) */}
        {streamingMode === 'rtmp' && (isRtmpStreaming || performanceHistory.length > 0) && (
          <Collapsible open={isPerformanceOpen} onOpenChange={setIsPerformanceOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full h-7 text-xs flex items-center justify-between px-2"
              >
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  성능 기록
                  {performanceHistory.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      (평균 {avgFps.toFixed(1)} FPS, {avgBitrate.toFixed(0)} kbps)
                    </span>
                  )}
                </span>
                {isPerformanceOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="max-h-40 overflow-y-auto space-y-1 text-[10px]">
                {performanceHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-2">
                    10초마다 성능이 기록됩니다
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-muted-foreground font-medium px-1">
                      <span>시간</span>
                      <span>FPS</span>
                      <span>비트레이트</span>
                    </div>
                    {performanceHistory.map((record, index) => (
                      <div
                        key={index}
                        className={`flex justify-between px-1 py-0.5 rounded ${record.fps < 20 || record.bitrate < 1500
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted"
                          }`}
                      >
                        <span>{record.time}</span>
                        <span>{record.fps.toFixed(1)}</span>
                        <span>{record.bitrate.toFixed(0)} kbps</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
