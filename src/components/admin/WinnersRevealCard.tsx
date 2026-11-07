import { useState, useMemo } from 'react';
import type { QuizState } from '../../types';
import {
  startReveal,
  nextRevealStep,
  prevRevealStep,
  setRevealMode,
  toggleRevealSound,
  toggleRevealCountdown,
  refreshRevealSnapshot,
  replayRevealCelebration,
  exitReveal,
} from '../../store';
import { createRevealSnapshot, formatScore } from '../../utils';

interface WinnersRevealCardProps {
  state: QuizState;
}

export default function WinnersRevealCard({ state }: WinnersRevealCardProps) {
  const reveal = state.reveal;
  const isActive = Boolean(reveal?.active);
  const step = reveal?.step ?? 0;

  // Confirmation dialogs
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  // Live top 3 calculation vs frozen snapshot
  const liveSnapshot = useMemo(() => createRevealSnapshot(state), [state]);
  const displayedSnapshot = isActive && reveal?.snapshot && reveal.snapshot.length > 0
    ? reveal.snapshot
    : liveSnapshot;

  const handleStart = () => {
    setConfirmStart(false);
    startReveal();
  };

  const handleExitClick = () => {
    if (step >= 3) {
      setConfirmExit(true);
    } else {
      exitReveal();
    }
  };

  const handleExitConfirm = () => {
    setConfirmExit(false);
    exitReveal();
  };

  const stepLabels = [
    'Step 0: Intro & Final Results Banner',
    'Step 1: 3rd Place Revealed',
    'Step 2: Runner-up (2nd Place) Revealed',
    'Step 3: Quiz Champion Revealed',
    'Step 4: Final Resting Podium (Medallists)',
  ];

  return (
    <div
      data-testid="winners-reveal-admin-card"
      className="bg-[#111b2e] border-2 border-amber-400/50 rounded-[18px] p-5 shadow-2xl space-y-4 relative overflow-hidden"
    >
      {/* Subtle celebratory gold accent glow in background */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#243049] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-indigo-950 font-black text-xl shadow-md">
            🏆
          </div>
          <div>
            <h2
              className="text-lg md:text-xl font-bold text-[#f4ecd8] tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Winners Reveal Ceremony
            </h2>
            <p className="text-xs text-[#9aa7bd]">
              Art-directed projector ceremony advancing from 3rd place to quiz champion
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Ceremony Active on Projector
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-white/5 text-[#9aa7bd] border border-white/10 text-xs font-medium">
              Ready to Launch
            </span>
          )}
        </div>
      </div>

      {/* Snapshot Preview: Top 3 with Totals */}
      <div className="bg-black/25 rounded-xl p-3.5 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#9aa7bd] font-semibold uppercase tracking-wider">
          <span>{isActive ? 'Frozen Snapshot (Top 3)' : 'Live Preview (Overall Top 3)'}</span>
          {isActive && (
            <button
              type="button"
              onClick={() => refreshRevealSnapshot()}
              className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1 cursor-pointer"
              title="Update snapshot with current scores if scores were adjusted"
            >
              🔄 Refresh Results
            </button>
          )}
        </div>

        {displayedSnapshot.length === 0 ? (
          <p className="text-xs text-[#9aa7bd] italic py-2 text-center">
            No active groups available. Add groups and score rounds to view standings.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {displayedSnapshot.map((team) => {
              const is1st = team.rank === 1;
              const is2nd = team.rank === 2;

              const badgeColor = is1st
                ? 'bg-amber-400 text-indigo-950 font-black'
                : is2nd
                ? 'bg-slate-200 text-slate-900 font-bold'
                : 'bg-amber-700 text-amber-100 font-bold';

              const cardBorder = is1st
                ? 'border-amber-400/50 bg-amber-500/10'
                : 'border-white/10 bg-white/[0.02]';

              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${cardBorder} shadow-sm`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${badgeColor}`}>
                      {team.displayRank || `#${team.rank}`}
                    </span>
                    <div className="truncate">
                      <span className="font-semibold text-sm text-[#f4ecd8] truncate block">
                        {team.name}
                      </span>
                      {team.isTied && (
                        <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                          Tied
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="font-mono font-bold text-amber-400 text-base">
                      {formatScore(team.total)}
                    </span>
                    <span className="text-[10px] text-[#9aa7bd] block uppercase">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toggles: Mode, Countdown, Sound */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131d31] p-3 rounded-xl border border-white/5 text-xs">
        {/* Manual vs Auto Mode */}
        <div className="flex items-center gap-2">
          <span className="text-[#9aa7bd] font-bold uppercase tracking-wider">Mode:</span>
          <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setRevealMode('manual')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                reveal?.mode !== 'auto'
                  ? 'bg-amber-400 text-indigo-950 shadow-sm'
                  : 'text-[#9aa7bd] hover:text-white'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setRevealMode('auto')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                reveal?.mode === 'auto'
                  ? 'bg-amber-400 text-indigo-950 shadow-sm'
                  : 'text-[#9aa7bd] hover:text-white'
              }`}
            >
              Auto (8s)
            </button>
          </div>
        </div>

        {/* 3-2-1 Countdown before Winner */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[#f4ecd8] select-none font-medium">
            <input
              type="checkbox"
              checked={reveal?.countdown ?? true}
              onChange={() => toggleRevealCountdown()}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
            <span>3-2-1 Countdown before Winner</span>
          </label>
        </div>

        {/* Procedural Sound Effects */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[#f4ecd8] select-none font-medium">
            <input
              type="checkbox"
              checked={Boolean(reveal?.sound)}
              onChange={() => toggleRevealSound()}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
            <span>Sound Effects (Chimes & Swell)</span>
          </label>
        </div>
      </div>

      {/* Main Touch Controls */}
      {!isActive ? (
        <div className="pt-2">
          <button
            type="button"
            data-testid="admin-start-reveal-btn"
            onClick={() => setConfirmStart(true)}
            disabled={displayedSnapshot.length === 0}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 disabled:opacity-40 disabled:pointer-events-none text-indigo-950 font-outfit text-base font-black tracking-wider uppercase shadow-[0_0_25px_rgba(251,191,36,0.5)] transition-all transform active:scale-[0.99] cursor-pointer border border-amber-200 flex items-center justify-center gap-2"
          >
            <span>🎉</span>
            <span>Start Winners Reveal Ceremony</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {/* Active Step Indicator */}
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between text-xs">
            <span className="font-outfit font-black text-amber-300 uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">play_circle</span>
              {stepLabels[step]}
            </span>
            <span className="text-[#9aa7bd] font-mono font-bold">
              Step {step} / 4
            </span>
          </div>

          {/* Big Touch Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => prevRevealStep()}
              disabled={step === 0}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white font-outfit font-bold text-sm transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>← Back</span>
            </button>

            {/* Next Button */}
            <button
              type="button"
              data-testid="admin-reveal-next-btn"
              onClick={() => nextRevealStep()}
              disabled={step === 4}
              className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:pointer-events-none text-indigo-950 font-outfit font-black text-sm tracking-wide uppercase transition-all shadow-[0_0_16px_rgba(251,191,36,0.4)] cursor-pointer flex items-center justify-center gap-1.5 border border-amber-200"
            >
              <span>Reveal Next →</span>
            </button>

            {/* Replay Celebration */}
            <button
              type="button"
              onClick={() => replayRevealCelebration()}
              className="py-3 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 hover:text-white font-outfit font-bold text-sm transition-all border border-purple-400/30 cursor-pointer flex items-center justify-center gap-1.5"
              title="Re-fire confetti cannons and fireworks on projector"
            >
              <span>🎉 Replay Bursts</span>
            </button>

            {/* Exit Reveal */}
            <button
              type="button"
              onClick={handleExitClick}
              className="py-3 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-outfit font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✕ Exit Reveal</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Start Reveal */}
      {confirmStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#111b2e] border border-amber-400/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3
              className="text-xl font-bold text-[#f4ecd8]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Start Winners Reveal?
            </h3>
            <p className="text-[#9aa7bd] text-sm">
              Have all rounds been scored? Starting the ceremony will take a snapshot of the top 3 standings so scores remain locked during the reveal.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmStart(false)}
                className="px-4 py-2 text-sm text-[#9aa7bd] hover:text-[#f4ecd8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="admin-confirm-start-btn"
                onClick={handleStart}
                className="px-5 py-2 text-sm bg-amber-400 text-indigo-950 font-black rounded-lg hover:bg-amber-300 transition-all shadow-md"
              >
                Yes, Start Reveal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Exit Reveal */}
      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#111b2e] border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3
              className="text-xl font-bold text-[#f4ecd8]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Exit Winners Reveal?
            </h3>
            <p className="text-[#9aa7bd] text-sm">
              The quiz champion is currently displayed on the projector. Are you sure you want to exit back to the standard leaderboard?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="px-4 py-2 text-sm text-[#9aa7bd] hover:text-[#f4ecd8] transition-colors"
              >
                Stay in Reveal
              </button>
              <button
                type="button"
                onClick={handleExitConfirm}
                className="px-5 py-2 text-sm bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-500 transition-all shadow-md"
              >
                Exit to Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
