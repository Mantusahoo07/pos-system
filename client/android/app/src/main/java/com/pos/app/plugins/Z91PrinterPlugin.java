package com.pos.app.plugins;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "Z91Printer")
public class Z91PrinterPlugin extends Plugin {
    private static final String TAG = "Z91Printer";
    private Socket printerSocket;
    private String printerAddress = "192.168.1.200";
    private int printerPort = 9100;
    private boolean isConnected = false;
    
    // ESC/POS Commands - Fixed byte casting
    private static final byte[] ESC_INIT = new byte[]{0x1B, 0x40};
    private static final byte[] ESC_ALIGN_LEFT = new byte[]{0x1B, 0x61, 0x00};
    private static final byte[] ESC_ALIGN_CENTER = new byte[]{0x1B, 0x61, 0x01};
    private static final byte[] ESC_ALIGN_RIGHT = new byte[]{0x1B, 0x61, 0x02};
    private static final byte[] ESC_BOLD_ON = new byte[]{0x1B, 0x45, 0x01};
    private static final byte[] ESC_BOLD_OFF = new byte[]{0x1B, 0x45, 0x00};
    private static final byte[] ESC_FONT_LARGE = new byte[]{0x1D, 0x21, 0x11};
    private static final byte[] ESC_FONT_NORMAL = new byte[]{0x1D, 0x21, 0x00};
    private static final byte[] ESC_FULL_CUT = new byte[]{0x1D, 0x56, 0x00};
    // Fixed: Cast ints to byte
    private static final byte[] ESC_OPEN_DRAWER = new byte[]{(byte)0x1B, (byte)0x70, 0x00, 0x19, (byte)0xFA};
    private static final byte[] ESC_LINE_FEED = new byte[]{0x0A};
    
    @PluginMethod
    public void init(PluginCall call) {
        String address = call.getString("address", printerAddress);
        printerAddress = address;
        
        JSObject ret = new JSObject();
        try {
            printerSocket = new Socket(printerAddress, printerPort);
            printerSocket.setSoTimeout(3000);
            isConnected = true;
            ret.put("success", true);
            ret.put("message", "Printer connected");
            call.resolve(ret);
        } catch (IOException e) {
            Log.e(TAG, "Failed to connect", e);
            isConnected = false;
            ret.put("success", false);
            ret.put("message", e.getMessage());
            call.resolve(ret);
        }
    }
    
    private void ensureConnection() throws IOException {
        if (printerSocket == null || printerSocket.isClosed() || !printerSocket.isConnected()) {
            printerSocket = new Socket(printerAddress, printerPort);
            printerSocket.setSoTimeout(3000);
            isConnected = true;
        }
    }
    
    private void writeBytes(byte[] data) throws IOException {
        ensureConnection();
        OutputStream os = printerSocket.getOutputStream();
        os.write(data);
        os.flush();
    }
    
    @PluginMethod
    public void printText(PluginCall call) {
        try {
            String text = call.getString("text", "");
            String align = call.getString("align", "left");
            boolean bold = call.getBoolean("bold", false);
            
            switch (align) {
                case "center":
                    writeBytes(ESC_ALIGN_CENTER);
                    break;
                case "right":
                    writeBytes(ESC_ALIGN_RIGHT);
                    break;
                default:
                    writeBytes(ESC_ALIGN_LEFT);
            }
            
            if (bold) writeBytes(ESC_BOLD_ON);
            writeBytes(text.getBytes(StandardCharsets.UTF_8));
            writeBytes(ESC_LINE_FEED);
            if (bold) writeBytes(ESC_BOLD_OFF);
            writeBytes(ESC_ALIGN_LEFT);
            
            call.resolve(new JSObject().put("success", true));
        } catch (IOException e) {
            call.reject("Print failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void printQR(PluginCall call) {
        try {
            String data = call.getString("data", "");
            int size = call.getInt("size", 8);
            
            writeBytes(new byte[]{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, (byte)size});
            
            int dataLen = data.length();
            writeBytes(new byte[]{0x1D, 0x28, 0x6B, (byte)(dataLen + 3), 0x00, 0x31, 0x50, 0x30});
            writeBytes(data.getBytes(StandardCharsets.UTF_8));
            writeBytes(new byte[]{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x52, 0x30});
            
            call.resolve(new JSObject().put("success", true));
        } catch (IOException e) {
            call.reject("QR print failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void cutPaper(PluginCall call) {
        try {
            writeBytes(ESC_FULL_CUT);
            call.resolve(new JSObject().put("success", true));
        } catch (IOException e) {
            call.reject("Cut paper failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void openDrawer(PluginCall call) {
        try {
            writeBytes(ESC_OPEN_DRAWER);
            call.resolve(new JSObject().put("success", true));
        } catch (IOException e) {
            call.reject("Open drawer failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", isConnected);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void printReceipt(PluginCall call) {
        try {
            writeBytes(ESC_INIT);
            
            String businessName = call.getString("businessName", "RESTAURANT");
            writeBytes(ESC_ALIGN_CENTER);
            writeBytes(ESC_FONT_LARGE);
            writeBytes(businessName.getBytes(StandardCharsets.UTF_8));
            writeBytes(ESC_LINE_FEED);
            writeBytes(ESC_FONT_NORMAL);
            writeBytes("--------------------------------".getBytes());
            writeBytes(ESC_LINE_FEED);
            
            String orderNumber = call.getString("orderNumber", "");
            writeBytes(ESC_ALIGN_LEFT);
            writeBytes(("Order #: " + orderNumber).getBytes());
            writeBytes(ESC_LINE_FEED);
            
            String date = call.getString("date", "");
            writeBytes(("Date: " + date).getBytes());
            writeBytes(ESC_LINE_FEED);
            writeBytes(ESC_LINE_FEED);
            
            writeBytes(ESC_BOLD_ON);
            writeBytes("ITEM          QTY   PRICE   TOTAL".getBytes());
            writeBytes(ESC_LINE_FEED);
            writeBytes(ESC_BOLD_OFF);
            writeBytes("--------------------------------".getBytes());
            writeBytes(ESC_LINE_FEED);
            
            double total = call.getDouble("total", 0.0);
            writeBytes(ESC_BOLD_ON);
            writeBytes(("TOTAL: ₹" + String.format("%.2f", total)).getBytes());
            writeBytes(ESC_LINE_FEED);
            writeBytes(ESC_BOLD_OFF);
            
            String footer = call.getString("footer", "Thank you!");
            writeBytes(ESC_ALIGN_CENTER);
            writeBytes(footer.getBytes());
            writeBytes(ESC_LINE_FEED);
            writeBytes(ESC_LINE_FEED);
            writeBytes(ESC_FULL_CUT);
            
            call.resolve(new JSObject().put("success", true));
        } catch (IOException e) {
            call.reject("Receipt print failed: " + e.getMessage());
        }
    }
}
