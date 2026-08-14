// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import CustomerClubSection from './CustomerClubSection';
import { loyaltyAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  loyaltyAPI: {
    getSummary: vi.fn(),
    getRewards: vi.fn(),
    redeemReward: vi.fn(),
    getTransactions: vi.fn(),
    getReferralSummary: vi.fn(),
  },
}));

const summary = { data: { available_points: 120, total_earned: 300, total_redeemed: 180 } };
const reward = { id: 7, name: '10% off', reward_type: 'discount', discount_type: 'percentage', discount_value: 10, points_required: 100, ends_at: null };

const loadSuccess = (history = []) => {
  loyaltyAPI.getSummary.mockResolvedValue(summary);
  loyaltyAPI.getRewards.mockResolvedValue({ data: { rewards: [reward], history } });
  loyaltyAPI.getTransactions.mockResolvedValue({ data: { results: [], next: null } });
  loyaltyAPI.getReferralSummary.mockResolvedValue({ data: { total_activity: 0, successful_referrals: 0, referred_users: 0, referral_rewards_earned: 0, status_counts: {} } });
};

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
  loyaltyAPI.getTransactions.mockResolvedValue({ data: { results: [], next: null } });
  loyaltyAPI.getReferralSummary.mockResolvedValue({ data: { total_activity: 0, successful_referrals: 0, referred_users: 0, referral_rewards_earned: 0, status_counts: {} } });
});

afterEach(() => cleanup());

describe('CustomerClubSection', () => {
  it('renders summary, rewards, and redemption history', async () => {
    loadSuccess([{ id: 1, rule_name: 'Old reward', points_cost: 50, status: 'consumed', redeemed_at: '2026-01-01T10:00:00Z' }]);
    render(<CustomerClubSection />);
    expect(await screen.findByText('امتیاز قابل استفاده')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('10% تخفیف')).toBeTruthy();
    expect(screen.getByText('Old reward')).toBeTruthy();
  });

  it('shows insufficient points and prevents redemption', async () => {
    loyaltyAPI.getSummary.mockResolvedValue({ data: { available_points: 20, total_earned: 20, total_redeemed: 0 } });
    loyaltyAPI.getRewards.mockResolvedValue({ data: { rewards: [reward], history: [] } });
    render(<CustomerClubSection />);
    expect(await screen.findByText('امتیاز کافی نیست')).toBeTruthy();
    expect(loyaltyAPI.redeemReward).toHaveBeenCalledTimes(0);
  });

  it('redeems once, shows the code, and refreshes the data', async () => {
    loadSuccess();
    loyaltyAPI.redeemReward.mockResolvedValue({ data: { redemption_code: 'CLUB-CODE-123' } });
    render(<CustomerClubSection />);
    const button = await screen.findByRole('button', { name: 'دریافت پاداش' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(loyaltyAPI.redeemReward.mock.calls.length).toBe(1));
    expect(await screen.findByText('CLUB-CODE-123')).toBeTruthy();
    expect(loyaltyAPI.getSummary).toHaveBeenCalledTimes(2);
    expect(loyaltyAPI.getRewards).toHaveBeenCalledTimes(2);
  });

  it('shows failed redemption feedback', async () => {
    loadSuccess();
    loyaltyAPI.redeemReward.mockRejectedValue({ response: { data: { detail: 'Not enough points.' } } });
    render(<CustomerClubSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'دریافت پاداش' }));
    expect(await screen.findByText('Not enough points.')).toBeTruthy();
  });
});
