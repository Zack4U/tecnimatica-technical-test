import { motion } from 'framer-motion';

type Bounds = { x: number; y: number; w: number; h: number };

type Props = { bounds: Bounds };

export function SelectionRing({ bounds }: Props) {
  const pad = 6;
  return (
    <motion.rect
      x={bounds.x - pad}
      y={bounds.y - pad}
      width={bounds.w + pad * 2}
      height={bounds.h + pad * 2}
      rx={4}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={1.5}
      strokeDasharray="5 3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: 'none' }}
    />
  );
}
