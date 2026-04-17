// Add this to handle back button
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function ReceiptViewer() {
  const navigate = useNavigate();
  
  // Handle Android back button
  useEffect(() => {
    const handleBackButton = () => {
      navigate('/');
      return true;
    };
    
    if (window.Capacitor) {
      document.addEventListener('backbutton', handleBackButton);
      return () => document.removeEventListener('backbutton', handleBackButton);
    }
  }, [navigate]);
  
  // Fix print modal - auto close after print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => {
      console.log('Print completed');
      // Auto close after print
      setTimeout(() => {
        navigate('/');
      }, 1000);
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
      alert('Print failed. Please try again.');
    }
  });
  
  // Add close button to print modal
  // ... rest of your component
}
