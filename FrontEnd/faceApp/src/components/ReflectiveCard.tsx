import { useRef, useState, useEffect } from 'react';
import type { ReactNode }  from 'react';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      
      setRotation({ x: rotateX, y: rotateY });
      setGlarePosition({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100
      });
    };

    const handleMouseLeave = () => {
      setRotation({ x: 0, y: 0 });
      setGlarePosition({ x: 50, y: 50 });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`reflective-card ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        '--blur-strength': `${blurStrength}px`,
        '--metalness': metalness,
        '--roughness': roughness,
        '--glare-x': `${glarePosition.x}%`,
        '--glare-y': `${glarePosition.y}%`,
      } as React.CSSProperties}
    >
      <div className="reflective-card-content">
        {children}
      </div>
      <div className="reflective-card-glare" />
      <div className="reflective-card-shine" />
    </div>
  );
};
