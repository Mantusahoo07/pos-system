import { useEffect } from 'react';

function useKeyboardShortcut(key, callback, ctrl = false, shift = false, alt = false) {
  useEffect(() => {
    const handler = (event) => {
      if (event.key === key && 
          event.ctrlKey === ctrl && 
          event.shiftKey === shift && 
          event.altKey === alt) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ctrl, shift, alt]);
}

export default useKeyboardShortcut;