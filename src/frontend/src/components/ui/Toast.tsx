import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastItem = {
  id: string;
  message: string;
  variant: 'success' | 'error';
};

type Props = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bg = toast.variant === 'success' ? '#1A8A5A' : '#DC2626';

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        backgroundColor: bg,
        color: '#fff',
        padding: '0.6rem 1rem',
        borderRadius: '0.5rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        pointerEvents: 'auto',
        minWidth: 200,
        maxWidth: 320,
      }}
    >
      {toast.message}
    </motion.div>
  );
}
