// Capacitor Printer Service
import { Capacitor } from '@capacitor/core';

// Check if running on Android
const isAndroid = Capacitor.getPlatform() === 'android';

// Printer plugin interface
let PrinterPlugin = null;

if (isAndroid) {
    // @ts-ignore - Capacitor plugin will be injected
    PrinterPlugin = Capacitor.Plugin ? Capacitor.Plugin : window.Capacitor?.Plugins?.Printer;
    
    if (!PrinterPlugin && window.Capacitor) {
        PrinterPlugin = window.Capacitor.Plugins.Printer;
    }
}

class CapacitorPrinterService {
    constructor() {
        this.isReady = false;
        this.deviceInfo = null;
    }

    async init() {
        if (!isAndroid) {
            console.log('Not on Android, printer service disabled');
            return false;
        }

        if (!PrinterPlugin) {
            console.error('Printer plugin not available');
            return false;
        }

        try {
            const status = await PrinterPlugin.checkPrinterStatus();
            this.deviceInfo = status;
            this.isReady = status.printerReady;
            console.log('Printer status:', status);
            return this.isReady;
        } catch (error) {
            console.error('Failed to check printer status:', error);
            return false;
        }
    }

    async printText(text, options = {}) {
        if (!this.isReady && !await this.init()) {
            throw new Error('Printer not ready');
        }

        try {
            await PrinterPlugin.printText({
                text: text,
                size: options.size || 0,
                align: options.align || 0,
                bold: options.bold || false
            });
            console.log('Print successful');
            return true;
        } catch (error) {
            console.error('Print failed:', error);
            throw error;
        }
    }

    async printReceipt(receiptData) {
        if (!this.isReady && !await this.init()) {
            throw new Error('Printer not ready');
        }

        try {
            await PrinterPlugin.printReceipt({ receipt: receiptData });
            console.log('Receipt printed successfully');
            return true;
        } catch (error) {
            console.error('Receipt print failed:', error);
            throw error;
        }
    }

    async getPrinterStatus() {
        if (!isAndroid) return { isAndroid: false };
        
        if (!PrinterPlugin) return { error: 'Plugin not available' };
        
        try {
            return await PrinterPlugin.checkPrinterStatus();
        } catch (error) {
            return { error: error.message };
        }
    }
}

export default new CapacitorPrinterService();