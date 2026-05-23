import { useMemo, useRef, useEffect, useState } from 'react';
import { WHEEL_NUMBERS, numberColor as getPocketColor, displayLabel } from '@roulette/game-core';

const POCKET_COUNT = 38;
const POCKET_ANGLE = 360 / POCKET_COUNT;

interface Wheel2DProps {
  targetNumber: number | null;
  spinning: boolean;
}

export default function Wheel2D({ targetNumber, spinning }: Wheel2DProps) {
  const wheelRef = useRef<SVGGElement>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const animRef = useRef<number>(0);
  const spinStartRef = useRef<{ startRotation: number; targetRotation: number; startTime: number } | null>(null);

  const pockets = useMemo(() => {
    return WHEEL_NUMBERS.map((num, index) => {
      const angle = index * POCKET_ANGLE;
      const color = getPocketColor(num);
      return { num, index, angle, color };
    });
  }, []);

  useEffect(() => {
    if (spinning && targetNumber !== null && !spinStartRef.current) {
      const targetIdx = WHEEL_NUMBERS.indexOf(targetNumber);
      if (targetIdx >= 0) {
        // The pointer is at the top (270 degrees in SVG coordinates).
        // Pocket center angle in SVG = targetIdx * POCKET_ANGLE
        // After rotating by R degrees, pocket is at: pocketAngle + R
        // We want: pocketAngle + R ≡ 270 (mod 360)
        // So: R ≡ 270 - pocketAngle (mod 360)
        const pocketCenter = targetIdx * POCKET_ANGLE;
        const desiredBase = ((270 - pocketCenter) % 360 + 360) % 360;
        const currentBase = ((currentRotation % 360) + 360) % 360;
        const delta = ((desiredBase - currentBase) % 360 + 360) % 360;
        const fullSpins = 5 * 360;
        const targetRotation = currentRotation + fullSpins + delta;
        spinStartRef.current = {
          startRotation: currentRotation,
          targetRotation,
          startTime: performance.now(),
        };
      }
    }

    if (!spinning && spinStartRef.current) {
      // Animation finished
      const final = spinStartRef.current.targetRotation;
      spinStartRef.current = null;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setCurrentRotation(final);
      return;
    }

    if (spinning && spinStartRef.current) {
      const spin = spinStartRef.current;
      const duration = 4000; // 4 seconds
      const animate = (now: number) => {
        const elapsed = now - spin.startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const rot = spin.startRotation + (spin.targetRotation - spin.startRotation) * eased;
        setCurrentRotation(rot);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentRotation(spin.targetRotation);
          spinStartRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [spinning, targetNumber]);

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 28;
  const numberR = (outerR + innerR) / 2;

  return (
    <div style={{ width: size, height: size, margin: '0 auto', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Pointer triangle at top pointing down into wheel */}
        <polygon
          points={`${cx - 8},${0} ${cx + 8},${0} ${cx},${12}`}
          fill="var(--accent-warm)"
          stroke="none"
        />
        {/* Outer rim */}
        <circle cx={cx} cy={cy} r={outerR + 2} fill="none" stroke="var(--text-muted)" strokeWidth="2" />
        {/* Rotating group */}
        <g ref={wheelRef} transform={`rotate(${currentRotation}, ${cx}, ${cy})`}>
          {pockets.map(({ num, angle, color }) => {
            const startAngle = (angle - POCKET_ANGLE / 2) * Math.PI / 180;
            const endAngle = (angle + POCKET_ANGLE / 2) * Math.PI / 180;
            const x1 = cx + outerR * Math.cos(startAngle);
            const y1 = cy + outerR * Math.sin(startAngle);
            const x2 = cx + outerR * Math.cos(endAngle);
            const y2 = cy + outerR * Math.sin(endAngle);
            const x3 = cx + innerR * Math.cos(endAngle);
            const y3 = cy + innerR * Math.sin(endAngle);
            const x4 = cx + innerR * Math.cos(startAngle);
            const y4 = cy + innerR * Math.sin(startAngle);

            const hexColor = color === 'red' ? 'var(--roulette-red)' : color === 'black' ? 'var(--roulette-black)' : 'var(--roulette-green)';

            const midAngle = angle * Math.PI / 180;
            const tx = cx + numberR * Math.cos(midAngle);
            const ty = cy + numberR * Math.sin(midAngle);

            return (
              <g key={num}>
                <path d={`M${x1},${y1} A${outerR},${outerR} 0 0,1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 0,0 ${x4},${y4} Z`} fill={hexColor} stroke="var(--border-subtle)" strokeWidth="0.5" />
                <text
                  x={tx}
                  y={ty}
                  fill="white"
                  fontSize="7"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${angle}, ${tx}, ${ty})`}
                  fontFamily="'Inter', sans-serif"
                >
                  {displayLabel(num)}
                </text>
              </g>
            );
          })}
          {/* Center hub */}
          <circle cx={cx} cy={cy} r={innerR - 4} fill="var(--surface-panel)" stroke="var(--border-subtle)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={innerR - 16} fill="var(--surface-panel-raised)" stroke="var(--border-subtle)" strokeWidth="0.5" />
          <text x={cx} y={cy} fill="var(--text-primary)" fontSize="14" fontWeight="700" textAnchor="middle" dominantBaseline="central" fontFamily="'Newsreader', Georgia, serif">
            R
          </text>
        </g>
      </svg>
    </div>
  );
}
