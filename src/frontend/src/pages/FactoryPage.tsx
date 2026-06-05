import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFactory } from '../hooks/useFactory.js';
import { useSimulator } from '../hooks/useSimulator.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { FactoryCanvas } from '../components/factory/FactoryCanvas.js';
import { DetailPanel } from '../components/panel/DetailPanel.js';
import { FormOverlay } from '../components/ui/FormOverlay.js';
import { MonitoringForm } from '../components/ui/MonitoringForm.js';
import { SensorForm } from '../components/ui/SensorForm.js';
import { ThemeToggle } from '../components/ui/ThemeToggle.js';
import { SimulatorBar } from '../components/ui/SimulatorBar.js';
import { ReadingsModal } from '../components/ui/ReadingsModal.js';
import { ToastContainer } from '../components/ui/Toast.js';
import type { ToastItem } from '../components/ui/Toast.js';
import type { Reading } from '../types/Reading.js';

type FormMode = 'createMonitoring' | 'createSensor';

export function FactoryPage() {
  const factory   = useFactory();
  const isMobile  = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [panelOpen, setPanelOpen]           = useState(isDesktop);
  const [showZoneLabels, setShowZoneLabels] = useState(true);

  const [formMode, setFormMode]                       = useState<FormMode>('createMonitoring');
  const [isFormOpen, setIsFormOpen]                   = useState(false);
  const [preselectedZoneId, setPreselectedZoneId]     = useState<string | undefined>();
  const [preselectedSensorId, setPreselectedSensorId] = useState<string | undefined>();
  const [toasts, setToasts]                           = useState<ToastItem[]>([]);

  // Estado del historial
  const [historialOpen, setHistorialOpen]             = useState(false);
  const [historialMonitoringId, setHistorialMonitoringId] = useState<string | null>(null);

  // IDs de monitoreos recientemente actualizados para el efecto bounce
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());

  const showToast = useCallback((message: string, variant: 'success' | 'error') => {
    setToasts((prev) => [...prev.slice(-2), { id: `${Date.now()}`, message, variant }]);
  }, []);

  // Callback del simulador — actualiza lecturas y dispara bounce visual
  const handleBatchComplete = useCallback((newReadings: Record<string, Reading>) => {
    factory.updateLatestReadings(newReadings);
    const ids = new Set(Object.keys(newReadings));
    setRecentlyUpdated(ids);
    setTimeout(() => setRecentlyUpdated(new Set()), 400);
  }, [factory]);

  const simulator = useSimulator({
    monitorings: factory.monitorings,
    latestReadings: factory.latestReadings,
    onBatchComplete: handleBatchComplete,
    onAlert: (_id, value, threshold, sensorName, zoneName) => {
      showToast(
        `⚠ ${sensorName} superó el umbral en ${zoneName} (${value} > ${threshold})`,
        'error'
      );
    },
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const selectedZone = factory.zones.find((z) => z.id === factory.selectedZoneId) ?? null;
  const selectedSensor = factory.sensors.find((s) => s.id === factory.selectedSensorId) ?? null;
  const selectedMonitorings = factory.monitorings.filter(
    (m) => m.sensor.id === factory.selectedSensorId,
  );

  function handleAddSensor() {
    setPreselectedZoneId(factory.selectedZoneId ?? undefined);
    setPreselectedSensorId(factory.selectedSensorId ?? undefined);
    setFormMode('createMonitoring');
    setIsFormOpen(true);
  }

  function handleCreateSensor() {
    setFormMode('createSensor');
    setIsFormOpen(true);
  }

  // Abre el panel si está cerrado cuando el usuario selecciona un sensor
  const handleSensorClick = useCallback((id: string) => {
    factory.selectSensor(id);
    setPanelOpen(true);
  }, [factory]);

  const panelContent = (
    <DetailPanel
      selectedZone={selectedZone}
      selectedSensor={selectedSensor}
      selectedMonitorings={selectedMonitorings}
      activeFilters={factory.activeFilters}
      latestReadings={factory.latestReadings}
      onToggleFilter={factory.toggleFilter}
      onAddSensor={handleAddSensor}
      onCreateSensor={handleCreateSensor}
      onRefresh={factory.refreshMonitorings}
      onViewHistory={(monitoringId) => {
        setHistorialMonitoringId(monitoringId);
        setHistorialOpen(true);
      }}
      showToast={showToast}
      isOpen={panelOpen}
      onToggleOpen={() => setPanelOpen((v) => !v)}
    />
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      backgroundColor: 'var(--bg-app)', fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── Topbar ── */}
      <header style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-ui)', flexShrink: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)' }}>
            <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Monitoreo Industrial
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {factory.error && (
            <span style={{ color: 'var(--sensor-alert)', fontSize: '0.7rem' }}>{factory.error}</span>
          )}

          <button
            type="button"
            onClick={() => setShowZoneLabels((v) => !v)}
            aria-label={showZoneLabels ? 'Ocultar nombres de zona' : 'Mostrar nombres de zona'}
            title={showZoneLabels ? 'Ocultar nombres de zona' : 'Mostrar nombres de zona'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', borderRadius: 6,
              border: '1px solid var(--border-ui)',
              backgroundColor: showZoneLabels ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: showZoneLabels ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <TagIcon size={12} />
            {showZoneLabels ? 'Zonas ON' : 'Zonas OFF'}
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {factory.loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5,
              backgroundColor: 'rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
                Cargando plano…
              </span>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <FactoryCanvas
              zones={factory.zones}
              sensors={factory.sensors}
              monitorings={factory.monitorings}
              zonePaths={factory.zonePaths}
              zoneBoundsMap={factory.zoneBoundsMap}
              sensorInstances={factory.sensorInstances}
              recentlyUpdated={recentlyUpdated}
              activeFilters={factory.activeFilters}
              selectedZoneId={factory.selectedZoneId}
              selectedSensorId={factory.selectedSensorId}
              showZoneLabels={showZoneLabels}
              onZoneClick={factory.selectZone}
              onSensorClick={handleSensorClick}
            />
          </div>
          <SimulatorBar {...simulator} />
        </main>

        {/* Panel lateral (tablet + desktop) */}
        {!isMobile && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-label={panelOpen ? 'Contraer panel' : 'Expandir panel'}
              title={panelOpen ? 'Contraer panel' : 'Expandir panel'}
              style={{
                width: 20, height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--bg-panel)',
                border: 'none', borderLeft: '1px solid var(--border-ui)',
                cursor: 'pointer', color: 'var(--text-muted)',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              <motion.span animate={{ rotate: panelOpen ? 0 : 180 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M7 2L4 5L7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            </button>

            <motion.div
              animate={{ width: panelOpen ? 220 : 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div style={{ width: 220, height: '100%' }}>{panelContent}</div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Panel mobile como drawer inferior */}
      {isMobile && (
        <>
          <div style={{ backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--border-ui)', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              style={{
                width: '100%', padding: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              <motion.span animate={{ rotate: panelOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
              Panel de control
            </button>
          </div>

          <AnimatePresence>
            {panelOpen && (
              <>
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 30 }}
                  onClick={() => setPanelOpen(false)}
                />
                <motion.div
                  key="drawer"
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    maxHeight: '70vh', backgroundColor: 'var(--bg-panel)',
                    borderRadius: '16px 16px 0 0', zIndex: 40, overflowY: 'auto',
                  }}
                >
                  <div style={{ width: 36, height: 4, backgroundColor: 'var(--border-ui)', borderRadius: 2, margin: '10px auto 4px' }} />
                  {panelContent}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Formularios (solo crear) ── */}
      <AnimatePresence>
        {isFormOpen && formMode === 'createMonitoring' && (
          <FormOverlay isOpen onClose={() => setIsFormOpen(false)} title="Asignar sensor a zona">
            <MonitoringForm
              mode="create"
              preselectedZoneId={preselectedZoneId}
              preselectedSensorId={preselectedSensorId}
              onSuccess={() => void factory.refreshMonitorings()}
              onClose={() => setIsFormOpen(false)}
              showToast={showToast}
            />
          </FormOverlay>
        )}
        {isFormOpen && formMode === 'createSensor' && (
          <FormOverlay isOpen onClose={() => setIsFormOpen(false)} title="Crear nuevo sensor">
            <SensorForm
              onSuccess={() => void factory.refreshAll()}
              onClose={() => setIsFormOpen(false)}
              showToast={showToast}
            />
          </FormOverlay>
        )}
      </AnimatePresence>

      {/* Modal de historial de lecturas */}
      <AnimatePresence>
        {historialOpen && historialMonitoringId && (() => {
          const histMonitoring = factory.monitorings.find((m) => m.id === historialMonitoringId);
          if (!histMonitoring) return null;
          const histSensor = factory.sensors.find((s) => s.id === histMonitoring.sensor.id);
          if (!histSensor) return null;

          // Zonas disponibles para este sensor
          const sensorMonitorings = factory.monitorings.filter(
            (m) => m.sensor.id === histSensor.id
          );
          const availableZones = sensorMonitorings.map((m) => m.zone);
          const selectedZoneId = histMonitoring.zone.id;

          return (
            <ReadingsModal
              monitoringId={historialMonitoringId}
              monitoring={histMonitoring}
              sensor={histSensor}
              availableZones={availableZones}
              selectedZoneId={selectedZoneId}
              onZoneChange={(zoneId) => {
                const m = factory.monitorings.find(
                  (mon) => mon.sensor.id === histSensor.id && mon.zone.id === zoneId
                );
                if (m) setHistorialMonitoringId(m.id);
              }}
              onClose={() => setHistorialOpen(false)}
            />
          );
        })()}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function TagIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 2h4l4 4-4 4-4-4V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="4.5" cy="4.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
