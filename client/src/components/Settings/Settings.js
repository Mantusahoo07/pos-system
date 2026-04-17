import React, { useState, useEffect } from 'react';
import { useZ91Printer } from '../../hooks/useZ91Printer';

// ... (keep your existing imports and other settings code)

function Settings({ menu, categories, onSettingsUpdate, user }) {
  const [activeTab, setActiveTab] = useState('business');
  const [printerIP, setPrinterIP] = useState('192.168.1.200');
  const { isConnected, connect, printText, getStatus } = useZ91Printer();
  
  // ... (keep your existing state and functions)

  // Add Printer Settings Tab
  const renderPrinterSettings = () => (
    <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', border: `1px solid ${COLORS.border}` }}>
      <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
        🖨️ Z91 Printer Settings
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>
          Printer IP Address
        </label>
        <input
          type="text"
          value={printerIP}
          onChange={(e) => setPrinterIP(e.target.value)}
          placeholder="192.168.1.200"
          style={{
            width: '100%',
            padding: '10px',
            background: COLORS.neutralLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            color: COLORS.textPrimary,
            fontSize: '12px'
          }}
        />
        <p style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '4px' }}>
          Find IP in Z91 Settings → Network → WiFi → IP Address
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={async () => {
            const success = await connect(printerIP);
            if (success) {
              localStorage.setItem('printerIP', printerIP);
              alert('Printer connected successfully!');
            } else {
              alert('Failed to connect to printer. Check IP address.');
            }
          }}
          style={{
            flex: 1,
            padding: '10px',
            background: COLORS.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Connect Printer
        </button>
        
        <button
          onClick={async () => {
            const status = await getStatus();
            alert(status.connected ? 'Printer is connected' : 'Printer is disconnected');
          }}
          style={{
            flex: 1,
            padding: '10px',
            background: COLORS.neutralLight,
            color: COLORS.textSecondary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Check Status
        </button>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={async () => {
            await printText('Test Print\nPOS System Test\n' + new Date().toLocaleString());
            alert('Test print sent!');
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: COLORS.success,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          🧾 Test Print
        </button>
      </div>
      
      <div style={{ 
        padding: '12px', 
        background: isConnected ? `${COLORS.success}20` : `${COLORS.danger}20`,
        borderRadius: '6px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '12px', color: isConnected ? COLORS.success : COLORS.danger }}>
          {isConnected ? '✅ Printer Connected' : '❌ Printer Disconnected'}
        </span>
      </div>
    </div>
  );

  // Add printer tab to tabs array
  const tabs = [
    { id: 'business', label: 'Business', icon: FiHome },
    { id: 'tables', label: 'Tables', icon: FiUsers },
    { id: 'categories', label: 'Categories', icon: FiTag },
    { id: 'items', label: 'Menu Items', icon: FiPackage },
    { id: 'printer', label: 'Printer', icon: FiPrinter },  // Add this
    { id: 'importexport', label: 'Import/Export', icon: FiUpload },
    { id: 'backup', label: 'Backup', icon: FiDatabase },
    { id: 'general', label: 'General', icon: FiSettings },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'users', label: 'Users', icon: FiUsers }
  ];

  // Add render case for printer tab
  // In the return statement, add:
  {activeTab === 'printer' && renderPrinterSettings()}
  
  // ... rest of your Settings component
}

export default Settings;
