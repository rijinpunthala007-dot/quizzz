import { useState, useId, useRef, useEffect } from 'react';
import type { DisplaySettings } from '../../types';
import { DEFAULT_DISPLAY_SETTINGS } from '../../types';
import { getActiveUrlOverrides } from '../../hooks/useDisplaySettings';
import styles from './ProjectorEffectsCard.module.css';

interface ProjectorEffectsCardProps {
  display?: DisplaySettings;
  onUpdate: (updater: (prev: DisplaySettings) => DisplaySettings) => void;
}

export default function ProjectorEffectsCard({
  display = DEFAULT_DISPLAY_SETTINGS,
  onUpdate,
}: ProjectorEffectsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Detect URL overrides in THIS admin window
  const [urlOverrides, setUrlOverrides] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrlOverrides(getActiveUrlOverrides());
    }
  }, []);

  const baseId = useId();

  // Read current values (with defaults if missing)
  const bgPreset = display.bgPreset ?? 'soft';
  const performanceMode = display.performanceMode ?? false;
  const showAdminShortcut = display.showAdminShortcut ?? true;
  const scoreAnimations = display.scoreAnimations ?? true;
  const rays = display.rays ?? (bgPreset === 'off' ? false : true);
  const particles = display.particles ?? (bgPreset === 'off' ? false : true);
  const halo = display.halo ?? (bgPreset === 'off' ? false : true);
  const dove = display.dove ?? (bgPreset === 'off' ? false : true);
  const arches = display.arches ?? (bgPreset === 'full' ? true : false);
  const candle = display.candle ?? (bgPreset === 'full' ? true : false);
  const confetti = display.confetti ?? true;

  // Segmented control presets
  const presets: Array<{ id: 'off' | 'soft' | 'full'; label: string; desc: string }> = [
    {
      id: 'off',
      label: 'Off',
      desc: 'Plain background, no extras.',
    },
    {
      id: 'soft',
      label: 'Soft',
      desc: "Gentle light rays, floating lights, winner's halo, and dove on leader change.",
    },
    {
      id: 'full',
      label: 'Full',
      desc: 'Soft effects plus stained-glass arches and candle flicker.',
    },
  ];

  const handleSelectPreset = (preset: 'off' | 'soft' | 'full') => {
    onUpdate((prev) => {
      if (preset === 'off') {
        return {
          ...prev,
          bgPreset: 'off',
          rays: false,
          particles: false,
          halo: false,
          dove: false,
          arches: false,
          candle: false,
        };
      }
      if (preset === 'full') {
        return {
          ...prev,
          bgPreset: 'full',
          rays: true,
          particles: true,
          halo: true,
          dove: true,
          arches: true,
          candle: true,
        };
      }
      // 'soft'
      return {
        ...prev,
        bgPreset: 'soft',
        rays: true,
        particles: true,
        halo: true,
        dove: true,
        arches: false,
        candle: false,
      };
    });
  };

  // Check if current 6 toggles match a preset
  const checkPresetMatch = (
    r: boolean,
    p: boolean,
    h: boolean,
    d: boolean,
    a: boolean,
    c: boolean
  ): 'off' | 'soft' | 'full' | 'custom' => {
    if (!r && !p && !h && !d && !a && !c) return 'off';
    if (r && p && h && d && a && c) return 'full';
    if (r && p && h && d && !a && !c) return 'soft';
    return 'custom';
  };

  const handleToggleAdvanced = (
    key: 'rays' | 'particles' | 'halo' | 'dove' | 'arches' | 'candle'
  ) => {
    onUpdate((prev) => {
      const currentR = prev.rays ?? (bgPreset === 'off' ? false : true);
      const currentP = prev.particles ?? (bgPreset === 'off' ? false : true);
      const currentH = prev.halo ?? (bgPreset === 'off' ? false : true);
      const currentD = prev.dove ?? (bgPreset === 'off' ? false : true);
      const currentA = prev.arches ?? (bgPreset === 'full' ? true : false);
      const currentC = prev.candle ?? (bgPreset === 'full' ? true : false);

      const nextVals = {
        rays: key === 'rays' ? !currentR : currentR,
        particles: key === 'particles' ? !currentP : currentP,
        halo: key === 'halo' ? !currentH : currentH,
        dove: key === 'dove' ? !currentD : currentD,
        arches: key === 'arches' ? !currentA : currentA,
        candle: key === 'candle' ? !currentC : currentC,
      };

      const matchedPreset = checkPresetMatch(
        nextVals.rays,
        nextVals.particles,
        nextVals.halo,
        nextVals.dove,
        nextVals.arches,
        nextVals.candle
      );

      return {
        ...prev,
        ...nextVals,
        bgPreset: matchedPreset,
      };
    });
  };

  const handleReset = () => {
    onUpdate(() => ({ ...DEFAULT_DISPLAY_SETTINGS }));
    setIsConfirmingReset(false);
  };

  // Keyboard navigation for segmented control
  const segRef = useRef<HTMLDivElement>(null);
  const handleSegmentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentIdx = presets.findIndex((p) => p.id === bgPreset);
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (currentIdx + delta + presets.length) % presets.length;
      handleSelectPreset(presets[nextIdx].id);
    }
  };

  // Get description for currently selected preset
  let presetDescription = '';
  if (bgPreset === 'custom') {
    presetDescription = 'Custom background effects configuration.';
  } else {
    const found = presets.find((p) => p.id === bgPreset);
    presetDescription = found ? found.desc : 'Gentle light rays, floating lights, winner’s halo.';
  }

  // Status line reading from shared state
  const statusPresetLabel =
    performanceMode
      ? 'Lite mode (effects off)'
      : bgPreset === 'soft'
      ? 'Soft effects'
      : bgPreset === 'full'
      ? 'Full effects'
      : bgPreset === 'off'
      ? 'Off (plain)'
      : 'Custom effects';

  return (
    <section className={styles.pfxCard} data-testid="projector-effects-card">
      {/* Header Button */}
      <button
        type="button"
        className={styles.pfxHeaderBtn}
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls={`${baseId}-content`}
      >
        <div className={styles.pfxHeaderLeft}>
          <span className={styles.pfxChevron}>{isOpen ? '▼' : '▶'}</span>
          <div className={styles.pfxTitleBlock}>
            <h2 className={styles.pfxTitle}>Projector Effects</h2>
            <span className={styles.pfxSubtitle}>
              Changes appear on the projector within a second.
            </span>
          </div>
        </div>

        <span className={styles.pfxHeaderBadge} data-testid="pfx-status-badge">
          {statusPresetLabel}
        </span>
      </button>

      {isOpen && (
        <div id={`${baseId}-content`} className={styles.pfxBody}>
          {/* URL Override Yellow Warning Note */}
          {urlOverrides.length > 0 && (
            <div className={styles.pfxUrlWarning} data-testid="pfx-url-override-note" role="alert">
              <span className={styles.pfxUrlWarningIcon}>⚠️</span>
              <span>
                This window is using <strong>{urlOverrides.join(', ')}</strong> from the web
                address. Other windows follow the settings below.
              </span>
            </div>
          )}

          {/* 1. BACKGROUND EFFECTS SEGMENTED CONTROL */}
          <div className={styles.pfxGroup}>
            <div className={styles.pfxGroupHeader}>
              <span className={styles.pfxLabel}>Background Effects</span>
            </div>

            <div
              ref={segRef}
              role="radiogroup"
              aria-label="Background Effects"
              tabIndex={0}
              onKeyDown={handleSegmentKeyDown}
              className={styles.pfxSegmentedControl}
            >
              {presets.map((preset) => {
                const isSelected = bgPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`pfx-preset-${preset.id}`}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`${styles.pfxSegmentBtn} ${
                      isSelected ? styles.pfxSegmentBtnActive : ''
                    }`}
                  >
                    {isSelected && <span>✓</span>}
                    {preset.label}
                  </button>
                );
              })}

              {bgPreset === 'custom' && (
                <div
                  className={styles.pfxSegmentCustomBadge}
                  data-testid="pfx-preset-custom-badge"
                  title="Individual background toggles have been customized"
                >
                  Custom
                </div>
              )}
            </div>

            <p className={styles.pfxDescription} data-testid="pfx-preset-description">
              {presetDescription}
            </p>
          </div>

          {/* 2. PERFORMANCE MODE (LITE) */}
          <div className={styles.pfxSwitchRow}>
            <div className={styles.pfxSwitchText}>
              <label
                htmlFor={`${baseId}-lite`}
                className={styles.pfxSwitchLabel}
                onClick={() =>
                  onUpdate((prev) => ({
                    ...prev,
                    performanceMode: !performanceMode,
                  }))
                }
              >
                Performance Mode (Lite)
              </label>
              <span className={styles.pfxSwitchHint}>
                Use on a slow laptop. Turns off almost all animation.
              </span>
            </div>
            <button
              id={`${baseId}-lite`}
              type="button"
              role="switch"
              aria-checked={performanceMode}
              aria-label="Performance Mode (Lite)"
              data-testid="pfx-toggle-lite"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  performanceMode: !performanceMode,
                }))
              }
              className={`${styles.pfxToggleSwitch} ${
                performanceMode ? styles.pfxToggleSwitchOn : ''
              }`}
            >
              <span className={styles.pfxToggleKnob} />
            </button>
          </div>

          {/* 3. HIDDEN ADMIN BUTTON ON THE LEADERBOARD */}
          <div className={styles.pfxSwitchRow}>
            <div className={styles.pfxSwitchText}>
              <label
                htmlFor={`${baseId}-admin-btn`}
                className={styles.pfxSwitchLabel}
                onClick={() =>
                  onUpdate((prev) => ({
                    ...prev,
                    showAdminShortcut: !showAdminShortcut,
                  }))
                }
              >
                Hidden admin button on the leaderboard
              </label>
              <span className={styles.pfxSwitchHint}>
                Corner button and Shift + A shortcut. Turn off if someone else operates the
                projector.
              </span>
            </div>
            <button
              id={`${baseId}-admin-btn`}
              type="button"
              role="switch"
              aria-checked={showAdminShortcut}
              aria-label="Hidden admin button on the leaderboard"
              data-testid="pfx-toggle-admin-shortcut"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  showAdminShortcut: !showAdminShortcut,
                }))
              }
              className={`${styles.pfxToggleSwitch} ${
                showAdminShortcut ? styles.pfxToggleSwitchOn : ''
              }`}
            >
              <span className={styles.pfxToggleKnob} />
            </button>
          </div>

          {/* 4. SCORE ANIMATIONS */}
          <div className={styles.pfxSwitchRow}>
            <div className={styles.pfxSwitchText}>
              <label
                htmlFor={`${baseId}-score-anim`}
                className={styles.pfxSwitchLabel}
                onClick={() =>
                  onUpdate((prev) => ({
                    ...prev,
                    scoreAnimations: !scoreAnimations,
                  }))
                }
              >
                Score animations
              </label>
              <span className={styles.pfxSwitchHint}>
                Rows sliding to new places, counting-up scores and the gold +points chips.
              </span>
            </div>
            <button
              id={`${baseId}-score-anim`}
              type="button"
              role="switch"
              aria-checked={scoreAnimations}
              aria-label="Score animations"
              data-testid="pfx-toggle-score-anim"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  scoreAnimations: !scoreAnimations,
                }))
              }
              className={`${styles.pfxToggleSwitch} ${
                scoreAnimations ? styles.pfxToggleSwitchOn : ''
              }`}
            >
              <span className={styles.pfxToggleKnob} />
            </button>
          </div>

          {/* 5. ADVANCED COLLAPSIBLE SECTION */}
          <div className={styles.pfxAdvancedSection}>
            <button
              type="button"
              className={styles.pfxAdvancedBtn}
              onClick={() => setIsAdvancedOpen((o) => !o)}
              aria-expanded={isAdvancedOpen}
              aria-controls={`${baseId}-advanced-body`}
              data-testid="pfx-advanced-toggle-btn"
            >
              <span>{isAdvancedOpen ? '▼' : '▶'} Advanced background effects & celebration</span>
              <span className={styles.pfxLabel}>
                {bgPreset === 'custom' ? 'Custom' : isAdvancedOpen ? 'Hide' : 'Show'}
              </span>
            </button>

            {isAdvancedOpen && (
              <div id={`${baseId}-advanced-body`} className={styles.pfxAdvancedBody}>
                {/* A. Light rays */}
                <div className={styles.pfxMiniToggleRow}>
                  <span className={styles.pfxMiniLabel}>Light rays</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rays}
                    aria-label="Light rays"
                    data-testid="pfx-toggle-rays"
                    onClick={() => handleToggleAdvanced('rays')}
                    className={`${styles.pfxMiniToggle} ${rays ? styles.pfxMiniToggleOn : ''}`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>

                {/* B. Floating lights */}
                <div className={styles.pfxMiniToggleRow}>
                  <span className={styles.pfxMiniLabel}>Floating lights</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={particles}
                    aria-label="Floating lights"
                    data-testid="pfx-toggle-particles"
                    onClick={() => handleToggleAdvanced('particles')}
                    className={`${styles.pfxMiniToggle} ${
                      particles ? styles.pfxMiniToggleOn : ''
                    }`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>

                {/* C. Winner's halo */}
                <div className={styles.pfxMiniToggleRow}>
                  <span className={styles.pfxMiniLabel}>Winner&apos;s halo</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={halo}
                    aria-label="Winner's halo"
                    data-testid="pfx-toggle-halo"
                    onClick={() => handleToggleAdvanced('halo')}
                    className={`${styles.pfxMiniToggle} ${halo ? styles.pfxMiniToggleOn : ''}`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>

                {/* D. Dove on new leader */}
                <div className={styles.pfxMiniToggleRow}>
                  <span className={styles.pfxMiniLabel}>Dove on new leader</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dove}
                    aria-label="Dove on new leader"
                    data-testid="pfx-toggle-dove"
                    onClick={() => handleToggleAdvanced('dove')}
                    className={`${styles.pfxMiniToggle} ${dove ? styles.pfxMiniToggleOn : ''}`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>

                {/* E. Stained-glass arches */}
                <div className={styles.pfxMiniToggleRow}>
                  <span className={styles.pfxMiniLabel}>Stained-glass arches</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={arches}
                    aria-label="Stained-glass arches"
                    data-testid="pfx-toggle-arches"
                    onClick={() => handleToggleAdvanced('arches')}
                    className={`${styles.pfxMiniToggle} ${arches ? styles.pfxMiniToggleOn : ''}`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>

                {/* F. Candle flicker */}
                <div className={styles.pfxMiniToggleRow}>
                  <span className={styles.pfxMiniLabel}>Candle flicker</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={candle}
                    aria-label="Candle flicker"
                    data-testid="pfx-toggle-candle"
                    onClick={() => handleToggleAdvanced('candle')}
                    className={`${styles.pfxMiniToggle} ${candle ? styles.pfxMiniToggleOn : ''}`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>

                {/* G. Winners page confetti and pops */}
                <div className={styles.pfxMiniToggleRow} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.pfxMiniLabel}>Winners page confetti and pops</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={confetti}
                    aria-label="Winners page confetti and pops"
                    data-testid="pfx-toggle-confetti"
                    onClick={() =>
                      onUpdate((prev) => ({
                        ...prev,
                        confetti: !confetti,
                      }))
                    }
                    className={`${styles.pfxMiniToggle} ${
                      confetti ? styles.pfxMiniToggleOn : ''
                    }`}
                  >
                    <span className={styles.pfxMiniKnob} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. RESET TO DEFAULTS & STATUS LINE */}
          <div className={styles.pfxFooter}>
            <div className={styles.pfxStatusText}>
              Projector is showing:{' '}
              <strong className={styles.pfxStatusValue}>{statusPresetLabel}</strong>
            </div>

            {!isConfirmingReset ? (
              <button
                type="button"
                className={styles.pfxResetBtn}
                data-testid="pfx-reset-defaults-btn"
                onClick={() => setIsConfirmingReset(true)}
              >
                ↺ Reset to defaults
              </button>
            ) : (
              <div className={styles.pfxConfirmBar} data-testid="pfx-reset-confirm-bar">
                <span className={styles.pfxConfirmText}>Reset all effects to defaults?</span>
                <button
                  type="button"
                  className={styles.pfxConfirmBtn}
                  data-testid="pfx-confirm-reset-btn"
                  onClick={handleReset}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className={styles.pfxCancelBtn}
                  data-testid="pfx-cancel-reset-btn"
                  onClick={() => setIsConfirmingReset(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
