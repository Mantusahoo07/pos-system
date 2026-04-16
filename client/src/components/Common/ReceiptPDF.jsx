import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';

// Register fonts
Font.register({
  family: 'Courier',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/courierprime/v12/u-450q2lgwslOqpF_6gQ8kELaw9pWt_-.ttf' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  container: {
    flex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#000',
  },
  businessName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessInfo: {
    fontSize: 8,
    marginBottom: 2,
    color: '#666',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#000',
    marginVertical: 8,
  },
  orderInfo: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  table: {
    width: '100%',
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#ccc',
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#000',
    paddingVertical: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  colItem: {
    width: '45%',
    paddingRight: 4,
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '20%',
    textAlign: 'right',
    paddingRight: 4,
  },
  colTotal: {
    width: '20%',
    textAlign: 'right',
  },
  totals: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderTopColor: '#000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderTopColor: '#000',
    fontWeight: 'bold',
  },
  paymentStatus: {
    marginTop: 15,
    padding: 8,
    textAlign: 'center',
    borderRadius: 4,
  },
  paid: {
    backgroundColor: '#f0fdf4',
  },
  pending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paidText: {
    color: '#10b981',
  },
  pendingText: {
    color: '#d97706',
  },
  footer: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderTopColor: '#000',
  },
  qrContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 100,
    height: 100,
    marginBottom: 5,
  },
  upiId: {
    fontSize: 7,
    marginTop: 5,
    color: '#666',
  },
});

// Create a component that waits for QR code to be ready
const QRCodeImage = ({ upiId, amount, orderNumber, businessName, onReady }) => {
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    const generateQR = async () => {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName || 'Restaurant')}&am=${amount}&cu=INR&tn=Order%20${orderNumber}`;
      try {
        const dataUrl = await QRCode.toDataURL(upiUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrDataUrl(dataUrl);
        if (onReady) onReady();
      } catch (error) {
        console.error('Error generating QR code:', error);
        if (onReady) onReady();
      }
    };
    
    generateQR();
  }, [upiId, amount, orderNumber, businessName, onReady]);

  if (!qrDataUrl) {
    return null;
  }

  return <Image src={qrDataUrl} style={styles.qrImage} />;
};

const ReceiptPDF = ({ receiptData }) => {
  const { order, payment, business } = receiptData;
  const businessDetails = business;
  const currencySymbol = businessDetails.currencySymbol || '₹';
  const isPaid = payment?.status === 'completed' || payment?.method !== 'pending';
  const [qrReady, setQrReady] = useState(false);

  const formatCurrency = (amount) => `${currencySymbol}${amount?.toFixed(2) || '0.00'}`;
  const formatDate = (date) => new Date(date).toLocaleString();

  const handleQrReady = () => {
    setQrReady(true);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {businessDetails.printBusinessName !== false && (
              <Text style={styles.businessName}>{businessDetails.name}</Text>
            )}
            {businessDetails.printAddress !== false && businessDetails.address && (
              <Text style={styles.businessInfo}>{businessDetails.address}</Text>
            )}
            {businessDetails.printPhone !== false && businessDetails.phone && (
              <Text style={styles.businessInfo}>Tel: {businessDetails.phone}</Text>
            )}
            {businessDetails.printGst !== false && businessDetails.gst && (
              <Text style={styles.businessInfo}>{businessDetails.taxLabel || 'GST'}: {businessDetails.gst}</Text>
            )}
            <View style={styles.divider} />
            <Text style={styles.businessInfo}>{formatDate(order.createdAt)}</Text>
          </View>

          {/* Order Info */}
          <View style={styles.orderInfo}>
            <Text>Order #: {order.displayOrderNumber || order.orderNumber}</Text>
            <Text>Customer: {order.customerName}</Text>
            <Text>Type: {order.orderType === 'dine-in' ? `Dine-In (T-${order.tableNumber})` : order.orderType.toUpperCase()}</Text>
          </View>

          <View style={styles.divider} />

          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>Item</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colPrice}>Price</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colItem}>{item.name}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatCurrency(item.price)}</Text>
                <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(order.subtotal)}</Text>
            </View>
            {order.tax > 0 && (
              <View style={styles.totalRow}>
                <Text>{businessDetails.taxLabel || 'Tax'} ({order.taxRate || 10}%):</Text>
                <Text>{formatCurrency(order.tax)}</Text>
              </View>
            )}
            {order.serviceCharge > 0 && (
              <View style={styles.totalRow}>
                <Text>Service Charge ({order.serviceChargeRate || 0}%):</Text>
                <Text>{formatCurrency(order.serviceCharge)}</Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text><Text style={{ fontWeight: 'bold' }}>TOTAL:</Text></Text>
              <Text style={{ fontWeight: 'bold' }}>{formatCurrency(order.total)}</Text>
            </View>
          </View>

          {/* Payment Status */}
          <View style={[styles.paymentStatus, isPaid ? styles.paid : styles.pending]}>
            {isPaid ? (
              <>
                <Text style={[styles.statusText, styles.paidText]}>✓ PAID ✓</Text>
                <Text style={{ fontSize: 8, marginTop: 4 }}>
                  Paid via: {payment.method?.toUpperCase() || 'CASH'}
                  {payment.transactionId && `\nID: ${payment.transactionId}`}
                  {payment.change > 0 && `\nChange: ${formatCurrency(payment.change)}`}
                  {payment.paidAt && `\nTime: ${new Date(payment.paidAt).toLocaleString()}`}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.statusText, styles.pendingText]}>→ TO BE PAID ←</Text>
                <Text style={{ fontSize: 9, marginTop: 4 }}>Amount Due: {formatCurrency(order.total)}</Text>
                {businessDetails.upiId && (
                  <View style={styles.qrContainer}>
                    <QRCodeImage 
                      upiId={businessDetails.upiId}
                      amount={order.total}
                      orderNumber={order.orderNumber || order.displayOrderNumber}
                      businessName={businessDetails.name}
                      onReady={handleQrReady}
                    />
                    <Text style={styles.upiId}>UPI: {businessDetails.upiId}</Text>
                    <Text style={styles.upiId}>Scan to Pay</Text>
                  </View>
                )}
                {businessDetails.upiId && !qrReady && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.upiId}>Generating QR code...</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>{businessDetails.footerMessage || 'Thank you! Visit Again!'}</Text>
            <Text style={{ fontSize: 7, marginTop: 4 }}>Thank you for your visit!</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;