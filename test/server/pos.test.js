import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import POS from '../src/components/POS/POS';
import { SocketProvider } from '../src/contexts/SocketContext';

describe('POS Component', () => {
  const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  };

  it('should render menu items', () => {
    render(
      <SocketProvider>
        <POS />
      </SocketProvider>
    );

    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('should add item to cart', async () => {
    render(
      <SocketProvider>
        <POS />
      </SocketProvider>
    );

    const addButton = await screen.findByText('Add to Cart');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Current Order')).toBeInTheDocument();
    });
  });
});