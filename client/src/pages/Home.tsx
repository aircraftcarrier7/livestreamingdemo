import { StreamProvider } from "@/contexts/StreamContext";
import { SettingsPanel } from "@/components/SettingsPanel";
import { WebcamPanel } from "@/components/WebcamPanel";
import { PlaylistPanel } from "@/components/PlaylistPanel";
import { MediaPlayer } from "@/components/MediaPlayer";
import { CompositionModeSelector } from "@/components/CompositionModeSelector";
import { PreviewCanvas } from "@/components/PreviewCanvas";
import { Radio } from "lucide-react";

function StreamerApp() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[800px] mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Radio className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold">Web RTMP Streamer</h1>
              <p className="text-[10px] text-muted-foreground">
                9:16 세로 방송 송출 시스템
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout with max-width 800px */}
      <main className="max-w-[800px] mx-auto px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left Column: RTMP 설정 → 미리보기 → 화면 합성 모드 */}
          <div className="space-y-3">
            <SettingsPanel />
            <PreviewCanvas />
            <CompositionModeSelector />
          </div>

          {/* Right Column: 웹캠 설정 → 재생목록 → 미디어 플레이어 */}
          <div className="space-y-3">
            <WebcamPanel />
            <PlaylistPanel />
            <MediaPlayer />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <StreamProvider>
      <StreamerApp />
    </StreamProvider>
  );
}
