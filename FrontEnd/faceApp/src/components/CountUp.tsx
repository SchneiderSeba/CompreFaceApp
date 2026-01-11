import { useEffect, useState, useRef } from 'react';
import './CountUp.css';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  className?: string;
  separator?: string;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  startWhen?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 2,
  delay = 0,
  className = '',
  separator = '',
  decimals = 0,
  suffix = '',
  prefix = '',
  startWhen = true,
  onStart,
  onEnd
}) => {
  const [count, setCount] = useState(from);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!startWhen || isAnimating) return;

    const startAnimation = () => {
      if (onStart) onStart();
      setIsAnimating(true);

      const startTime = performance.now();
      const range = to - from;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime - (delay * 1000);

        if (elapsed < 0) {
          animationRef.current = requestAnimationFrame(animate);
          return;
        }

        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentCount = from + range * easeProgress;
        setCount(currentCount);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCount(to);
          setIsAnimating(false);
          if (onEnd) onEnd();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    startAnimation();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [to, from, duration, delay, startWhen]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    if (separator) {
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
      return parts.join('.');
    }
    return fixed;
  };

  return (
    <span className={`count-up ${className}`}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
};
