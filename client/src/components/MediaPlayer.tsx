import { useStream } from "@/contexts/StreamContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Film,
  Repeat,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Rewind,
  FastForward,
  Clock,
} from "lucide-react";

export function MediaPlayer() {
  const {
    playlist,
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
    videoZoom,
    setVideoZoom,
    videoOffsetX,
    setVideoOffsetX,
    videoOffsetY,
    setVideoOffsetY,
  } = useStream();

  // 구간 반복 상태
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  
  // 시:분:초 분리 입력 상태 - 시작점
  const [loopStartH, setLoopStartH] = useState("");
  const [loopStartM, setLoopStartM] = useState("");
  const [loopStartS, setLoopStartS] = useState("");
  // 시:분:초 분리 입력 상태 - 끝점
  const [loopEndH, setLoopEndH] = useState("");
  const [loopEndM, setLoopEndM] = useState("");
  const [loopEndS, setLoopEndS] = useState("");
  
  // 타임라인 이동 시간 입력 상태
  const [seekH, setSeekH] = useState("");
  const [seekM, setSeekM] = useState("");
  const [seekS, setSeekS] = useState("");
  
  // 자료화면 확대/이동 접기 상태
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  
  // 이전 영상 인덱스 추적
  const prevVideoIndexRef = useRef(currentVideoIndex);
  const prevPlaylistLengthRef = useRef(playlist.length);

  // 영상 변경 시 구간 반복 초기화
  useEffect(() => {
    if (prevVideoIndexRef.current !== currentVideoIndex || 
        prevPlaylistLengthRef.current !== playlist.length) {
      setLoopStart(null);
      setLoopEnd(null);
      setIsLooping(false);
      setLoopStartH("");
      setLoopStartM("");
      setLoopStartS("");
      setLoopEndH("");
      setLoopEndM("");
      setLoopEndS("");
      prevVideoIndexRef.current = currentVideoIndex;
      prevPlaylistLengthRef.current = playlist.length;
    }
  }, [currentVideoIndex, playlist.length]);

  // 구간 반복 처리
  useEffect(() => {
    if (!isLooping || loopStart === null || loopEnd === null) return;
    
    const video = videoRef.current;
    if (!video) return;

    if (currentTime >= loopEnd) {
      video.currentTime = loopStart;
    }
  }, [currentTime, isLooping, loopStart, loopEnd, videoRef]);

  const currentItem = playlist[currentVideoIndex];

  const formatTimeShort = (time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // 시:분:초 -> 초 변환
  const hmsToSeconds = (h: string, m: string, s: string): number | null => {
    const hours = parseInt(h) || 0;
    const minutes = parseInt(m) || 0;
    const seconds = parseInt(s) || 0;
    if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // 초 -> 시:분:초 변환
  const secondsToHMS = (totalSeconds: number): { h: string; m: string; s: string } => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return {
      h: h > 0 ? h.toString() : "",
      m: m.toString(),
      s: s.toString(),
    };
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 시간 입력으로 이동
  const handleSeekToTime = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const seconds = hmsToSeconds(seekH, seekM, seekS);
    if (seconds !== null && seconds <= duration) {
      video.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value[0];
    setVolume(value[0]);
  };

  const handlePrevious = () => {
    if (playlist.length === 0) return;
    const newIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : playlist.length - 1;
    setCurrentVideoIndex(newIndex);
    setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }, 100);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const newIndex = (currentVideoIndex + 1) % playlist.length;
    setCurrentVideoIndex(newIndex);
    setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }, 100);
  };

  // 구간 반복 설정 (버튼 클릭)
  const setLoopPoint = (type: "start" | "end") => {
    const video = videoRef.current;
    if (!video) return;
    
    if (type === "start") {
      setLoopStart(video.currentTime);
      const hms = secondsToHMS(video.currentTime);
      setLoopStartH(hms.h);
      setLoopStartM(hms.m);
      setLoopStartS(hms.s);
      if (loopEnd !== null && video.currentTime >= loopEnd) {
        setLoopEnd(null);
        setLoopEndH("");
        setLoopEndM("");
        setLoopEndS("");
      }
    } else {
      if (loopStart !== null && video.currentTime > loopStart) {
        setLoopEnd(video.currentTime);
        const hms = secondsToHMS(video.currentTime);
        setLoopEndH(hms.h);
        setLoopEndM(hms.m);
        setLoopEndS(hms.s);
      }
    }
  };

  // 시작점 입력 변경
  const handleLoopStartChange = (h: string, m: string, s: string) => {
    setLoopStartH(h);
    setLoopStartM(m);
    setLoopStartS(s);
    const seconds = hmsToSeconds(h, m, s);
    if (seconds !== null && seconds <= duration) {
      setLoopStart(seconds);
      if (loopEnd !== null && seconds >= loopEnd) {
        setLoopEnd(null);
        setLoopEndH("");
        setLoopEndM("");
        setLoopEndS("");
      }
    }
  };

  // 끝점 입력 변경
  const handleLoopEndChange = (h: string, m: string, s: string) => {
    setLoopEndH(h);
    setLoopEndM(m);
    setLoopEndS(s);
    const seconds = hmsToSeconds(h, m, s);
    if (seconds !== null && loopStart !== null && seconds > loopStart && seconds <= duration) {
      setLoopEnd(seconds);
    }
  };

  const toggleLoop = () => {
    if (loopStart !== null && loopEnd !== null) {
      setIsLooping(!isLooping);
    }
  };

  const clearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
    setLoopStartH("");
    setLoopStartM("");
    setLoopStartS("");
    setLoopEndH("");
    setLoopEndM("");
    setLoopEndS("");
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const video = videoRef.current;
      if (!video || !currentItem) return;

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        let skipAmount = 1;
        if (e.shiftKey && e.ctrlKey) skipAmount = 300;
        else if (e.ctrlKey) skipAmount = 60;
        else if (e.shiftKey) skipAmount = 10;
        
        if (e.code === "ArrowLeft") skip(-skipAmount);
        else skip(skipAmount);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentItem, isPlaying]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-1 pt-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="h-4 w-4" />
          미디어 플레이어
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 pb-3">
        {/* Current playing info */}
        <div className="text-xs text-center bg-muted p-2 rounded break-all leading-relaxed">
          {currentItem ? (
            <span className="flex items-center justify-center gap-1.5">
              {isPlaying && <Play className="h-3 w-3 fill-current shrink-0" />}
              <span>{currentItem.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">재생할 영상이 없습니다</span>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-1">
          <div className="relative">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              disabled={!currentItem}
              className="cursor-pointer"
            />
            {/* 구간 반복 표시 */}
            {loopStart !== null && duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 bg-primary/30 pointer-events-none rounded"
                style={{
                  left: `${(loopStart / duration) * 100}%`,
                  width: loopEnd !== null ? `${((loopEnd - loopStart) / duration) * 100}%` : '2px',
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatTimeShort(currentTime)}</span>
            <span>{formatTimeShort(duration)}</span>
          </div>
        </div>

        {/* 시간 입력으로 이동 */}
        <div className="flex items-center gap-1 justify-center">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <Input
            type="number"
            placeholder="시"
            value={seekH}
            onChange={(e) => setSeekH(e.target.value)}
            disabled={!currentItem}
            className="h-6 w-10 text-[10px] text-center px-1"
            min="0"
          />
          <span className="text-[10px]">:</span>
          <Input
            type="number"
            placeholder="분"
            value={seekM}
            onChange={(e) => setSeekM(e.target.value)}
            disabled={!currentItem}
            className="h-6 w-10 text-[10px] text-center px-1"
            min="0"
            max="59"
          />
          <span className="text-[10px]">:</span>
          <Input
            type="number"
            placeholder="초"
            value={seekS}
            onChange={(e) => setSeekS(e.target.value)}
            disabled={!currentItem}
            className="h-6 w-10 text-[10px] text-center px-1"
            min="0"
            max="59"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={handleSeekToTime}
            disabled={!currentItem}
          >
            이동
          </Button>
        </div>

        {/* Skip Controls - 한 줄로 */}
        <div className="flex items-center justify-center gap-0.5">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => skip(-300)} disabled={!currentItem} title="5분 뒤로">
            <Rewind className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1 text-[9px]" onClick={() => skip(-60)} disabled={!currentItem} title="1분 뒤로">
            -1m
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1 text-[9px]" onClick={() => skip(-10)} disabled={!currentItem} title="10초 뒤로">
            -10s
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1 text-[9px]" onClick={() => skip(-1)} disabled={!currentItem} title="1초 뒤로">
            -1s
          </Button>
          
          {/* Main Controls */}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePrevious} disabled={playlist.length === 0}>
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="default" className="h-9 w-9" onClick={handlePlayPause} disabled={playlist.length === 0}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNext} disabled={playlist.length === 0}>
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          
          <Button size="sm" variant="ghost" className="h-6 px-1 text-[9px]" onClick={() => skip(1)} disabled={!currentItem} title="1초 앞으로">
            +1s
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1 text-[9px]" onClick={() => skip(10)} disabled={!currentItem} title="10초 앞으로">
            +10s
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1 text-[9px]" onClick={() => skip(60)} disabled={!currentItem} title="1분 앞으로">
            +1m
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => skip(300)} disabled={!currentItem} title="5분 앞으로">
            <FastForward className="h-3 w-3" />
          </Button>
        </div>

        {/* 구간 반복 - 시작/끝 박스 분리 */}
        <div className="border rounded-md p-2 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              구간 반복
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={isLooping ? "default" : "outline"}
                className="h-5 px-2 text-[9px]"
                onClick={toggleLoop}
                disabled={loopStart === null || loopEnd === null}
              >
                {isLooping ? "반복 중" : "반복"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-2 text-[9px]"
                onClick={clearLoop}
                disabled={loopStart === null && loopEnd === null}
              >
                초기화
              </Button>
            </div>
          </div>
          
          {/* 시작/끝 박스 가로 배치 */}
          <div className="flex gap-2">
            {/* 시작점 박스 */}
            <div className="flex-1 border rounded p-2 bg-background/50">
              <Button
                size="sm"
                variant={loopStart !== null ? "secondary" : "outline"}
                className="w-full h-6 text-[10px] mb-1.5"
                onClick={() => setLoopPoint("start")}
                disabled={!currentItem}
              >
                시작점 설정
              </Button>
              <div className="flex items-center gap-0.5 justify-center">
                <Input
                  type="number"
                  placeholder="시"
                  value={loopStartH}
                  onChange={(e) => handleLoopStartChange(e.target.value, loopStartM, loopStartS)}
                  disabled={!currentItem}
                  className="h-6 w-10 text-[10px] text-center px-1"
                  min="0"
                />
                <span className="text-[10px]">:</span>
                <Input
                  type="number"
                  placeholder="분"
                  value={loopStartM}
                  onChange={(e) => handleLoopStartChange(loopStartH, e.target.value, loopStartS)}
                  disabled={!currentItem}
                  className="h-6 w-10 text-[10px] text-center px-1"
                  min="0"
                  max="59"
                />
                <span className="text-[10px]">:</span>
                <Input
                  type="number"
                  placeholder="초"
                  value={loopStartS}
                  onChange={(e) => handleLoopStartChange(loopStartH, loopStartM, e.target.value)}
                  disabled={!currentItem}
                  className="h-6 w-10 text-[10px] text-center px-1"
                  min="0"
                  max="59"
                />
              </div>
            </div>
            
            {/* 끝점 박스 */}
            <div className="flex-1 border rounded p-2 bg-background/50">
              <Button
                size="sm"
                variant={loopEnd !== null ? "secondary" : "outline"}
                className="w-full h-6 text-[10px] mb-1.5"
                onClick={() => setLoopPoint("end")}
                disabled={!currentItem || loopStart === null}
              >
                끝점 설정
              </Button>
              <div className="flex items-center gap-0.5 justify-center">
                <Input
                  type="number"
                  placeholder="시"
                  value={loopEndH}
                  onChange={(e) => handleLoopEndChange(e.target.value, loopEndM, loopEndS)}
                  disabled={!currentItem || loopStart === null}
                  className="h-6 w-10 text-[10px] text-center px-1"
                  min="0"
                />
                <span className="text-[10px]">:</span>
                <Input
                  type="number"
                  placeholder="분"
                  value={loopEndM}
                  onChange={(e) => handleLoopEndChange(loopEndH, e.target.value, loopEndS)}
                  disabled={!currentItem || loopStart === null}
                  className="h-6 w-10 text-[10px] text-center px-1"
                  min="0"
                  max="59"
                />
                <span className="text-[10px]">:</span>
                <Input
                  type="number"
                  placeholder="초"
                  value={loopEndS}
                  onChange={(e) => handleLoopEndChange(loopEndH, loopEndM, e.target.value)}
                  disabled={!currentItem || loopStart === null}
                  className="h-6 w-10 text-[10px] text-center px-1"
                  min="0"
                  max="59"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                video.muted = !video.muted;
                setVolume(video.muted ? 0 : 1);
              }
            }}
          >
            {volume === 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* 자료화면 확대/이동 - Collapsible */}
        <Collapsible open={isZoomOpen} onOpenChange={setIsZoomOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-6 text-[10px] flex items-center justify-between px-2"
            >
              <span className="flex items-center gap-1">
                <ZoomIn className="h-3 w-3" />
                자료화면 확대/이동
              </span>
              {isZoomOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {/* Zoom Control */}
            <div className="flex items-center gap-2">
              <ZoomOut className="h-3 w-3 text-muted-foreground" />
              <Slider
                value={[videoZoom]}
                min={0.5}
                max={3}
                step={0.1}
                onValueChange={(v) => setVideoZoom(v[0])}
                className="flex-1"
              />
              <ZoomIn className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] w-10 text-right">{Math.round(videoZoom * 100)}%</span>
            </div>

            {/* Offset Controls */}
            <div className="flex items-center gap-2">
              <Move className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1 flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground">X</span>
                <Slider
                  value={[videoOffsetX]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={(v) => setVideoOffsetX(v[0])}
                  className="flex-1"
                />
                <span className="text-[9px] w-6 text-right">{videoOffsetX}</span>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground">Y</span>
                <Slider
                  value={[videoOffsetY]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={(v) => setVideoOffsetY(v[0])}
                  className="flex-1"
                />
                <span className="text-[9px] w-6 text-right">{videoOffsetY}</span>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px]"
              onClick={() => {
                setVideoZoom(1);
                setVideoOffsetX(0);
                setVideoOffsetY(0);
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              초기화
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Keyboard shortcuts hint */}
        <div className="text-[9px] text-muted-foreground text-center">
          ←→ 1초 · +Shift 10초 · +Ctrl 1분 · +모두 5분 · Space 재생
        </div>
      </CardContent>
    </Card>
  );
}
