import React from 'react';

/**
 * Props for the CircularProgress component
 * 
 * @param percentage - The progress value from 0 to 100.
 * @param size - The diameter of the circle in pixels.
 * @param strokeWidth - The thickness of the progress line.
 * @param className - Additional CSS classes.
 * @param strokeColor - The color of the progress line.
 * @param backgroundColor - The color of the underlying track.
 */
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  strokeColor?: string;
  backgroundColor?: string;
}

/**
 * A circular progress bar that displays a percentage value.
 * Features a smooth transition animation when the percentage changes.
 * 
 * @example
 * ```tsx
 * <CircularProgress percentage={75} size={120} strokeWidth={8} />
 * ```
 */
const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 140,
  strokeWidth = 10,
  className = "",
  strokeColor = "#00d4c0",
  backgroundColor = "rgba(0, 212, 192, 0.1)",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white leading-none">{percentage}%</span>
      </div>
    </div>
  );
};

export default CircularProgress;
