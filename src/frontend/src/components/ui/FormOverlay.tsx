import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function FormOverlay({ isOpen, onClose, title, children }: Props) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen &&
        (isMobile ? (
          <Drawer title={title} onClose={onClose}>
            {children}
          </Drawer>
        ) : (
          <Modal title={title} onClose={onClose}>
            {children}
          </Modal>
        ))}
    </AnimatePresence>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const firstRef = useRef<HTMLElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  return (
    <motion.div
      key="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <motion.div
        key="modal-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: 440,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <OverlayHeader id="modal-title" title={title} onClose={onClose} />
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key="drawer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <motion.div
        key="drawer-content"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) onClose();
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '1rem 1rem 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle visual */}
        <div
          style={{
            width: 40,
            height: 4,
            backgroundColor: 'var(--border-ui)',
            borderRadius: 2,
            margin: '0.75rem auto',
          }}
        />
        <OverlayHeader id="drawer-title" title={title} onClose={onClose} />
        <div style={{ padding: '0.5rem 1rem 1rem' }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function OverlayHeader({
  id,
  title,
  onClose,
}: {
  id: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border-ui)',
      }}
    >
      <h2
        id={id}
        style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '1.2rem',
          lineHeight: 1,
          padding: '0.2rem',
        }}
      >
        ×
      </button>
    </div>
  );
}
