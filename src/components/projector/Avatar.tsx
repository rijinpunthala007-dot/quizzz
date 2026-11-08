import { memo } from 'react';
import { getInitials } from '../../utils';

interface AvatarProps {
  name: string;
  id?: string;
  size?: number; // 36, 44, or custom
  fontSize?: number;
  rank?: number;
  ringColor?: string;
  className?: string;
}

const GRADIENTS = [
  'from-amber-600 to-yellow-500',
  'from-blue-600 to-indigo-500',
  'from-rose-600 to-red-500',
  'from-amber-700 to-orange-500',
  'from-teal-600 to-emerald-500',
  'from-purple-700 to-indigo-600',
  'from-cyan-700 to-blue-600',
  'from-indigo-600 to-purple-600',
  'from-emerald-600 to-teal-700',
  'from-purple-800 to-violet-600',
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

const Avatar = memo(function Avatar({
  name,
  size = 36,
  fontSize,
  className = '',
}: AvatarProps) {
  const initials = getInitials(name);
  const gradient = getGradient(name);

  const computedFontSize = fontSize
    ? `${fontSize}px`
    : size >= 50
    ? '20px'
    : size <= 32
    ? '11px'
    : size <= 40
    ? '13px'
    : '15px';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full font-outfit font-bold text-white select-none shadow-sm bg-gradient-to-tr ${gradient} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: computedFontSize,
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
});

export default Avatar;
