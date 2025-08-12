import React from "react";

interface SemiGaugeProps {
  value: number; // 0-100
  size?: number; // px
  strokeWidth?: number; // px
  ariaLabel?: string;
  className?: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const SemiGauge: React.FC<SemiGaugeProps> = ({
  value,
  size = 200,
  strokeWidth = 10,
  ariaLabel,
  className,
}) => {
  const pct = clamp(value);
  const w = size;
  const h = size / 2 + strokeWidth; // little padding for stroke
  const cx = w / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180.0);
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  // Track: 180 -> 0 degrees (semi-circle)
  const trackPath = describeArc(cx, cy, r, 180, 0);

  // Progress arc from 180° down to current value
  const endAngle = 180 - (pct / 100) * 180; // 180 (0%) -> 0 (100%)
  const valuePath = describeArc(cx, cy, r, 180, endAngle);

  return (
    <div className={className} role="img" aria-label={ariaLabel ?? `Gauge ${pct}%`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto block">
        {/* Track */}
        <path d={trackPath} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.35" />
        {/* Value */}
        <path d={valuePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Label below arc */}
        <text x={cx} y={h - 6} textAnchor="middle" className="fill-foreground" style={{ fontWeight: 600 }}>
          {pct}%
        </text>
      </svg>
    </div>
  );
};

export default SemiGauge;
