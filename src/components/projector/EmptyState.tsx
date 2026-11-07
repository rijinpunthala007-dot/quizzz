import { memo } from 'react';

const EmptyState = memo(function EmptyState() {
  return (
    <div
      data-testid="empty-podium-state"
      className="w-full h-[305px] max-h-[305px] flex flex-col items-center justify-center select-none text-center px-8"
    >
      {/* Golden Championship Medallion / Cross */}
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 shadow-xl flex items-center justify-center border-2 border-amber-300/80">
          <svg
            className="w-10 h-10 text-indigo-950"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M11 2H13V8H19V10H13V22H11V10H5V8H11V2Z" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl -z-10 animate-pulse" />
      </div>

      <h2 className="font-cinzel text-3xl font-black text-amber-200 uppercase tracking-widest drop-shadow-md mb-2">
        Waiting for Quiz to Start
      </h2>

      <p className="font-outfit text-base text-purple-200/80 font-medium tracking-wide max-w-lg">
        Add your church groups and record round scores in the Admin Panel to begin the live leaderboard.
      </p>
    </div>
  );
});

export default EmptyState;
