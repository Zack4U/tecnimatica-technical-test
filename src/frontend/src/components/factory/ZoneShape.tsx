import { motion } from 'framer-motion';
import type { ZoneResponse } from '../../types/Zone.js';

type Props = {
  zone: ZoneResponse;
  path: string;
  isSelected: boolean;
  onClick: () => void;
};

export function ZoneShape({ zone, path, isSelected, onClick }: Props) {
  return (
    <motion.path
      d={path}
      fill={isSelected ? 'var(--accent-subtle)' : 'var(--zone-fill)'}
      stroke="var(--zone-stroke)"
      strokeWidth={0.75}
      strokeLinecap="square"
      style={{ cursor: 'pointer' }}
      whileHover={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      aria-label={zone.name}
    >
      <title>{zone.name}</title>
    </motion.path>
  );
}
