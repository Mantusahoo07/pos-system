class PrinterService {
  constructor() {
    this.businessDetails = null;
    this.printInProgress = false;
  }

  async fetchBusinessDetails() {
    const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
    const token = localStorage.getItem('token');
    
    try {
      console.log('Fetching business details from:', `${API_URL}/business`);
      const response = await fetch(`${API_URL}/business`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (response.ok) {
        this.businessDetails = await response.json();
        console.log('Business details fetched:', this.businessDetails);
        localStorage.setItem('businessDetails', JSON.stringify(this.businessDetails));
        return this.businessDetails;
      } else {
        console.warn('Failed to fetch business details, using cached or default');
        const cached = localStorage.getItem('businessDetails');
        if (cached) {
          this.businessDetails = JSON.parse(cached);
          return this.businessDetails;
        }
        return this.getDefaultBusinessDetails();
      }
    } catch (error) {
      console.error('Error fetching business details:', error);
      const cached = localStorage.getItem('businessDetails');
      if (cached) {
        this.businessDetails = JSON.parse(cached);
        return this.businessDetails;
      }
      return this.getDefaultBusinessDetails();
    }
  }

  getDefaultBusinessDetails() {
    return {
      name: 'RESTAURANT NAME',
      address: '123 Main Street, City, State - 123456',
      phone: '+91 9876543210',
      email: 'info@restaurant.com',
      gst: '27ABCDE1234F1Z5',
      fssai: '12345678901234',
      upiId: 'paytm.s1yxcay@pty',
      currencySymbol: '₹',
      taxLabel: 'GST',
      footerMessage: 'Thank you! Visit Again!',
      printBusinessName: true,
      printAddress: true,
      printPhone: true,
      printEmail: true,
      printGst: true,
      printFssai: true,
      printHeaderDivider: true,
      printItems: true,
      printTaxBreakdown: true,
      printServiceCharge: true,
      printGatewayCharges: true,
      printFooter: true,
      printQrCode: true
    };
  }

  async printReceipt(order, paymentDetails) {
    try {
      const businessDetails = await this.fetchBusinessDetails();
      const billHTML = this.generateBillHTML(order, paymentDetails, businessDetails);
      
      const windowName = `print_window_${Date.now()}`;
      const printWindow = window.open('', windowName, 'width=650,height=800');
      
      if (!printWindow) {
        alert('Please allow popups for this site to print bills.');
        return false;
      }
      
      printWindow.document.write(billHTML);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  generateBillHTML(order, paymentDetails, businessDetails) {
    const date = new Date().toLocaleString();
    const totalAmount = order.total || 0;
    const gatewayCharges = paymentDetails.gatewayCharges || 0;
    const finalAmount = totalAmount + gatewayCharges;
    const isPaymentPending = paymentDetails.method === 'pending' || paymentDetails.status === 'pending';
    const isCreditSale = paymentDetails.method === 'credit';
    const currencySymbol = businessDetails.currencySymbol || '₹';
    
    const qrCodeUrl = isPaymentPending && businessDetails.printQrCode && businessDetails.upiId 
      ? `upi://pay?pa=${encodeURIComponent(businessDetails.upiId)}&pn=Restaurant&am=${finalAmount}&cu=INR&tn=Order%20${order.orderNumber}`
      : null;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isPaymentPending ? 'Bill' : 'Receipt'} #${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    @media print {
      @page {
        size: 100mm auto;
        margin: 0.5mm;
      }
      body {
        margin: 0;
        padding: 1mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: 'Courier New', 'Courier', monospace;
      width: 100mm;
      margin: 0 auto;
      padding: 1mm;
      background: white;
      font-size: 19px;
      line-height: 1.4;
      font-weight: bold;
      color: black;
    }
    .bill-container {
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid black;
    }
    .business-name {
      font-size: 27px;
      font-weight: 900;
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
    .business-info {
      font-size: 17px;
      margin: 3px 0;
      line-height: 1.3;
      font-weight: bold;
    }
    .divider {
      margin: 6px 0;
      border-top: 2px solid black;
    }
    .order-info {
      margin: 10px 0;
    }
    .order-info-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 18px;
      font-weight: bold;
    }
    .order-info-label {
      font-weight: 900;
    }
    table {
      width: 100%;
      margin: 10px 0;
      border-collapse: collapse;
    }
    th, td {
      padding: 3px 4px;
      text-align: left;
      font-size: 18px;
    }
    th {
      border-bottom: 2px solid black;
      font-weight: 900;
    }
    td {
      border-bottom: 1px solid #ccc;
    }
    .item-name {
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 18px;
      font-weight: bold;
    }
    .grand-total {
      font-size: 22px;
      font-weight: 900;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid black;
    }
    .payment-status {
      margin: 14px 0;
      padding: 10px;
      text-align: center;
      font-weight: 900;
      font-size: 20px;
      border-radius: 4px;
    }
    .status-pending {
      background: #fef3c7;
      color: black;
      border: 2px solid black;
    }
    .status-paid {
      background: #dcfce7;
      color: black;
      border: 2px solid black;
    }
    .status-credit {
      background: #fef3c7;
      color: #d97706;
      border: 2px solid #d97706;
    }
    .footer {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 2px solid black;
      text-align: center;
      font-size: 17px;
      font-weight: bold;
    }
    .qr-code {
      text-align: center;
      margin: 12px 0;
      padding: 10px;
      border: 2px solid black;
    }
    .qr-code img {
      width: 130px;
      height: auto;
    }
    .upi-id {
      font-size: 17px;
      word-break: break-all;
      margin-top: 6px;
      font-weight: bold;
    }
    .close-instruction {
      margin-top: 12px;
      font-size: 16px;
      color: #666;
      text-align: center;
    }
    .bold {
      font-weight: 900;
    }
    .qty-text {
      font-weight: 900;
      font-size: 19px;
    }
    .price-text {
      font-weight: bold;
    }
    .total-text {
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="bill-container">
    <!-- Header -->
    <div class="header">
      ${businessDetails.printBusinessName !== false ? `<div class="business-name">${businessDetails.name}</div>` : ''}
      ${businessDetails.printAddress !== false ? `<div class="business-info">${businessDetails.address}</div>` : ''}
      ${businessDetails.printPhone !== false ? `<div class="business-info">Tel: ${businessDetails.phone}</div>` : ''}
      ${businessDetails.printEmail !== false && businessDetails.email ? `<div class="business-info">Email: ${businessDetails.email}</div>` : ''}
      ${businessDetails.printGst !== false && businessDetails.gst ? `<div class="business-info">${businessDetails.taxLabel || 'GST'}: ${businessDetails.gst}</div>` : ''}
      ${businessDetails.printFssai !== false && businessDetails.fssai ? `<div class="business-info">FSSAI: ${businessDetails.fssai}</div>` : ''}
      ${businessDetails.printHeaderDivider !== false ? `<div class="divider"></div>` : ''}
      <div class="business-info">${date}</div>
    </div>
    
    <!-- Order Info -->
    <div class="order-info">
      <div class="order-info-row">
        <span class="order-info-label">Order #:</span>
        <span class="bold">${order.displayOrderNumber || order.orderNumber}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Customer:</span>
        <span>${order.customer?.name || 'Walk-In'}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Type:</span>
        <span>${order.orderType === 'dine-in' ? `Dine-In (T-${order.tableNumber})` : order.orderType.toUpperCase()}</span>
      </div>
      ${order.orderType === 'delivery' && order.deliveryPlatform ? `
      <div class="order-info-row">
        <span class="order-info-label">Platform:</span>
        <span>${order.deliveryPlatform.toUpperCase()}</span>
      </div>
      ` : ''}
    </div>
    
    ${businessDetails.printItems !== false ? `
    <div class="divider"></div>
    
    <!-- Items -->
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.filter(i => !i.isRemoved).map(item => `
          <tr>
            <td class="item-name bold">${item.name}</td>
            <td class="text-center qty-text">${item.quantity}</td>
            <td class="text-right price-text">${currencySymbol}${item.price}</td>
            <td class="text-right total-text">${currencySymbol}${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
          ${item.specialInstructions ? `
          <tr>
            <td colspan="4" style="padding-left: 6px; font-size: 16px; color: #333; font-weight: bold;">
              📝 ${item.specialInstructions}
            </td>
          </tr>
          ` : ''}
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <div class="divider"></div>
    
    <!-- Totals -->
    <div class="total-row">
      <span>Subtotal:</span>
      <span class="bold">${currencySymbol}${totalAmount.toFixed(2)}</span>
    </div>
    ${order.tax > 0 && businessDetails.printTaxBreakdown !== false ? `
    <div class="total-row">
      <span>${businessDetails.taxLabel || 'Tax'} (${order.taxRate || 10}%):</span>
      <span>${currencySymbol}${order.tax.toFixed(2)}</span>
    </div>
    ` : ''}
    ${order.serviceCharge > 0 && businessDetails.printServiceCharge !== false ? `
    <div class="total-row">
      <span>Service Charge (${order.serviceChargeRate || 0}%):</span>
      <span>${currencySymbol}${order.serviceCharge.toFixed(2)}</span>
    </div>
    ` : ''}
    ${gatewayCharges > 0 && businessDetails.printGatewayCharges !== false ? `
    <div class="total-row">
      <span>Gateway Charges (2%):</span>
      <span>${currencySymbol}${gatewayCharges.toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="grand-total">
      <span class="bold">TOTAL:</span>
      <span class="bold">${currencySymbol}${finalAmount.toFixed(2)}</span>
    </div>
    
    <!-- Payment Status -->
    <div class="payment-status ${isCreditSale ? 'status-credit' : (isPaymentPending ? 'status-pending' : 'status-paid')}">
      ${isCreditSale ? '→ CREDIT SALE - PENDING PAYMENT ←' : (isPaymentPending ? '→ TO BE PAID ←' : '✓ PAID ✓')}
      ${isCreditSale ? `
      <div style="font-size: 17px; margin-top: 8px; font-weight: bold;">
        Customer: ${paymentDetails.customerName || 'N/A'}
        ${paymentDetails.customerPhone ? `<br/>Phone: ${paymentDetails.customerPhone}` : ''}
        ${paymentDetails.dueDate ? `<br/>Due Date: ${new Date(paymentDetails.dueDate).toLocaleDateString()}` : ''}
        ${paymentDetails.notes ? `<br/>Notes: ${paymentDetails.notes}` : ''}
      </div>
      ` : (!isPaymentPending && paymentDetails.method !== 'pending' ? `
      <div style="font-size: 17px; margin-top: 6px; font-weight: bold;">
        ${paymentDetails.method.toUpperCase()}
        ${paymentDetails.transactionId ? `<br/>ID: ${paymentDetails.transactionId}` : ''}
        ${paymentDetails.change > 0 ? `<br/>Change: ${currencySymbol}${paymentDetails.change}` : ''}
      </div>
      ` : '')}
    </div>
    
    <!-- QR Code for pending bills -->
    ${isPaymentPending && qrCodeUrl && businessDetails.printQrCode ? `
    <div class="qr-code">
      <img src="https://quickchart.io/qr?text=${encodeURIComponent(qrCodeUrl)}&size=150&dark=000000" alt="QR Code" />
      <div class="upi-id">UPI: ${businessDetails.upiId}</div>
      <div class="upi-id">Amount: ${currencySymbol}${finalAmount.toFixed(2)}</div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    ${businessDetails.printFooter !== false ? `
    <div class="footer">
      <div>${businessDetails.footerMessage}</div>
      <div style="margin-top: 5px;">Thank you for your visit!</div>
    </div>
    ` : ''}
    
    <div class="close-instruction">
      Close this window when done
    </div>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;
  }

  async printKitchenOrder(order) {
    const businessDetails = await this.fetchBusinessDetails();
    const kitchenHTML = this.generateKitchenHTML(order, businessDetails);
    
    const printWindow = window.open('', '_blank', 'width=650,height=800');
    if (printWindow) {
      printWindow.document.write(kitchenHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
    return true;
  }

  generateKitchenHTML(order, businessDetails) {
    const date = new Date().toLocaleString();
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kitchen Order #${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    @media print {
      @page {
        size: 100mm auto;
        margin: 0.5mm;
      }
      body {
        margin: 0;
        padding: 1mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: 'Courier New', 'Courier', monospace;
      width: 100mm;
      margin: 0 auto;
      padding: 1mm;
      font-size: 20px;
      font-weight: bold;
      color: black;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid black;
      margin-bottom: 12px;
      padding-bottom: 10px;
    }
    .business-name {
      font-size: 25px;
      font-weight: 900;
    }
    table {
      width: 100%;
      margin: 12px 0;
      border-collapse: collapse;
    }
    th, td {
      padding: 3px 4px;
      text-align: left;
      font-size: 19px;
    }
    th {
      font-weight: 900;
      border-bottom: 2px solid black;
    }
    td {
      border-bottom: 1px solid #ccc;
    }
    .text-center {
      text-align: center;
      font-weight: 900;
    }
    .footer {
      margin-top: 14px;
      text-align: center;
      font-size: 18px;
      border-top: 2px solid black;
      padding-top: 10px;
      font-weight: bold;
    }
    .order-info {
      margin: 10px 0;
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      margin: 6px 0;
      font-weight: bold;
      font-size: 19px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="business-name">${businessDetails.name}</div>
    <div style="font-weight: 900; margin-top: 4px;">KITCHEN ORDER</div>
    <div style="font-size: 17px; margin-top: 4px;">${date}</div>
  </div>
  
  <div class="order-info">
    <div class="order-row">
      <span><strong>Order #:</strong> ${order.displayOrderNumber || order.orderNumber}</span>
    </div>
    <div class="order-row">
      <span><strong>Type:</strong> ${order.orderType?.toUpperCase() || 'DINE-IN'}</span>
      ${order.tableNumber ? `<span><strong>Table:</strong> ${order.tableNumber}</span>` : ''}
    </div>
  </div>
  
  <table>
    <thead>
      <tr><th>Item</th><th class="text-center">Qty</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${order.items.map(item => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td class="text-center"><strong>${item.quantity}</strong></td>
          <td>${item.specialInstructions || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    Please prepare this order
  </div>
  
  <script>
    window.print();
  </script>
</body>
</html>`;
  }
}

export default new PrinterService();