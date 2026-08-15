// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalizedSection from './PersonalizedSection';

vi.mock('../ProductCarousel', () => ({
  default: ({ title, subtitle, products }) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div>{products.map((product) => <span key={product.id}>{product.name}</span>)}</div>
    </section>
  ),
}));

const products = [
  { id: 3, name: 'Third' },
  { id: 1, name: 'First' },
  { id: 2, name: 'Second' },
];

describe('PersonalizedSection', () => {
  it('shows a responsive loading state', () => {
    render(<PersonalizedSection isLoading />);
    expect(screen.getByLabelText('Personalized recommendations loading')).toBeTruthy();
    expect(screen.getAllByRole('generic').length).toBeGreaterThan(0);
  });

  it('renders recommendations in the API-provided order', () => {
    render(<PersonalizedSection products={products} />);
    expect(screen.getByText('Third')).toBeTruthy();
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'پیشنهادهایی برای شما' })).toBeTruthy();
  });

  it('uses the safe fallback subtitle when personalization has no usable result', () => {
    render(<PersonalizedSection products={[products[0]]} isFallback />);
    expect(screen.getByText('انتخابی از محصولات محبوب فروشگاه')).toBeTruthy();
  });

  it('does not leave an empty section behind', () => {
    const { container } = render(<PersonalizedSection products={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
