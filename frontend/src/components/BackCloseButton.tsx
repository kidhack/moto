import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from '../i18n';

interface BackCloseButtonProps {
  onClose: () => void;
  className?: string;
}

// Path morph from Animate Close Icon to Arrow ref
const closePath1 = 'M7.61501 7.61474L24.3855 24.3852';
const closePath2 = 'M7.61501 24.3852L24.3855 7.61474';
const backPath1 = 'M7.61501 16.0113L17.3855 25.7817';
const backPath2 = 'M7.61501 16.0113L17.3855 6.24078';

/**
 * Header button that morphs from close (X) to back arrow on hover/touch.
 * Matches Animate Close Icon to Arrow ref - animation on interaction.
 */
export default function BackCloseButton({ onClose, className = '' }: BackCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <button
      onClick={onClose}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchCancel={() => setIsHovered(false)}
      onTouchEnd={() => setIsHovered(false)}
      className={`h-8 w-8 flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity touch-manipulation ${className}`}
      aria-label={t('common.back')}
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 32 32"
      >
        <g>
          <motion.path
            initial={{ d: closePath1 }}
            d={closePath1}
            animate={{ d: isHovered ? backPath1 : closePath1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <motion.path
            initial={{ d: closePath2 }}
            d={closePath2}
            animate={{ d: isHovered ? backPath2 : closePath2 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        </g>
      </svg>
    </button>
  );
}
