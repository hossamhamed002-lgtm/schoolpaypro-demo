import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Send, Tag } from 'lucide-react';
import { useWhatsAppLogic, WhatsAppRecipient } from '../hooks/useWhatsAppLogic';
import { normalizeEgyPhone } from '../hooks/whatsappUtils';

const TAGS = [
  { label: '+ Student Name', token: '{StudentName}' },
  { label: '+ Father Name', token: '{FatherName}' },
  { label: '+ Balance', token: '{Balance}' },
  { label: '+ Grade', token: '{Grade}' }
];

const truncate = (value: string, length: number) =>
  value.length <= length ? value : value.slice(0, length - 3) + '...';

const buildRecipientMessage = (template: string, recipient: WhatsAppRecipient): string => {
  return template
    .replace(/{StudentName}/g, recipient.studentName || '')
    .replace(/{FatherName}/g, recipient.fatherName || '')
    .replace(/{Balance}/g, recipient.currentBalance.toFixed(2))
    .replace(/{Grade}/g, recipient.grade || '');
};

const WhatsAppSender: React.FC = () => {
  const { recipients, validCount, invalidCount, recap } = useWhatsAppLogic();
  const [messageTemplate, setMessageTemplate] = useState(
    'Dear parent of {StudentName}, please pay {Balance} to keep the {Grade} spot secure.'
  );
  const [stageFilter, setStageFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [mobileOverrides, setMobileOverrides] = useState<Record<string, string>>({});

  const stageOptions = useMemo(
    () => Array.from(new Set(recipients.map((recipient) => recipient.stage))).filter(Boolean),
    [recipients]
  );
  const gradeOptions = useMemo(
    () => Array.from(new Set(recipients.map((recipient) => recipient.grade))).filter(Boolean),
    [recipients]
  );
  const classOptions = useMemo(
    () => Array.from(new Set(recipients.map((recipient) => recipient.class))).filter(Boolean),
    [recipients]
  );

  const filteredRecipients = useMemo(() => {
    return recipients.filter((recipient) => {
      if (stageFilter && recipient.stage !== stageFilter) return false;
      if (gradeFilter && recipient.grade !== gradeFilter) return false;
      if (classFilter && recipient.class !== classFilter) return false;
      return true;
    });
  }, [recipients, stageFilter, gradeFilter, classFilter]);

  const handleTag = (token: string) => {
    setMessageTemplate((prev) => `${prev}${prev.endsWith(' ') ? '' : ' '}${token} `);
  };

  const handleMobileChange = (studentId: string, value: string) => {
    setMobileOverrides((prev) => ({
      ...prev,
      [studentId]: value
    }));
  };

  const getEffectiveMobile = (recipient: WhatsAppRecipient) =>
    mobileOverrides[recipient.studentId] ?? recipient.rawMobile;

  const getIsMobileValid = (recipient: WhatsAppRecipient) => {
    const normalized = normalizeEgyPhone(getEffectiveMobile(recipient));
    return {
      normalized,
      isValid: normalized !== null
    };
  };

  const sendToSingleRecipient = (recipient: WhatsAppRecipient) => {
    const { normalized } = getIsMobileValid(recipient);
    if (!normalized) return;
    const message = buildRecipientMessage(messageTemplate, recipient);
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 text-start">
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Compose Message</p>
            <h2 className="text-2xl font-black text-slate-900">WhatsApp Template</h2>
          </div>
          <div className="text-xs text-slate-500">
            Valid targets: {validCount} / {recap.total}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag.token}
              type="button"
              onClick={() => handleTag(tag.token)}
              className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition"
            >
              <Tag size={14} />
              {tag.label}
            </button>
          ))}
        </div>
        <textarea
          value={messageTemplate}
          onChange={(event) => setMessageTemplate(event.target.value)}
          rows={5}
          placeholder="Dear parent of {StudentName}, please pay {Balance}..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:bg-white focus:outline-none"
        />
        <p className="text-[11px] text-slate-500">Use the tags above to personalize messages automatically.</p>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Target Audience</p>
            <h3 className="font-black text-slate-900 text-xl">Recipients</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">All Stages</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">All Grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">All Classes</option>
              {classOptions.map((klass) => (
                <option key={klass} value={klass}>
                  {klass}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right border-collapse">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="py-3 px-3 text-start">Student</th>
                <th className="py-3 px-3">Guardian</th>
                <th className="py-3 px-3">Mobile</th>
                <th className="py-3 px-3">Balance</th>
                <th className="py-3 px-3">Message Preview</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {filteredRecipients.map((recipient) => {
                const message = buildRecipientMessage(messageTemplate, recipient);
                const { normalized, isValid } = getIsMobileValid(recipient);
                const effectiveMobile = getEffectiveMobile(recipient);
                return (
                  <tr
                    key={recipient.studentId}
                    className="hover:bg-slate-50 transition-colors border-b last:border-b-0"
                  >
                    <td className="px-3 py-3 text-start">
                      <div className="font-semibold text-slate-900">{recipient.studentName}</div>
                      <p className="text-[13px] text-slate-500">{recipient.grade}</p>
                    </td>
                    <td className="px-3 py-3">{recipient.fatherName}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={effectiveMobile}
                          onChange={(event) => handleMobileChange(recipient.studentId, event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:bg-white focus:outline-none"
                        />
                        {isValid ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={18} className="text-rose-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`font-black ${
                          recipient.currentBalance > 0 ? 'text-rose-500' : 'text-emerald-600'
                        }`}
                      >
                        ${recipient.currentBalance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] text-slate-500">{truncate(message, 64)}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        disabled={!isValid}
                        onClick={() => sendToSingleRecipient(recipient)}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                          isValid
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Send size={16} />
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSender;
