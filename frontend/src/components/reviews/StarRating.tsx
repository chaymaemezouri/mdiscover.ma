'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import './reviews.css';

type StarRatingProps = {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
  label?: string;
};

export function StarRating({
  value,
  max = 5,
  size = 16,
  interactive = false,
  onChange,
  className,
  label,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const clamped = Math.max(0, Math.min(max, value));
  const rounded = Math.round(clamped * 2) / 2;
  const preview = interactive && hover > 0 ? hover : rounded;

  return (
    <div
      className={cn('star-rating', interactive && 'star-rating--interactive', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label ?? `Note ${rounded} sur ${max}`}
      onMouseLeave={() => setHover(0)}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = preview >= starValue;
        const half = !interactive && !filled && rounded >= starValue - 0.5;
        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              className={cn(
                'star-rating__btn',
                filled && 'is-filled',
              )}
              aria-label={`${starValue} étoile${starValue > 1 ? 's' : ''}`}
              aria-checked={clamped === starValue}
              role="radio"
              onMouseEnter={() => setHover(starValue)}
              onFocus={() => setHover(starValue)}
              onClick={() => onChange?.(starValue)}
            >
              <Star
                size={size}
                strokeWidth={1.8}
                fill={filled ? 'currentColor' : 'none'}
                aria-hidden
              />
            </button>
          );
        }
        return (
          <span
            key={starValue}
            className={cn(
              'star-rating__icon',
              filled && 'is-filled',
              half && 'is-half',
            )}
            aria-hidden
          >
            <Star
              size={size}
              strokeWidth={2}
              fill={filled || half ? 'currentColor' : 'none'}
            />
          </span>
        );
      })}
    </div>
  );
}
