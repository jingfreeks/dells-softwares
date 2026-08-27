export interface LoginScreenProps {
  onSetupDevice?: () => void;
  /** Proposed per MOBILE_UI_DESIGN_SPECIFICATION.md §5 M-002 -- not wired to real routing yet (Phase 3). */
  onSwitchToCreateAccount?: () => void;
}
