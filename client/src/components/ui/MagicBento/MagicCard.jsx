import { useRef, useCallback, useMemo } from 'react';
import './MagicCard.css';

/**
 * MagicCard
 *
 * Drop-in wrapper that adds cursor-tracked interactive effects to any card child:
 *   • Border glow that follows the cursor along the card edge
 *   • Inner spotlight that illuminates the card surface under the cursor
 *   • Click ripple emanating from the click point
 *   • Optional twinkling star particles
 *
 * Props
 * ─────
 * glowColor      string   RGB triplet, e.g. "255, 255, 255"   default: white
 * glowRadius     number   Spotlight / glow radius in px        default: 300
 * enableBorderGlow  bool                                        default: true
 * enableSpotlight   bool                                        default: true
 * clickEffect       bool                                        default: true
 * enableStars       bool                                        default: false
 * particleCount  number   Star count when enableStars is true  default: 12
 * className      string   Extra classes on the wrapper div
 */
const MagicCard = ({
  children,
  className = '',
  glowColor = '255, 255, 255',
  glowRadius = 300,
  borderRadius = '12px',
  enableBorderGlow = true,
  enableSpotlight = true,
  clickEffect = true,
  enableStars = false,
  particleCount = 12,
}) => {
  const cardRef = useRef(null);

  /* Track cursor position → update CSS custom properties instantly */
  const handleMouseMove = useCallback((e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mc-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--mc-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  /* Ripple on click */
  const handleClick = useCallback((e) => {
    if (!clickEffect) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'magic-card__ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, [clickEffect]);

  /* Generate star positions once per mount */
  const stars = useMemo(() => {
    if (!enableStars) return [];
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 90 + 5,
      y: Math.random() * 90 + 5,
      size: Math.random() * 2 + 1,
      duration: `${Math.random() * 3 + 2}s`,
      delay: `${Math.random() * 3}s`,
    }));
  }, [enableStars, particleCount]);

  return (
    <div
      ref={cardRef}
      className={`magic-card${className ? ` ${className}` : ''}`}
      style={{ '--mc-glow': glowColor, '--mc-radius': `${glowRadius}px`, borderRadius }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {children}

      {enableSpotlight && (
        <div className="magic-card__spotlight" aria-hidden="true" />
      )}

      {enableBorderGlow && (
        <div className="magic-card__border" aria-hidden="true" />
      )}

      {stars.map((star) => (
        <span
          key={star.id}
          className="magic-card__star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: star.duration,
            animationDelay: star.delay,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export default MagicCard;
