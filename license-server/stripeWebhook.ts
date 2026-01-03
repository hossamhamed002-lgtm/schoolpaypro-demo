import { Request, Response } from 'express';
import Stripe from 'stripe';
import { generateLicense } from './licenseGenerator';
import { extendLicense, upsertLicense } from './licenseStore';
import { LICENSE_PLANS } from '../license/plans';
import { renewLicense } from './licenseRenewal';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any });

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const planId = (session.metadata?.planId as string) || '';
      const schoolName = session.metadata?.schoolName || '';
      const schoolUid = session.metadata?.schoolUid || '';
      const hwid = session.metadata?.hwid || '';
      const plan = LICENSE_PLANS.find((p) => p.id === planId);
      if (!plan) break;

      const license = generateLicense({
        planId,
        schoolName,
        schoolUid,
        hwid
      });
      upsertLicense({
        licenseId: license.licenseId,
        schoolName,
        schoolUid,
        planId,
        hwid,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        status: 'active',
        renewals: [],
        payload: license
      });
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const licenseId = invoice.metadata?.licenseId;
      const durationMs = Number(invoice.metadata?.durationMs || 0);
      if (licenseId && durationMs > 0) {
        renewLicense(licenseId, durationMs, invoice.id);
      }
      break;
    }
    case 'invoice.payment_failed': {
      // Optional: flag license for follow-up
      break;
    }
    default:
      // ignore other events
      break;
  }

  res.json({ received: true });
};
