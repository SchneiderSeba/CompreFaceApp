import { useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import './ReflectiveCard.css';

interface ReflectiveCardProps {
  children: ReactNode;
  blurStrength?: number;
  metalness?: number;
  roughness?: number;
  className?: string;
}

export const ReflectiveCard: React.FC<ReflectiveCardProps> = ({
  children,
  blurStrength = 12,
  metalness = 1,
  roughness = 0.75,
  className = ''
}) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;

    setRotation({
      x: (normalizedY - 0.5) * -8,
      y: (normalizedX - 0.5) * 8
    });
    setGlarePosition({ x: normalizedX * 100, y: normalizedY * 100 });
  };

  const resetEffects = () => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
    setGlarePosition({ x: 50, y: 50 });
  };

  const effectStyle = {
    '--card-rotate-x': `${rotation.x}deg`,
    '--card-rotate-y': `${rotation.y}deg`,
    '--blur-strength': `${blurStrength}px`,
    '--metalness': metalness,
    '--roughness': roughness,
    '--glare-x': `${glarePosition.x}%`,
    '--glare-y': `${glarePosition.y}%`
  } as CSSProperties;

  return (
    <div
      className={`reflective-card ${isHovering ? 'is-hovering' : ''} ${className}`}
      onPointerEnter={() => setIsHovering(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetEffects}
    >
      <div className="reflective-card-aura" style={effectStyle} />
      <div className="reflective-card-surface" style={effectStyle}>
        <div className="reflective-card-content">{children}</div>
        <div className="reflective-card-glare" />
        <div className="reflective-card-shine" />
      </div>
    </div>
  );
};
