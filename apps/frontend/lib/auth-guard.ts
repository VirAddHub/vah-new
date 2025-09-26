// Global auth check guard to prevent multiple simultaneous whoami calls
let globalAuthCheckInProgress = false;
let globalAuthCheckPromise: Promise<unknown> | null = null;

export const authGuard = {
  async checkAuth<T>(checkFunction: () => Promise<T>): Promise<T> {
    // If a check is already in progress, return the existing promise
    if (globalAuthCheckInProgress && globalAuthCheckPromise) {
      console.log('Auth check already in progress globally, returning existing promise');
      return globalAuthCheckPromise as Promise<T>;
    }

    // Start new auth check
    globalAuthCheckInProgress = true;
    globalAuthCheckPromise = checkFunction();

    try {
      const result = await globalAuthCheckPromise;
      return result as T;
    } finally {
      // Always reset the global state
      globalAuthCheckInProgress = false;
      globalAuthCheckPromise = null;
    }
  },

  isChecking(): boolean {
    return globalAuthCheckInProgress;
  }
};
