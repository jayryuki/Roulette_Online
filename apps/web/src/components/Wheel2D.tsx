import { useMemo, useRef, useEffect, useState } from 'react';
import { WHEEL_NUMBERS, numberColor as getPocketColor, displayLabel } from '@roulette/game-core';

const POCKET_COUNT = 38;
const POCKET_ANGLE = 360 / POCKET_COUNT;

interface Wheel2DProps {
  targetNumber: number | null;
  spinning: boolean;
}

function useWheelSize() {
  const [size, setSize] = useState(280);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize(Math.floor(Math.min(rect.width, rect.height, 340)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return { size, containerRef };
}

export default function Wheel2D({ targetNumber, spinning }: Wheel2DProps) {
  const wheelRef = useRef<SVGGElement>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const animRef = useRef<number>(0);
  const spinStartRef = useRef<{ startRotation: number; targetRotation: number; startTime: number } | null>(null);
  const { size, containerRef } = useWheelSize();

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
      const final = spinStartRef.current.targetRotation;
      spinStartRef.current = null;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setCurrentRotation(final);
      return;
    }

    if (spinning && spinStartRef.current) {
      const spin = spinStartRef.current;
      const duration = 4000;
      const animate = (now: number) => {
        const elapsed = now - spin.startTime;
        const progress = Math.min(elapsed / duration, 1);
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
  }, [spinning, targetNumber, currentRotation]);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const rimR = outerR - 6;
  const trackR = rimR - 8;
  const outerPocketR = trackR - 2;
  const innerPocketR = outerPocketR - 22;
  const numberR = (outerPocketR + innerPocketR) / 2;
  const hubR = innerPocketR - 6;
  const innerHubR = hubR - 14;

  const pocketPath = (startAngle: number, endAngle: number, or: number, ir: number) => {
    const sa = startAngle * Math.PI / 180;
    const ea = endAngle * Math.PI / 180;
    const x1 = cx + or * Math.cos(sa);
    const y1 = cy + or * Math.sin(sa);
    const x2 = cx + or * Math.cos(ea);
    const y2 = cy + or * Math.sin(ea);
    const x3 = cx + ir * Math.cos(ea);
    const y3 = cy + ir * Math.sin(ea);
    const x4 = cx + ir * Math.cos(sa);
    const y4 = cy + ir * Math.sin(sa);
    return `M${x1},${y1} A${or},${or} 0 0,1 ${x2},${y2} L${x3},${y3} A${ir},${ir} 0 0,0 ${x4},${y4} Z`;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: 340,
        aspectRatio: '1 / 1',
        margin: '0 auto',
        position: 'relative',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Metallic rim gradient */}
          <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#b8a078" />
            <stop offset="85%" stopColor="#8c7348" />
            <stop offset="95%" stopColor="#d4bc8a" />
            <stop offset="100%" stopColor="#6b5a36" />
          </radialGradient>
          {/* Ball track */}
          <radialGradient id="trackGrad" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#3a3225" />
            <stop offset="92%" stopColor="#1a1610" />
            <stop offset="100%" stopColor="#0a0806" />
          </radialGradient>
          {/* Center hub wood */}
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a2520" />
            <stop offset="70%" stopColor="#1a1612" />
            <stop offset="100%" stopColor="#0f0d0a" />
          </radialGradient>
          {/* Inner hub metallic */}
          <radialGradient id="innerHubGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#c4a574" />
            <stop offset="50%" stopColor="#8c7348" />
            <stop offset="100%" stopColor="#5a4a2e" />
          </radialGradient>
          {/* Shadow filter */}
          <filter id="pocketShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer wood rim */}
        <circle cx={cx} cy={cy} r={outerR} fill="url(#rimGrad)" stroke="#5a4a2e" strokeWidth="1" />

        {/* Ball track ring */}
        <circle cx={cx} cy={cy} r={trackR} fill="url(#trackGrad)" stroke="#3a3225" strokeWidth="0.5" />

        {/* Rotating group */}
        <g ref={wheelRef} transform={`rotate(${currentRotation}, ${cx}, ${cy})`}>
          {/* Pocket separators (thin metal lines between pockets) */}
          {pockets.map(({ angle }) => {
            const a = (angle - POCKET_ANGLE / 2) * Math.PI / 180;
            const x1 = cx + innerPocketR * Math.cos(a);
            const y1 = cy + innerPocketR * Math.sin(a);
            const x2 = cx + outerPocketR * Math.cos(a);
            const y2 = cy + outerPocketR * Math.sin(a);
            return (
              <line
                key={`sep-${angle}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Pockets */}
          {pockets.map(({ num, angle, color }) => {
            const sa = angle - POCKET_ANGLE / 2;
            const ea = angle + POCKET_ANGLE / 2;
            const baseColor = color === 'red' ? '#B91C1C' : color === 'black' ? '#1F2937' : '#15803D';
            const highlightColor = color === 'red' ? '#DC2626' : color === 'black' ? '#374151' : '#16A34A';
            const midAngle = angle * Math.PI / 180;
            const tx = cx + numberR * Math.cos(midAngle);
            const ty = cy + numberR * Math.sin(midAngle);

            return (
              <g key={num}>
                <path
                  d={pocketPath(sa, ea, outerPocketR, innerPocketR)}
                  fill={baseColor}
                  stroke="none"
                />
                {/* Highlight wedge for depth */}
                <path
                  d={pocketPath(sa, sa + POCKET_ANGLE * 0.3, outerPocketR - 1, innerPocketR + 1)}
                  fill={highlightColor}
                  opacity={0.4}
                />
                <text
                  x={tx}
                  y={ty}
                  fill="white"
                  fontSize={size > 260 ? '8' : '7'}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${angle + 90}, ${tx}, ${ty})`}
                  fontFamily="'Inter', sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {displayLabel(num)}
                </text>
              </g>
            );
          })}

          {/* Center hub */}
          <circle cx={cx} cy={cy} r={hubR} fill="url(#hubGrad)" stroke="#3a3225" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={innerHubR} fill="url(#innerHubGrad)" stroke="#5a4a2e" strokeWidth="0.5" />

          {/* Decorative center star / turret */}
          <g>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45) * Math.PI / 180;
              const x1 = cx + (innerHubR * 0.25) * Math.cos(a);
              const y1 = cy + (innerHubR * 0.25) * Math.sin(a);
              const x2 = cx + (innerHubR * 0.85) * Math.cos(a);
              const y2 = cy + (innerHubR * 0.85) * Math.sin(a);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#3a2e1a"
                  strokeWidth="0.8"
                  opacity="0.6"
                />
              );
            })}
          </g>

          <text
            x={cx}
            y={cy}
            fill="#2a1f10"
            fontSize={size > 260 ? '16' : '13'}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Newsreader', Georgia, serif"
            style={{ pointerEvents: 'none' }}
          >
            R
          </text>
        </g>

        {/* Static pointer triangle (at top, pointing down) */}
        <g>
          <polygon
            points={`${cx - 10},${2} ${cx + 10},${2} ${cx},${16}`}
            fill="#C4A574"
            stroke="#8C7348"
            strokeWidth="1"
          />
          <polygon
            points={`${cx - 6},${4} ${cx + 6},${4} ${cx},${12}`}
            fill="#E8D4A8"
          />
        </g>
      </svg>
    </div>
  );
}
