import { useStream } from "@/contexts/StreamContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import type { CompositionMode } from "../../../shared/streamTypes";

interface ModeOption {
  value: CompositionMode;
  label: string;
  description: string;
  preview: React.ReactNode;
}

export function CompositionModeSelector() {
  const { compositionMode, setCompositionMode } = useStream();

  // 9:16 비율 기준 실제 계산
  // 전체 높이를 16으로 봤을 때
  // 16:9 영상의 높이 = 9 * (9/16) = 5.0625 (약 31.6%)
  // 4:3 캠의 높이 = 9 * (3/4) = 6.75 (약 42.2%)
  // 간격 = 20px / 1920px = 약 1%

  // 공통 컨테이너 스타일 - 모든 모드에서 동일한 크기
  const containerStyle = "w-full h-full flex flex-col rounded-sm overflow-hidden";

  const modes: ModeOption[] = [
    {
      value: "cam-only",
      label: "캠 전체",
      description: "웹캠만 전체 화면",
      preview: (
        <div className={`${containerStyle} bg-blue-500/40`}>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[7px] text-blue-200 font-medium">CAM</span>
          </div>
        </div>
      ),
    },
    {
      value: "video-only",
      label: "자료 전체",
      description: "자료화면만 전체 화면",
      preview: (
        <div className={`${containerStyle} bg-emerald-500/40`}>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[7px] text-emerald-200 font-medium">VIDEO</span>
          </div>
        </div>
      ),
    },
    {
      value: "composite-1",
      label: "합성 1",
      description: "자료 16:9 + 캠 4:3",
      preview: (
        // 9:16 비율 컨테이너 내에서 실제 비율 표현
        // 16:9 영상 높이: 31.6%, 간격: 1%, 4:3 캠 높이: 42.2%, 나머지 검은 여백
        <div className={`${containerStyle} bg-black`}>
          <div className="bg-emerald-500/40 flex items-center justify-center" style={{ height: '31.6%' }}>
            <span className="text-[6px] text-emerald-200">16:9</span>
          </div>
          <div className="bg-black" style={{ height: '1%' }} />
          <div className="bg-blue-500/40 flex items-center justify-center" style={{ height: '42.2%' }}>
            <span className="text-[6px] text-blue-200">4:3</span>
          </div>
          <div className="bg-black flex-1" />
        </div>
      ),
    },
    {
      value: "composite-2",
      label: "합성 2",
      description: "자료 16:9 + 캠 꽉채움",
      preview: (
        // 16:9 영상 높이: 31.6%, 간격: 1%, 나머지 캠이 꽉 채움: 67.4%
        <div className={`${containerStyle} bg-black`}>
          <div className="bg-emerald-500/40 flex items-center justify-center" style={{ height: '31.6%' }}>
            <span className="text-[6px] text-emerald-200">16:9</span>
          </div>
          <div className="bg-black" style={{ height: '1%' }} />
          <div className="bg-blue-500/40 flex-1 flex items-center justify-center">
            <span className="text-[6px] text-blue-200">FILL</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          화면 합성 모드
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="grid grid-cols-4 gap-2">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setCompositionMode(mode.value)}
              className={`p-1.5 rounded-lg border-2 transition-all ${
                compositionMode === mode.value
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted hover:bg-muted/80"
              }`}
            >
              <div className="aspect-[9/16] w-full mb-1">{mode.preview}</div>
              <div className="text-[10px] font-medium leading-tight">{mode.label}</div>
              <div className="text-[8px] text-muted-foreground leading-tight">{mode.description}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
