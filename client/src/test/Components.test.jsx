import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Activity } from 'lucide-react';

describe('Common UI Components', () => {
  describe('EmptyState Component', () => {
    it('renders title, description, and action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          icon={Activity}
          title="No Medications Found"
          description="You currently have no scheduled medications."
          actionText="Add Medication"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No Medications Found')).toBeInTheDocument();
      expect(screen.getByText('You currently have no scheduled medications.')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /Add Medication/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders without action button if not provided', () => {
      render(
        <EmptyState
          title="No History"
          description="No past records logged yet."
        />
      );

      expect(screen.getByText('No History')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('ConfirmDialog Component', () => {
    it('renders dialog with title, message, and trigger buttons', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Schedule?"
          message="This action cannot be undone."
          confirmText="Yes, Delete"
          cancelText="Cancel"
          isDanger={true}
        />
      );

      expect(screen.getByText('Delete Schedule?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /Yes, Delete/i });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render content when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Hidden Modal"
          message="Should not be visible"
        />
      );

      expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
    });
  });
});
