// Add this at the top of your App component
import { StatusBar } from '@capacitor/status-bar';

// In your App component, add useEffect for status bar
useEffect(() => {
  const setupStatusBar = async () => {
    if (window.Capacitor) {
      await StatusBar.setStyle({ style: 'dark' });
      await StatusBar.setBackgroundColor({ color: '#1C1A27' });
    }
  };
  setupStatusBar();
}, []);
