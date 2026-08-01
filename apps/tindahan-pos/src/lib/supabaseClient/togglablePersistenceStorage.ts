/**
 * Backs the "keep me signed in on this device" checkbox on the login
 * screen. When persistence is disabled, writes are dropped (and any
 * existing value cleared) so the session lives only in memory for this
 * tab and isn't there to restore after the browser closes.
 */
class TogglablePersistenceStorage {
  private persistenceEnabled = true;

  setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }

  getItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (!this.persistenceEnabled) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    window.localStorage.removeItem(key);
  }
}

export const togglablePersistenceStorage = new TogglablePersistenceStorage();
