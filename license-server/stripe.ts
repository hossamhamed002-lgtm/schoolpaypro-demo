// Stripe Checkout wiring (server-side / serverless)
// Install stripe in the backend environment before using this file.
import Stripe from 'stripe';
import { LICENSE_PLANS } from '../license/plans';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any });

const PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || ''
};

export const createCheckoutSession = async (planId: string, options?: { successUrl?: string; cancelUrl?: string }) => {
  const plan = LICENSE_PLANS.find((p) => p.id === planId);
  if (!plan) {
    throw new Error('INVALID_PLAN');
  }
  const priceId = PRICE_IDS[planId];
  if (!priceId) {
    throw new Error('MISSING_PRICE_ID');
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: options?.successUrl || `${process.env.BASE_URL || ''}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: options?.cancelUrl || `${process.env.BASE_URL || ''}/payment-cancelled`,
    currency: 'egp'
  });
  return session;
};
