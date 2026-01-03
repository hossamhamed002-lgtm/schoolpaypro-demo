import express from 'express';
import bodyParser from 'body-parser';
import adminRouter from './adminRoutes';
import { stripeWebhookHandler } from './stripeWebhook';

const app = express();
const port = process.env.PORT || 4101;

app.use('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(bodyParser.json());

app.use('/admin', adminRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`License server running on port ${port}`);
});
