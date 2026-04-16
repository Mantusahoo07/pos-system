import React, { useState, useEffect } from 'react';
import { useSound } from '../../hooks/useSound';
import { useVibration } from '../../hooks/useVibration';

function SettingsPanel({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: true,
    soundVolume: 0.7,
    autoPrintReceipt: false,
    kitchenTimerEnabled: true,
    theme: 'light'
  });

  const { playSound } = useSound();
  const { vibrate } = useVibration();

  useEffect(() => {
    const saved = localStorage.getItem('posSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('posSettings', JSON.stringify(newSettings));
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
    
    // Test sound/vibration when enabled
    if (key === 'soundEnabled' && value) {
      playSound('order-placed');
    }
    if (key === 'vibrationEnabled' && value) {
      vibrate(200);
    }
  };

  const handleVolumeChange = (volume) => {
    handleSettingChange('soundVolume', volume);
  };

  const resetSettings = () => {
    const defaultSettings = {
      soundEnabled: true,
      vibrationEnabled: true,
      notificationsEnabled: true,
      soundVolume: 0.7,
      autoPrintReceipt: false,
      kitchenTimerEnabled: true,
      theme: 'light'
    };
    setSettings(defaultSettings);
    localStorage.setItem('posSettings', JSON.stringify(defaultSettings));
    if (onSettingsChange) {
      onSettingsChange(defaultSettings);
    }
  };

  return (
    <div className="settings-modal">
      <div className="settings-container">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-section">
          <h3>Audio & Notifications</h3>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
              />
              Enable Sounds
            </label>
          </div>
          
          {settings.soundEnabled && (
            <div className="setting-item">
              <label>Sound Volume</label>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.soundVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              />
              <span>{Math.round(settings.soundVolume * 100)}%</span>
            </div>
          )}
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={(e) => handleSettingChange('vibrationEnabled', e.target.checked)}
              />
              Enable Vibration
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
              />
              Enable Desktop Notifications
            </label>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Order Settings</h3>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.autoPrintReceipt}
                onChange={(e) => handleSettingChange('autoPrintReceipt', e.target.checked)}
              />
              Auto-print Receipt after Payment
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.kitchenTimerEnabled}
                onChange={(e) => handleSettingChange('kitchenTimerEnabled', e.target.checked)}
              />
              Enable Kitchen Timer
            </label>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Appearance</h3>
          
          <div className="setting-item">
            <label>Theme</label>
            <select 
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        
        <div className="settings-footer">
          <button className="reset-btn" onClick={resetSettings}>
            Reset to Default
          </button>
          <button className="save-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;