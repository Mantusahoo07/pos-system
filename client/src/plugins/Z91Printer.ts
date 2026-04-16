import { registerPlugin } from '@capacitor/core';

export interface Z91PrinterPlugin {
  init(options?: { address?: string }): Promise<{ success: boolean; message?: string }>;
  printText(options: { text: string; align?: 'left' | 'center' | 'right'; bold?: boolean }): Promise<{ success: boolean }>;
  printQR(options: { data: string; size?: number }): Promise<{ success: boolean }>;
  cutPaper(): Promise<{ success: boolean }>;
  openDrawer(): Promise<{ success: boolean }>;
  getStatus(): Promise<{ connected: boolean }>;
  printReceipt(options: {
    businessName: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    date: string;
    footer?: string;
  }): Promise<{ success: boolean }>;
}

const Z91Printer = registerPlugin<Z91PrinterPlugin>('Z91Printer');
export default Z91Printer;
