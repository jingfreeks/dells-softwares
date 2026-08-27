export interface CreateAccountScreenProps {
  /** Navigating to Sign In is Proposed (§5 M-003), not wired to real routing yet -- Phase 3. */
  onSwitchToSignIn?: () => void;
}

export interface TouchedFields {
  storeName: boolean;
  ownerName: boolean;
  email: boolean;
  password: boolean;
}
