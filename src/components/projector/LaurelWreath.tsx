import { memo } from 'react';

/**
 * Gold laurel wreath branches flanking the 1st place podium avatar
 */
function LaurelWreathComponent({ size = 96 }: { size?: number }) {
  // SVG viewBox covers branches flanking the avatar circle
  const width = size + 56;
  const height = size + 16;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 152 112"
      fill="none"
      className="absolute pointer-events-none text-[#f2c94c]"
      aria-hidden="true"
    >
      {/* Left branch stem */}
      <path
        d="M26 96 C16 78 12 50 26 22"
        stroke="#f2c94c"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Left branch leaves */}
      <path d="M26 96 C21 90 12 92 10 97 C16 100 24 100 26 96Z" fill="#f2c94c" />
      <path d="M22 84 C15 78 6 82 5 87 C12 89 20 88 22 84Z" fill="#f2c94c" />
      <path d="M19 70 C12 65 3 69 3 75 C10 76 18 74 19 70Z" fill="#f2c94c" />
      <path d="M18 56 C11 51 3 56 4 62 C11 62 18 59 18 56Z" fill="#f2c94c" />
      <path d="M19 42 C13 37 6 42 8 48 C15 47 20 44 19 42Z" fill="#f2c94c" />
      <path d="M22 28 C17 23 11 28 14 34 C20 32 23 29 22 28Z" fill="#f2c94c" />
      <path d="M26 22 C23 16 19 19 23 25 C26 24 27 23 26 22Z" fill="#f2c94c" />

      {/* Right branch stem */}
      <path
        d="M126 96 C136 78 140 50 126 22"
        stroke="#f2c94c"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Right branch leaves */}
      <path d="M126 96 C131 90 140 92 142 97 C136 100 128 100 126 96Z" fill="#f2c94c" />
      <path d="M130 84 C137 78 146 82 147 87 C140 89 132 88 130 84Z" fill="#f2c94c" />
      <path d="M133 70 C140 65 149 69 149 75 C142 76 134 74 133 70Z" fill="#f2c94c" />
      <path d="M134 56 C141 51 149 56 148 62 C141 62 134 59 134 56Z" fill="#f2c94c" />
      <path d="M133 42 C139 37 146 42 144 48 C137 47 132 44 133 42Z" fill="#f2c94c" />
      <path d="M130 28 C135 23 141 28 138 34 C132 32 129 29 130 28Z" fill="#f2c94c" />
      <path d="M126 22 C129 16 133 19 129 25 C126 24 125 23 126 22Z" fill="#f2c94c" />
    </svg>
  );
}

export default memo(LaurelWreathComponent);

