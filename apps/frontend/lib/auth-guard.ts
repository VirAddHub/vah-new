// Global auth check guard to prevent multiple simultaneous whoami calls
let globalAuthCheckInProgress = false;
let globalAuthCheckPromise: Promise<any> | null = null;

export const authGuard = {
  async checkAuth(checkFunction: () => Promise<any>): Promise<any> {
    // If a check is already in progress, return the existing promise
    if (globalAuthCheckInProgress && globalAuthCheckPromise) {
      console.log('Auth check already in progress globally, returning existing promise');
      return globalAuthCheckPromise;
    }

    // Start new auth check
    globalAuthCheckInProgress = true;
    globalAuthCheckPromise = checkFunction();

    try {
      const result = await globalAuthCheckPromise;
      return result;
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
