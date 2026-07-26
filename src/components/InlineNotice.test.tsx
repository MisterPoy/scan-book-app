import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InlineNotice from './InlineNotice';

describe('InlineNotice', () => {
  it('announces errors accessibly', () => {
    render(<InlineNotice message="Le titre est requis" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Le titre est requis');
  });

  it('renders nothing without a message', () => {
    const { container } = render(<InlineNotice message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
