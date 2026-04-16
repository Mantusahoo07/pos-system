import { useState, useEffect } from 'react';
import Z91Printer from '../plugins/Z91Printer';

export const useZ91Printer = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const connect = async (address?: string) => {
    try {
      const result = await Z91Printer.init({ address });
      setIsConnected(result.success);
      return result.success;
    } catch (error) {
      console.error('Printer connection error:', error);
      return false;
    }
  };

  const printText = async (text: string, options?: { align?: 'left' | 'center' | 'right'; bold?: boolean }) => {
    try {
      setIsPrinting(true);
      await Z91Printer.printText({ text, ...options });
      return true;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  const printReceipt = async (receiptData: {
    businessName: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    date: string;
    footer?: string;
  }) => {
    try {
      setIsPrinting(true);
      const result = await Z91Printer.printReceipt(receiptData);
      return result.success;
    } catch (error) {
      console.error('Receipt print error:', error);
      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  const cutPaper = async () => {
    try {
      await Z91Printer.cutPaper();
      return true;
    } catch (error) {
      console.error('Cut paper error:', error);
      return false;
    }
  };

  const openDrawer = async () => {
    try {
      await Z91Printer.openDrawer();
      return true;
    } catch (error) {
      console.error('Open drawer error:', error);
      return false;
    }
  };

  const getStatus = async () => {
    try {
      const status = await Z91Printer.getStatus();
      setIsConnected(status.connected);
      return status;
    } catch (error) {
      console.error('Status check error:', error);
      return { connected: false };
    }
  };

  return {
    isConnected,
    isPrinting,
    connect,
    printText,
    printReceipt,
    cutPaper,
    openDrawer,
    getStatus
  };
};
