import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __STAGE_OVERFLOW_REPORT__?: {
      ok: boolean;
      timestamp: number;
      errors: string[];
      stageScrollHeight: number;
      stageClientHeight: number;
      stageScrollWidth: number;
      stageClientWidth: number;
    };
  }
}

export default function DevOverflowChecker({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const [report, setReport] = useState<{ ok: boolean; errors: string[] }>({ ok: true, errors: [] });
  const isDebug = typeof window !== 'undefined' && window.location.search.includes('debug=1');

  useEffect(() => {
    const runCheck = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const errors: string[] = [];

      // 1. Stage scroll checks (allow 1px for subpixel scaling rounding)
      if (stage.scrollHeight > stage.clientHeight + 1) {
        errors.push(`Stage vertical overflow: scrollHeight (${stage.scrollHeight}) > clientHeight (${stage.clientHeight})`);
      }
      if (stage.scrollWidth > stage.clientWidth + 1) {
        errors.push(`Stage horizontal overflow: scrollWidth (${stage.scrollWidth}) > clientWidth (${stage.clientWidth})`);
      }

      const isOk = errors.length === 0;
      window.__STAGE_OVERFLOW_REPORT__ = {
        ok: isOk,
        timestamp: Date.now(),
        errors,
        stageScrollHeight: stage.scrollHeight,
        stageClientHeight: stage.clientHeight,
        stageScrollWidth: stage.scrollWidth,
        stageClientWidth: stage.clientWidth,
      };

      setReport({ ok: isOk, errors });
    };

    const timer = setTimeout(runCheck, 400);
    const interval = setInterval(runCheck, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [stageRef]);

  // Show badge ONLY when ?debug=1 is in URL
  if (!isDebug) return null;

  return (
    <div
      className={`fixed bottom-2 right-2 z-50 text-xs px-2.5 py-1 rounded-full font-mono transition-all pointer-events-none opacity-80 ${
        report.ok ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/90 text-red-300 border border-red-500/50'
      }`}
      title={report.ok ? 'Zero overflows or collisions' : report.errors.join('; ')}
    >
      {report.ok ? 'Stage: 0 Overflow' : `Stage: ${report.errors.length} Overflow(s)`}
    </div>
  );
}
