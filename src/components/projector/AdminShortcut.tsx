import { useState, useRef, useEffect, useCallback } from 'react';
import { useDisplaySettings } from '../../hooks/useDisplaySettings';
import styles from './AdminShortcut.module.css';

// Keyboard shortcuts list: F for fullscreen, C for celebrate, Shift+A for admin

export default function AdminShortcut() {
  const { showAdminShortcut, isLite, isReducedMotion } = useDisplaySettings();
  const isInstant = isLite || isReducedMotion;

  const [isVisible, setIsVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const isHoveringRef = useRef(false);
  const isSuppressedRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback(() => {
    isHoveringRef.current = true;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (!isSuppressedRef.current) {
      setIsVisible(true);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    isHoveringRef.current = false;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      isSuppressedRef.current = false;
      hideTimerRef.current = null;
    }, 1500);
  }, []);

  const handleMouseMove = useCallback(() => {
    // Show cursor if hidden by ProjectorView 2s inactivity
    if (document.body.style.cursor === 'none') {
      document.body.style.cursor = '';
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isSuppressedRef.current) return;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    touchTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      touchTimerRef.current = null;
    }, 700);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const openAdmin = useCallback(() => {
    setIsVisible(false);
    isSuppressedRef.current = true;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    try {
      const win = window.open('/admin', 'verseup-admin');
      if (win && !win.closed) {
        win.focus();
      } else {
        setShowToast(true);
      }
    } catch {
      setShowToast(true);
    }
  }, []);

  // Keyboard shortcut: Shift + A opens admin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showAdminShortcut) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (!e.shiftKey) return;
      if (e.key !== 'A' && e.key !== 'a' && e.code !== 'KeyA') return;

      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      openAdmin();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAdmin, showAdminShortcut]);

  // Toast auto-dismiss after 4 seconds
  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [showToast]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  if (!showAdminShortcut) {
    return null;
  }

  return (
    <>
      {/* 96x96px invisible fixed hotspot in top-left corner */}
      <div
        data-testid="admin-hotspot"
        className={styles.adm2Hotspot}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      {/* ⚙ Admin button (revealed on hotspot hover/touch) */}
      <button
        type="button"
        data-testid="admin-shortcut-btn"
        aria-label="Open admin"
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
        className={`${styles.adm2Button} ${isVisible ? styles.adm2ButtonVisible : ''} ${
          isInstant ? styles.adm2Instant : ''
        }`}
        onClick={openAdmin}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onMouseMove={handleMouseMove}
      >
        <span aria-hidden="true" style={{ fontSize: '20px' }}>⚙</span>
        <span>ADMIN</span>
      </button>

      {/* Non-blocking popup blocked toast */}
      {showToast && (
        <div data-testid="admin-popup-toast" className={styles.adm2Toast} role="alert">
          <span>Allow pop-ups for this site, then try again</span>
          <a
            href="/admin"
            data-testid="admin-toast-fallback-link"
            className={styles.adm2ToastLink}
          >
            Open admin here
          </a>
        </div>
      )}
    </>
  );
}
