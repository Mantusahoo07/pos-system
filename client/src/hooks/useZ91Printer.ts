import { useState, useEffect } from 'react';
import { Plugins } from '@capacitor/core';

// Define printer interface
interface Z91PrinterPlugin {
  init(options?: { address?: string }): Promise<{ success: boolean; message?: string }>;
  printText(options: { text: string; align?: string; bold?: boolean }): Promise<{ success: boolean }>;
  getStatus(): Promise<{ connected: boolean }>;
  cutPaper(): Promise<{ success: boolean }>;
  openDrawer(): Promise<{ success: boolean }>;
}

// Mock for web development
const isCapacitor = () => !!(window as any).Capacitor;

export const useZ91Printer = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [plugin, setPlugin] = useState<Z91PrinterPlugin | null>(null);

  useEffect(() => {
    if (isCapacitor()) {
      import('../plugins/Z91Printer').then(module => {
        setPlugin(module.default);
      });
    }
  }, []);

  const connect = async (address?: string) => {
    if (!plugin) {
      console.log('Web mode - printer simulation');
      setIsConnected(true);
      return true;
    }
    
    try {
      const result = await plugin.init({ address });
      setIsConnected(result.success);
      return result.success;
    } catch (error) {
      console.error('Printer connection error:', error);
      return false;
    }
  };

  const printText = async (text: string, options?: { align?: string; bold?: boolean }) => {
    if (!plugin) {
      console.log('Web mode - simulated print:', text);
      alert('Print simulation: ' + text.substring(0, 50));
      return true;
    }
    
    try {
      setIsPrinting(true);
      await plugin.printText({ text, ...options });
      return true;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  const getStatus = async () => {
    if (!plugin) {
      return { connected: true };
    }
    try {
      return await plugin.getStatus();
    } catch (error) {
      return { connected: false };
    }
  };

  return {
    isConnected,
    isPrinting,
    connect,
    printText,
    getStatus
  };
};
