'use client';

// Component hiệu ứng lá rơi mùa thu
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  type: number;
}

// SVG lá thu với nhiều kiểu khác nhau
const LeafSVG = ({ type, size }: { type: number; size: number }) => {
  const colors = ['#D97757', '#F4A261', '#A67C5D', '#E9C46A'];
  const color = colors[type % colors.length];
  
  if (type % 3 === 0) {
    // Lá phong
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2L9 9L2 12L9 15L12 22L15 15L22 12L15 9L12 2Z" opacity="0.6" />
      </svg>
    );
  } else if (type % 3 === 1) {
    // Lá oval
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <ellipse cx="12" cy="12" rx="6" ry="10" opacity="0.5" />
        <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="1" opacity="0.7" />
      </svg>
    );
  } else {
    // Lá tim
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" opacity="0.5" />
      </svg>
    );
  }
};

export function FallingLeaves() {
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  
  useEffect(() => {
    // Tạo 8 chiếc lá với vị trí và animation khác nhau
    const newLeaves: Leaf[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 10,
      size: 16 + Math.random() * 12,
      rotation: Math.random() * 360,
      type: i,
    }));
    setLeaves(newLeaves);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute"
          style={{ left: `${leaf.x}%` }}
          initial={{ y: -50, rotate: 0, opacity: 0 }}
          animate={{
            y: ['0vh', '100vh'],
            rotate: [0, leaf.rotation, leaf.rotation * 2],
            x: [0, 30, -20, 40, 0],
            opacity: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <LeafSVG type={leaf.type} size={leaf.size} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
