import { useRef } from "react";
import { useStream } from "@/contexts/StreamContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ListVideo,
  Plus,
  Trash2,
  Play,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export function PlaylistPanel() {
  const {
    playlist,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    currentVideoIndex,
    setCurrentVideoIndex,
    setIsPlaying,
    videoRef,
  } = useStream();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addToPlaylist(e.target.files);
      e.target.value = "";
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < playlist.length) {
      reorderPlaylist(index, newIndex);
      // Update current index if needed
      if (currentVideoIndex === index) {
        setCurrentVideoIndex(newIndex);
      } else if (currentVideoIndex === newIndex) {
        setCurrentVideoIndex(index);
      }
    }
  };

  const handleSelectVideo = (index: number) => {
    setCurrentVideoIndex(index);
    // 선택 시 자동 재생
    setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    }, 100);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <ListVideo className="h-4 w-4" />
            재생목록
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-3 w-3 mr-1" />
            추가
          </Button>
        </CardTitle>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {playlist.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ListVideo className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">영상 파일을 추가해주세요</p>
            <p className="text-xs mt-1">무한 반복 재생됩니다</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-1.5">
              {playlist.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-1.5 p-1.5 rounded-lg border transition-colors ${
                    currentVideoIndex === index
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/50 border-transparent hover:bg-muted"
                  }`}
                >
                  {/* 왼쪽: 컨트롤 버튼들 */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => moveItem(index, "down")}
                      disabled={index === playlist.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => removeFromPlaylist(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* 오른쪽: 제목 (줄바꿈 허용) */}
                  <button
                    className="flex-1 text-left py-1"
                    onClick={() => handleSelectVideo(index)}
                  >
                    <span className="flex items-start gap-1.5">
                      {currentVideoIndex === index && (
                        <Play className="h-3 w-3 text-primary fill-primary shrink-0 mt-0.5" />
                      )}
                      <span className="text-muted-foreground text-xs shrink-0">
                        {index + 1}.
                      </span>
                      <span className="text-xs leading-relaxed break-all">
                        {item.name}
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {playlist.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            총 {playlist.length}개 영상 | 무한 반복 재생
          </div>
        )}
      </CardContent>
    </Card>
  );
}
