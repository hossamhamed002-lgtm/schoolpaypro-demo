import React, { useMemo, useState } from 'react';
import { isDemoMode } from '../guards/appMode';

type LicenseRow = {
  licenseId: string;
  schoolName: string;
  schoolUid: string;
  planId: string;
  status: string;
  expiresAt: number;
};

const sampleLicenses: LicenseRow[] = [
  { licenseId: 'LIC-DEMO-1', schoolName: 'Demo School', schoolUid: 'DEMO-UID', planId: 'pro', status: 'active', expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 },
  { licenseId: 'LIC-DEMO-2', schoolName: 'Sample School', schoolUid: 'SCH-001', planId: 'basic', status: 'expired', expiresAt: Date.now() - 2 * 24 * 60 * 60 * 1000 }
];

const AdminLicensesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sampleLicenses;
    return sampleLicenses.filter(
      (l) =>
        l.licenseId.toLowerCase().includes(q) ||
        l.schoolName.toLowerCase().includes(q) ||
        l.schoolUid.toLowerCase().includes(q)
    );
  }, [query]);

  const handleDownload = (license: LicenseRow) => {
    const blob = new Blob([JSON.stringify(license, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${license.licenseId}.json`;
    link.click();
  };

  const handleAction = (label: string) => {
    alert(label);
  };

  if (isDemoMode()) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-black text-slate-800">Admin Licenses</h2>
        <p className="text-sm text-slate-600 mt-2">هذه الصفحة غير متاحة في النسخة التجريبية.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-black text-slate-800 mb-4">Admin Licenses</h2>
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم المدرسة أو UID"
          className="border border-slate-200 rounded-lg px-3 py-2 w-full max-w-md"
        />
      </div>
      <div className="overflow-auto border border-slate-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 font-black">
            <tr>
              <th className="px-3 py-2 text-start">License</th>
              <th className="px-3 py-2 text-start">School</th>
              <th className="px-3 py-2 text-start">UID</th>
              <th className="px-3 py-2 text-start">Plan</th>
              <th className="px-3 py-2 text-start">Status</th>
              <th className="px-3 py-2 text-start">Expires</th>
              <th className="px-3 py-2 text-start">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lic) => (
              <tr key={lic.licenseId} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{lic.licenseId}</td>
                <td className="px-3 py-2">{lic.schoolName}</td>
                <td className="px-3 py-2 font-mono text-xs">{lic.schoolUid}</td>
                <td className="px-3 py-2">{lic.planId}</td>
                <td className="px-3 py-2">{lic.status}</td>
                <td className="px-3 py-2">{new Date(lic.expiresAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold" onClick={() => handleAction('Renew (stub)')}>
                    Renew
                  </button>
                  <button className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-xs font-bold" onClick={() => handleAction('Revoke (stub)')}>
                    Revoke
                  </button>
                  <button className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold" onClick={() => handleDownload(lic)}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLicensesPage;
