from django.urls import path

from .views import (
    create_referral_view, loyalty_summary_view, referral_open_view,
    redemption_rewards_view, redeem_reward_view, redemption_history_view,
    transaction_history_view, referral_summary_view,
)


urlpatterns = [
    path('summary/', loyalty_summary_view, name='loyalty-summary'),
    path('rewards/', redemption_rewards_view, name='loyalty-rewards'),
    path('rewards/redeem/', redeem_reward_view, name='loyalty-reward-redeem'),
    path('redemptions/', redemption_history_view, name='loyalty-redemption-history'),
    path('transactions/', transaction_history_view, name='loyalty-transaction-history'),
    path('referrals/summary/', referral_summary_view, name='loyalty-referral-summary'),
    path('referrals/', create_referral_view, name='loyalty-referral-create'),
    path('referrals/<str:token>/open/', referral_open_view, name='loyalty-referral-open'),
]
