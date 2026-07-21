import { useEffect } from 'react';
import type { ToastData } from './ToastContext';

interface ToastProps {
  toast: ToastData;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': 
        return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--accent-green)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
      case 'error': 
        return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--accent-red)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
      case 'warning': 
        return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--accent-gold)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
      case 'info': 
      default: 
        return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--accent-blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success': return 'var(--accent-green-bg)';
      case 'error': return 'var(--accent-red-bg)';
      case 'warning': return 'var(--accent-gold-bg)';
      case 'info': return 'var(--accent-blue-light)';
      default: return 'var(--surface-1)';
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'var(--accent-green)';
      case 'error': return 'var(--accent-red)';
      case 'warning': return 'var(--accent-gold)';
      case 'info': return 'var(--accent-blue)';
      default: return 'var(--border-color)';
    }
  };

  return (
    <div 
      className="toast animate-slide-right"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1rem',
        background: 'var(--bg-card)',
        border: `1px solid ${getBorderColor()}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        width: 'min(320px, calc(100vw - 2rem))',
        marginBottom: '1rem',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: getBackgroundColor(), borderRadius: '50%' }}>
        {getIcon()}
      </div>
      <div className="flex-col gap-1" style={{ flex: 1 }}>
        <h4 className="text-sm font-semibold text-primary">{toast.title}</h4>
        <p className="text-xs text-secondary">{toast.message}</p>
      </div>
      <button className="btn-icon" onClick={onClose} style={{ padding: '0.25rem', margin: '-0.25rem' }}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
