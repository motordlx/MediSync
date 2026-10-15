import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, EscalationStageBadge } from '../components/common/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders Taken badge with accessible text and check icon', () => {
    render(<StatusBadge status="TAKEN" />);
    expect(screen.getByText('Taken')).toBeInTheDocument();
  });

  it('renders Due Now badge with pulsing style', () => {
    render(<StatusBadge status="DUE" />);
    expect(screen.getByText('Due Now')).toBeInTheDocument();
  });

  it('renders Unconfirmed badge', () => {
    render(<StatusBadge status="UNCONFIRMED" />);
    expect(screen.getByText('Unconfirmed')).toBeInTheDocument();
  });

  it('renders EscalationStageBadge for stage 3 caregiver notification', () => {
    render(<EscalationStageBadge stage={3} />);
    expect(screen.getByText('Stage 3: Care Circle Alerted')).toBeInTheDocument();
  });
});
