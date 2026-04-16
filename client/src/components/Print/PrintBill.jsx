import React from 'react';

const PrintBill = React.forwardRef(({ order, paymentDetails, businessDetails }, ref) => {
  const date = new Date().toLocaleString();
  const totalAmount = order.total || 0;
  const gatewayCharges = paymentDetails.gatewayCharges || 0;
  const finalAmount = totalAmount + gatewayCharges;
  const isPaymentPending = paymentDetails.method === 'pending' || paymentDetails.status === 'pending';
  const currencySymbol = businessDetails.currencySymbol || '₹';
  const is58mm = localStorage.getItem('printerConfig') ? JSON.parse(localStorage.getItem('printerConfig')).paperSize === '58mm' : true;

  const upiUrl = isPaymentPending && businessDetails.upiId 
    ? `upi://pay?pa=${encodeURIComponent(businessDetails.upiId)}&pn=Restaurant&am=${finalAmount}&cu=INR&tn=Order%20${order.orderNumber}`
    : null;

  return (
    <div ref={ref} style={{
      fontFamily: "'Courier New', monospace",
      fontSize: is58mm ? '10px' : '12px',
      width: is58mm ? '58mm' : '80mm',
      margin: '0 auto',
      padding: is58mm ? '2mm' : '3mm',
      lineHeight: '1.3'
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* Header */}
        {businessDetails.printBusinessName !== false && <h1 style={{ fontSize: is58mm ? '14px' : '16px', margin: '0 0 5px 0' }}>{businessDetails.name}</h1>}
        {businessDetails.printAddress !== false && <p style={{ margin: '2px 0', fontSize: is58mm ? '8px' : '9px' }}>{businessDetails.address}</p>}
        {businessDetails.printPhone !== false && <p style={{ margin: '2px 0', fontSize: is58mm ? '8px' : '9px' }}>Tel: {businessDetails.phone}</p>}
        {businessDetails.printGst !== false && businessDetails.gst && <p style={{ margin: '2px 0', fontSize: is58mm ? '8px' : '9px' }}>{businessDetails.taxLabel || 'GST'}: {businessDetails.gst}</p>}
        <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
        <p style={{ margin: '3px 0' }}>{date}</p>
        
        {/* Order Info */}
        <p><strong>Order #: {order.orderNumber}</strong></p>
        <p>Customer: {order.customer?.name || 'Walk-In'}</p>
        <p>{order.orderType === 'dine-in' ? `Table: ${order.tableNumber}` : order.orderType.toUpperCase()}</p>
        {order.orderType === 'delivery' && order.deliveryPlatform && <p>Platform: {order.deliveryPlatform.toUpperCase()}</p>}
        
        <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
        
        {/* Items */}
        <table style={{ width: '100%', margin: '5px 0' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>Item</th>
              <th style={{ textAlign: 'center', padding: '3px 0' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '3px 0' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '3px 0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td style={{ textAlign: 'left', padding: '3px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '3px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>{currencySymbol}{item.price}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>{currencySymbol}{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
                {item.specialInstructions && (
                  <tr>
                    <td colSpan="4" style={{ paddingLeft: '5px', fontSize: is58mm ? '7px' : '8px', color: '#666' }}>
                      📝 {item.specialInstructions}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
        
        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
          <span>Subtotal:</span>
          <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
        </div>
        {order.tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
            <span>{businessDetails.taxLabel || 'Tax'} ({order.taxRate || 10}%):</span>
            <span>{currencySymbol}{order.tax.toFixed(2)}</span>
          </div>
        )}
        {order.serviceCharge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
            <span>Service Charge ({order.serviceChargeRate || 0}%):</span>
            <span>{currencySymbol}{order.serviceCharge.toFixed(2)}</span>
          </div>
        )}
        {gatewayCharges > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
            <span>Gateway Charges (2%):</span>
            <span>{currencySymbol}{gatewayCharges.toFixed(2)}</span>
          </div>
        )}
        <div style={{ borderTop: '1px dashed #000', margin: '5px 0', paddingTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: is58mm ? '12px' : '14px' }}>
            <span>TOTAL:</span>
            <span>{currencySymbol}{finalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Payment Status */}
        {isPaymentPending ? (
          <div style={{ margin: '10px 0', padding: '5px', background: '#fef3c7', color: '#d97706', fontWeight: 'bold', textAlign: 'center' }}>
            → TO BE PAID ←
          </div>
        ) : (
          <div style={{ margin: '10px 0', padding: '5px', background: '#dcfce7', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>
            ✓ PAID ✓
          </div>
        )}
        
        {/* QR Code for pending bills */}
        {isPaymentPending && upiUrl && (
          <div style={{ textAlign: 'center', margin: '10px 0', padding: '10px', border: '1px dashed #000' }}>
            <img 
              src={`https://quickchart.io/qr?text=${encodeURIComponent(upiUrl)}&size=${is58mm ? 100 : 120}`} 
              alt="QR Code"
              style={{ width: is58mm ? '80px' : '100px', height: 'auto' }}
            />
            <div style={{ fontSize: is58mm ? '7px' : '8px', wordBreak: 'break-all', marginTop: '5px' }}>
              UPI: {businessDetails.upiId}
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0 5px 0', paddingTop: '5px' }}>
          {!isPaymentPending && paymentDetails.method !== 'pending' && (
            <>
              <p>Paid: {paymentDetails.method.toUpperCase()}</p>
              {paymentDetails.transactionId && <p>ID: {paymentDetails.transactionId}</p>}
              <p>Time: {paymentDetails.paidAt ? new Date(paymentDetails.paidAt).toLocaleString() : date}</p>
            </>
          )}
          <p>{businessDetails.footerMessage || 'Thank you! Visit Again!'}</p>
        </div>
      </div>
    </div>
  );
});

PrintBill.displayName = 'PrintBill';

export default PrintBill;