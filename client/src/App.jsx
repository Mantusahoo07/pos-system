import React, { useEffect } from 'react';
import { SocketProvider } from './contexts/SocketContext';
import { OrderProvider } from './contexts/OrderContext';
import { InventoryProvider } from './contexts/InventoryContext';
import POS from './components/POS/POS';
import KitchenDisplay from './components/Kitchen/KitchenDisplay';
import './index.css';

function App() {
  const [view, setView] = React.useState('pos');

  return (
    <SocketProvider>
      <OrderProvider>
        <InventoryProvider>
          <div className="app">
            <div className="view-switcher">
              <button onClick={() => setView('pos')} className={view === 'pos' ? 'active' : ''}>
                POS Terminal
              </button>
              <button onClick={() => setView('kitchen')} className={view === 'kitchen' ? 'active' : ''}>
                Kitchen Display
              </button>
            </div>
            {view === 'pos' ? <POS /> : <KitchenDisplay />}
          </div>
        </InventoryProvider>
      </OrderProvider>
    </SocketProvider>
  );
}

export default App;