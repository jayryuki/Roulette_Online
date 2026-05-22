// apps/web/src/components/Wheel3D.tsx

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Cylinder, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { WHEEL_NUMBERS, numberColor as getPocketColor, displayLabel } from '@roulette/game-core';

const POCKET_COUNT = 38;
const WHEEL_RADIUS = 3;
const POCKET_ANGLE = (2 * Math.PI) / POCKET_COUNT;

interface WheelMeshProps {
  targetNumber: number | null;
  spinning: boolean;
}

function WheelMesh({ targetNumber, spinning }: WheelMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetAngle = useRef(0);

  const pockets = useMemo(() => {
    return WHEEL_NUMBERS.map((num, index) => {
      const angle = index * POCKET_ANGLE;
      const color = getPocketColor(num);
      return { num, index, angle, color };
    });
  }, []);

  useMemo(() => {
    if (targetNumber !== null && spinning) {
      const targetIdx = WHEEL_NUMBERS.indexOf(targetNumber);
      if (targetIdx >= 0) {
        const pocketCenter = targetIdx * POCKET_ANGLE;
        const fullSpins = 5 * Math.PI * 2;
        targetAngle.current = fullSpins + (Math.PI * 2 - pocketCenter + Math.PI / 2);
      }
    }
  }, [targetNumber, spinning]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (spinning) {
      const remaining = targetAngle.current - groupRef.current.rotation.z;
      if (Math.abs(remaining) > 0.01) {
        groupRef.current.rotation.z += remaining * Math.min(delta * 3, 1);
      }
    } else {
      groupRef.current.rotation.z += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer rim */}
      <Torus args={[WHEEL_RADIUS, 0.15, 16, 64]}>
        <meshStandardMaterial color="#8B4513" metalness={0.6} roughness={0.3} />
      </Torus>

      {/* Pockets */}
      {pockets.map(({ num, angle, color }) => {
        const cx = (WHEEL_RADIUS - 0.6) * Math.cos(angle);
        const cy = (WHEEL_RADIUS - 0.6) * Math.sin(angle);
        const hexColor = color === 'red' ? '#B91C1C' : color === 'black' ? '#1F2937' : '#15803D';

        return (
          <group key={num}>
            <mesh position={[cx * 0.85, cy * 0.85, 0.05]} rotation={[0, 0, angle]}>
              <planeGeometry args={[0.4, 0.55]} />
              <meshStandardMaterial color={hexColor} />
            </mesh>
            <Text
              position={[cx * 0.85, cy * 0.85, 0.1]}
              fontSize={0.12}
              color="white"
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, angle]}
            >
              {displayLabel(num)}
            </Text>
          </group>
        );
      })}

      {/* Ball */}
      <mesh position={[WHEEL_RADIUS - 0.35, 0, 0.15]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>

      {/* Center hub */}
      <Cylinder args={[0.4, 0.4, 0.2, 32]} position={[0, 0, 0.05]}>
        <meshStandardMaterial color="#D4A574" metalness={0.8} roughness={0.2} />
      </Cylinder>
    </group>
  );
}

interface Wheel3DProps {
  targetNumber: number | null;
  spinning: boolean;
}

export default function Wheel3D({ targetNumber, spinning }: Wheel3DProps) {
  return (
    <div className="w-full aspect-square max-w-md mx-auto">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, 5]} intensity={0.4} />
        <WheelMesh targetNumber={targetNumber} spinning={spinning} />
      </Canvas>
    </div>
  );
}
