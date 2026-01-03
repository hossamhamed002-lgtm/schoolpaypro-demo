import { Router } from 'express';
import { requireAdminAuth } from './adminAuth';
import { extendLicense, getLicense, listLicenses, revokeLicense } from './licenseStore';

const adminRouter = Router();

adminRouter.use(requireAdminAuth);

adminRouter.get('/licenses', (_req, res) => {
  res.json(listLicenses());
});

adminRouter.get('/licenses/:id', (req, res) => {
  const lic = getLicense(req.params.id);
  if (!lic) return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
  res.json(lic);
});

adminRouter.post('/licenses/:id/revoke', (req, res) => {
  const lic = revokeLicense(req.params.id);
  if (!lic) return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
  res.json(lic);
});

adminRouter.post('/licenses/:id/extend', (req, res) => {
  const { additionalMs } = req.body || {};
  if (!Number.isFinite(additionalMs)) return res.status(400).json({ error: 'INVALID_DURATION' });
  const lic = extendLicense(req.params.id, Number(additionalMs));
  if (!lic) return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
  res.json(lic);
});

export default adminRouter;
