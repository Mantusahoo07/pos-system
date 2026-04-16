import { useCallback } from 'react';

export const useVibration = () => {
  const vibrate = useCallback((pattern) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  }, []);

  const stopVibration = useCallback(() => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(0);
    }
  }, []);

  return { vibrate, stopVibration };
};