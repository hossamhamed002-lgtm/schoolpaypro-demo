import React, { useMemo, useState } from 'react';
import { ClipboardList, ArrowRight, Printer, ArrowLeft } from 'lucide-react';
import PrintModal, { ModalPrintSettings } from './PrintModal';

type ReportCard = {
  Report_ID: string;
  Title_Ar: string;
  Title_En: string;
};

type SignatureStep = {
  Step_ID: string;
  Display_Title_Ar: string;
  Display_Title_En: string;
  Alignment: 'left' | 'center' | 'right';
  Is_Stamp_Required?: boolean;
};

type ReportConfig = {
  Category_ID: string;
  Available_Reports: ReportCard[];
  Signature_Chain: SignatureStep[];
};

const CLASS_LIST_REPORT_ID = 'STU-CLASS-LISTS';
const ENROLL_CERT_REPORT_ID = 'STU-ENROLL-CERT';
const TRANSFER_REQUEST_REPORT_ID = 'STU-TRANSFER-REQUEST';
const PARENTS_LIST_REPORT_ID = 'STU-PARENTS-LIST';
const normalizeName = (name: string) => {
  let n = name || '';
  n = n.replace(/[آأإٱ]/g, 'ا');
  n = n.replace(/ى/g, 'ي');
  n = n.replace(/ة/g, 'ه');
  n = n.replace(/ئ/g, 'ي');
  n = n.replace(/ؤ/g, 'و');
  n = n.replace(/ـ/g, '');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
};
const PAPER_SIZES: Record<string, Record<'Portrait' | 'Landscape', { w: number; h: number }>> = {
  A4: { Portrait: { w: 210, h: 297 }, Landscape: { w: 297, h: 210 } },
  A3: { Portrait: { w: 297, h: 420 }, Landscape: { w: 420, h: 297 } },
  Letter: { Portrait: { w: 216, h: 279 }, Landscape: { w: 279, h: 216 } }
};

type PrintSettings = ModalPrintSettings;

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'Portrait',
  margins: { top: 12, right: 12, bottom: 12, left: 12 },
  scale: 0.9,
  repeatHeader: true,
  fontFamily: 'Cairo',
  fontSize: 12,
  columnsMode: 'all',
  selectedColumns: []
};

const SignatureReportLayout: React.FC<{
  reportTitle: string;
  activeSchool: any;
  reportConfig: ReportConfig;
  lang: string;
  children: React.ReactNode;
  printOverrides?: {
    paperSize?: string;
    orientation?: 'Portrait' | 'Landscape';
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    scale?: number;
    fontFamily?: string;
    fontSize?: number;
  };
}> = ({ reportTitle, activeSchool, reportConfig, lang, children, printOverrides }) => {
  const isRtl = lang === 'ar';
  const schoolName =
    activeSchool?.Name ||
    activeSchool?.School_Name ||
    activeSchool?.name ||
    'مدرسة غير محددة';

  return (
    <div
      className={`bg-white p-10 min-h-[70vh] text-slate-900 rounded-[2.5rem] border border-slate-100 shadow-sm ${
        isRtl ? 'text-right' : 'text-left'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        fontFamily: printOverrides?.fontFamily || undefined,
        fontSize: printOverrides?.fontSize ? `${printOverrides.fontSize}px` : undefined
      }}
    >
      <div className="flex items-start justify-between border-b-2 border-slate-200 pb-6 mb-8">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-black">
            {activeSchool?.Directorate || 'مديرية التعليم'}
          </p>
          <p className="text-sm font-black">
            {activeSchool?.Administration || 'إدارة تعليمية'}
          </p>
          <p className="text-sm font-black">{schoolName}</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="px-8 py-3 border-2 border-slate-900 rounded-xl bg-slate-50">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {reportTitle}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
            {lang === 'ar' ? 'تاريخ الطباعة' : 'Printed On'}:{' '}
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          {activeSchool?.Logo ? (
            <img
              src={activeSchool.Logo}
              alt="School Logo"
              className="h-20 w-20 object-contain"
            />
          ) : (
            <div className="h-20 w-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">
              LOGO
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[400px] mb-10">{children}</div>

      <div className="border-t border-slate-200 pt-6 grid grid-cols-3 gap-6">
        {(['left', 'center', 'right'] as const).map((alignment) => (
          <div
            key={alignment}
            className={`flex flex-col ${
              alignment === 'left'
                ? 'items-start'
                : alignment === 'center'
                ? 'items-center'
                : 'items-end'
            } gap-4`}
          >
            {reportConfig.Signature_Chain.filter(
              (s) => s.Alignment === alignment
            ).map((step) => (
              <div
                key={step.Step_ID}
                className="text-center w-40 animate-in fade-in duration-500"
              >
                {step.Is_Stamp_Required && (
                  <div className="w-16 h-16 border-2 border-slate-900/10 rounded-full mx-auto mb-2 flex items-center justify-center text-slate-900/10 uppercase text-[8px] font-black tracking-widest rotate-12">
                    OFFICIAL SEAL
                  </div>
                )}
                <div className="h-10 border-b border-slate-900/20 w-full mb-1" />
                <p className="text-[10px] font-black text-slate-700">
                  {isRtl ? step.Display_Title_Ar : step.Display_Title_En}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const StudentReportsTab: React.FC<{ store: any }> = ({ store }) => {
  const {
    t,
    lang,
    reportConfigs = [],
    activeSchool,
    students = [],
    allStudents = [],
    parents = [],
    stages = [],
    grades = [],
    classes = [],
    activeYear,
    years = [],
    workingYearId
  } = store;
  const isRtl = lang === 'ar';
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [settingsReportId, setSettingsReportId] = useState<string | null>(null);
  const defaultReportSettings = {
    paperSize: 'A4',
    orientation: 'portrait',
    font: 'Cairo',
    fontSize: '12',
    lineHeight: '1.4',
    margin: '12',
    sortMode: 'default', // default | gender | name | age_desc | age_asc
    normalizeNames: false,
    titleFontSize: '22',
    bodyFontSize: '14',
    signatureFontSize: '12'
  };
  const [reportSettings, setReportSettings] = useState(defaultReportSettings);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [certStageId, setCertStageId] = useState<string>('');
  const [certGradeId, setCertGradeId] = useState<string>('');
  const [certStudentId, setCertStudentId] = useState<string>('');
  const [certYearId, setCertYearId] = useState<string>('');
  const [transferSearchName, setTransferSearchName] = useState('');
  const [transferSearchNationalId, setTransferSearchNationalId] = useState('');
  const [transferGradeId, setTransferGradeId] = useState('');
  const [transferClassId, setTransferClassId] = useState('');
  const [transferStudentId, setTransferStudentId] = useState('');
  const [transferReason, setTransferReason] = useState('رغبة ولي الأمر');
  const [transferFromSchool, setTransferFromSchool] = useState('');
  const [transferToSchool, setTransferToSchool] = useState('');
  const [transferFeesStatus, setTransferFeesStatus] = useState<'paid' | 'unpaid' | ''>('');
  const [transferBooksStatus, setTransferBooksStatus] = useState<'paid' | 'unpaid' | ''>('');
  const [transferDuration, setTransferDuration] = useState('');
  const [certSearchName, setCertSearchName] = useState('');
  const [certSearchNationalId, setCertSearchNationalId] = useState('');
  const [parentsStageId, setParentsStageId] = useState('');
  const [parentsGradeId, setParentsGradeId] = useState('');
  const [parentsStatus, setParentsStatus] = useState('');
  const [parentsSearch, setParentsSearch] = useState('');
  const [appliedParentsFilters, setAppliedParentsFilters] = useState({
    stageId: '',
    gradeId: '',
    status: '',
    search: ''
  });
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [tempPrintSettings, setTempPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);

  const handlePrintNow = () => {
    if (!selectedReportId) {
      alert(isRtl ? 'اختر تقريرًا أولاً.' : 'Select a report first.');
      return;
    }
    setTempPrintSettings(printSettings);
    setShowPrintModal(true);
  };

  const paperKey = (printSettings.paperSize || 'A4').toUpperCase() as 'A4' | 'A3' | 'LETTER' | 'Letter';
  const normalizedPaper = paperKey === 'LETTER' ? 'Letter' : (paperKey as 'A4' | 'A3' | 'Letter');
  const orientKey = (printSettings.orientation || 'Portrait') as 'Portrait' | 'Landscape';
  const dims = PAPER_SIZES[normalizedPaper]?.[orientKey] || PAPER_SIZES.A4.Portrait;
  const pageSizeToken = `${normalizedPaper} ${orientKey.toLowerCase()}`;

  const applyTempPrint = () => {
    setPrintSettings(tempPrintSettings);
    setShowPrintModal(false);
    setTimeout(() => window.print(), 50);
  };

  const parentsRows = useMemo(() => {
    const normId = (v: any) => (v === undefined || v === null ? '' : String(v).trim());
    const normText = (v: any) => (v === undefined || v === null ? '' : String(v).trim().toLowerCase());
    const stageFilter = normId(appliedParentsFilters.stageId);
    const gradeFilter = normId(appliedParentsFilters.gradeId);
    const statusFilter = normText(appliedParentsFilters.status);
    const search = normText(appliedParentsFilters.search);

    const studentsPool = (allStudents && allStudents.length ? allStudents : students) || [];

    const filteredStudents = studentsPool.filter((stu: any) => {
      const stageId = normId(stu.Stage_ID || '');
      const gradeId = normId(stu.Grade_ID || '');
      const status = normText(stu.Status || stu.Student_Status || stu.status || '');
      if (stageFilter && stageId !== stageFilter) return false;
      if (gradeFilter && gradeId !== gradeFilter) return false;
      if (statusFilter) {
        if (!status.includes(statusFilter)) return false;
      }
      return true;
    });

    type ParentRow = {
      id: string;
      name: string;
      nationalId: string;
      mobile: string;
      childrenIds: string[];
      childrenNames: string[];
    };

    const parentMap = new Map<string, ParentRow>();
    const parentsSource = parents || [];
    const parentsById = new Map(parentsSource.map((p: any) => [normId(p.Parent_ID), p]));
    const parentsByNational = new Map(parentsSource.map((p: any) => [normId(p.National_ID), p]));

    const pushParent = (pObj: any, childName: string, childCode: string) => {
      const pid = normId(pObj?.Parent_ID || pObj?.National_ID);
      if (!pid) return;
      const existing = parentMap.get(pid) || {
        id: pid,
        name: pObj?.Name || pObj?.Full_Name || '—',
        nationalId: pObj?.National_ID || '',
        mobile: pObj?.Mobile || pObj?.Phone || '',
        childrenIds: [],
        childrenNames: []
      };
      if (childCode && !existing.childrenIds.includes(childCode)) existing.childrenIds.push(childCode);
      if (childName && !existing.childrenNames.includes(childName)) existing.childrenNames.push(childName);
      parentMap.set(pid, existing);
    };

    filteredStudents.forEach((stu: any) => {
      const childName = stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—';
      const childCode = normId(stu.Student_Global_ID || stu.Student_ID || stu.id || '');
      const father = stu.Father || parentsById.get(normId(stu.Father?.Parent_ID)) || parentsByNational.get(normId(stu.Father?.National_ID));
      const mother = stu.Mother || parentsById.get(normId(stu.Mother?.Parent_ID)) || parentsByNational.get(normId(stu.Mother?.National_ID));
      if (father) pushParent(father, childName, childCode);
      if (mother) pushParent(mother, childName, childCode);
    });

    let list = Array.from(parentMap.values());
    if (search) {
      list = list.filter(
        (p) =>
          normText(p.name).includes(search) ||
          normText(p.mobile).includes(search) ||
          normText(p.nationalId).includes(search)
      );
    }

    return list.sort((a, b) => normText(a.name).localeCompare(normText(b.name), 'ar'));
  }, [allStudents, students, parents, appliedParentsFilters]);

  const transferColumns = [
    'studentName',
    'grade',
    'year',
    'duration',
    'birth',
    'studentNid',
    'guardianName',
    'guardianNid',
    'guardianDob',
    'guardianMobile',
    'address',
    'fromSchool',
    'currentSchool',
    'toSchool',
    'reason',
    'fees',
    'books'
  ];

  const isColVisibleWith = (id: string, settings: PrintSettings) =>
    settings.columnsMode === 'all' || settings.selectedColumns.includes(id);

  const renderTransferTablePreview = (settings: PrintSettings) => {
    if (!transferSelectedStudent) {
      return (
        <div className="bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-2xl px-4 py-3">
          {isRtl ? 'يرجى اختيار الطالب أولاً.' : 'Please choose a student first.'}
        </div>
      );
    }
    const rowVisible = (...ids: string[]) => ids.some((id) => isColVisibleWith(id, settings));
    return (
      <table className="w-full border border-slate-300 text-xs">
        <tbody>
          {rowVisible('studentName', 'grade') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('studentName', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black w-1/3">اسم الطالب</td>
              <td style={{ display: isColVisibleWith('studentName', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Name_Ar || transferSelectedStudent.Student_FullName || transferSelectedStudent.Full_Name || transferSelectedStudent.name || '—'}
              </td>
              <td style={{ display: isColVisibleWith('grade', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black w-1/3">الصف الدراسي</td>
              <td style={{ display: isColVisibleWith('grade', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Grade_Name ||
                  grades.find((g: any) => String(g.Grade_ID) === String(transferSelectedStudent.Grade_ID))?.Grade_Name ||
                  '—'}
              </td>
            </tr>
          )}
          {rowVisible('year', 'duration') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('year', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">العام الدراسي</td>
              <td style={{ display: isColVisibleWith('year', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {academicYearLabel || '—'}
              </td>
              <td style={{ display: isColVisibleWith('duration', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">مدة بقائه في الصف</td>
              <td style={{ display: isColVisibleWith('duration', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferDuration ||
                  transferSelectedStudent.Duration_In_Grade ||
                  transferSelectedStudent.Years_In_Grade ||
                  transferSelectedStudent.timeInGrade ||
                  ''}
              </td>
            </tr>
          )}
          {rowVisible('birth', 'studentNid') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('birth', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">تاريخ ميلاد الطالب</td>
              <td style={{ display: isColVisibleWith('birth', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Birth_Date || transferSelectedStudent.birthDate || transferSelectedStudent.DOB || '—'}
              </td>
              <td style={{ display: isColVisibleWith('studentNid', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">رقم قومي الطالب</td>
              <td style={{ display: isColVisibleWith('studentNid', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.National_ID || transferSelectedStudent.nationalId || '—'}
              </td>
            </tr>
          )}
          {rowVisible('guardianName', 'guardianNid') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('guardianName', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">اسم ولي الأمر</td>
              <td style={{ display: isColVisibleWith('guardianName', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Father?.Name ||
                  transferSelectedStudent.Guardian?.Name ||
                  transferSelectedStudent.Parent?.Name ||
                  transferSelectedStudent.Guardian_Name ||
                  transferSelectedStudent.Father_Name ||
                  '—'}
              </td>
              <td style={{ display: isColVisibleWith('guardianNid', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">رقم قومي ولي الأمر</td>
              <td style={{ display: isColVisibleWith('guardianNid', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Father?.National_ID ||
                  transferSelectedStudent.Guardian?.National_ID ||
                  transferSelectedStudent.Guardian_National_ID ||
                  transferSelectedStudent.Father_National_ID ||
                  '—'}
              </td>
            </tr>
          )}
          {rowVisible('guardianDob', 'guardianMobile') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('guardianDob', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">تاريخ ميلاد ولي الأمر</td>
              <td style={{ display: isColVisibleWith('guardianDob', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Father?.DOB ||
                  transferSelectedStudent.Guardian?.DOB ||
                  transferSelectedStudent.Guardian_DOB ||
                  transferSelectedStudent.Father_DOB ||
                  '—'}
              </td>
              <td style={{ display: isColVisibleWith('guardianMobile', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">رقم موبايل ولي الأمر</td>
              <td style={{ display: isColVisibleWith('guardianMobile', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Father?.Mobile ||
                  transferSelectedStudent.Guardian?.Mobile ||
                  transferSelectedStudent.Parent?.Mobile ||
                  transferSelectedStudent.Guardian_Phone ||
                  transferSelectedStudent.Guardian_Mobile ||
                  transferSelectedStudent.Mother?.Mobile ||
                  transferSelectedStudent.Mother_Mobile ||
                  transferSelectedStudent.Mother?.WhatsApp ||
                  transferSelectedStudent.Father?.WhatsApp ||
                  '—'}
              </td>
            </tr>
          )}
          {rowVisible('address', 'fromSchool') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('address', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">العنوان</td>
              <td style={{ display: isColVisibleWith('address', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferSelectedStudent.Address ||
                  transferSelectedStudent.Home_Address ||
                  transferSelectedStudent.address ||
                  transferSelectedStudent.Father?.Address ||
                  transferSelectedStudent.Guardian?.Address ||
                  transferSelectedStudent.Parent?.Address ||
                  '—'}
              </td>
              <td style={{ display: isColVisibleWith('fromSchool', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">المدرسة المحول منها</td>
              <td style={{ display: isColVisibleWith('fromSchool', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferFromSchool ||
                  transferSelectedStudent.Transfer_From ||
                  transferSelectedStudent.From_School ||
                  activeSchool?.School_Name ||
                  activeSchool?.name ||
                  '—'}
              </td>
            </tr>
          )}
          {rowVisible('currentSchool', 'toSchool') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td style={{ display: isColVisibleWith('currentSchool', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">اسم المدرسة المقيد بها</td>
              <td style={{ display: isColVisibleWith('currentSchool', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferFromSchool ||
                  transferSelectedStudent.Transfer_From ||
                  transferSelectedStudent.From_School ||
                  activeSchool?.School_Name ||
                  activeSchool?.name ||
                  '—'}
              </td>
              <td style={{ display: isColVisibleWith('toSchool', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1 font-black">اسم المدرسة المحول إليها</td>
              <td style={{ display: isColVisibleWith('toSchool', settings) ? undefined : 'none' }} className="border border-slate-300 px-2 py-1">
                {transferToSchool ||
                  transferSelectedStudent.Transfer_To ||
                  transferSelectedStudent.To_School ||
                  transferSelectedStudent.Target_School ||
                  '—'}
              </td>
            </tr>
          )}
          {rowVisible('reason') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td className="border border-slate-300 px-2 py-1 font-black">سبب التحويل</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                {transferReason || '—'}
              </td>
            </tr>
          )}
          {rowVisible('fees', 'books') && (
            <tr className="odd:bg-white even:bg-slate-50">
              <td className="border border-slate-300 px-2 py-1 font-black">موقفه من سداد الرسوم</td>
              <td className="border border-slate-300 px-2 py-1">
                {mapFinanceYesNo(
                  transferSelectedStudent.Fees_Status ||
                    transferSelectedStudent.FeesPaid ||
                    transferSelectedStudent.Has_Paid_Fees,
                  transferFeesStatus
                )}
              </td>
              <td className="border border-slate-300 px-2 py-1 font-black">موقفه من استلام الكتب</td>
              <td className="border border-slate-300 px-2 py-1">
                {mapFinanceYesNo(
                  transferSelectedStudent.Books_Received ||
                    transferSelectedStudent.Has_Books ||
                    transferSelectedStudent.Received_Books,
                  transferBooksStatus
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderParentsPreview = (settings: PrintSettings) => {
    if (!parentsRows.length) {
      return (
        <div className="bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-2xl px-4 py-3">
          {isRtl ? 'لا توجد بيانات أولياء أمور بعد تطبيق الفلاتر.' : 'No guardians found for current filters.'}
        </div>
      );
    }
    return (
      <table className="w-full border border-slate-300 text-xs" dir="rtl">
        <thead className="bg-slate-100">
          <tr>
            <th className="border border-slate-300 px-2 py-1 text-center">كود ولي الأمر</th>
            <th className="border border-slate-300 px-2 py-1 text-center">اسم ولي الأمر</th>
            <th className="border border-slate-300 px-2 py-1 text-center">الرقم القومي</th>
            <th className="border border-slate-300 px-2 py-1 text-center">رقم الموبايل</th>
            <th className="border border-slate-300 px-2 py-1 text-center">عدد الأبناء</th>
            <th className="border border-slate-300 px-2 py-1 text-center">أكواد الأبناء</th>
          </tr>
        </thead>
        <tbody>
          {parentsRows.slice(0, 6).map((p) => (
            <tr key={p.id} className="odd:bg-white even:bg-slate-50">
              <td className="border border-slate-300 px-2 py-1 text-center font-black">{p.id || '—'}</td>
              <td className="border border-slate-300 px-2 py-1 text-right font-black text-slate-800">{p.name || '—'}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{p.nationalId || '—'}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{p.mobile || '—'}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{p.childrenIds.length}</td>
              <td className="border border-slate-300 px-2 py-1 text-right text-[11px]">{p.childrenIds.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const studentReportConfig: ReportConfig | undefined = useMemo(
    () => reportConfigs.find((cfg: ReportConfig) => cfg.Category_ID === 'students'),
    [reportConfigs]
  );

  // السماح فقط بأول صف في كل مرحلة (رياض/ابتدائي/إعدادي ...)
  const firstGradePerStage = useMemo(() => {
    const map = new Map<string, any>();
    (store.grades || []).forEach((g: any) => {
      const stageId = String(g.Stage_ID || '');
      if (!stageId) return;
      const current = map.get(stageId);
      const gradeLevel = Number(g.Grade_Level || g.Level || g.SortOrder || g.Order || g.Grade_Order || g.GradeIndex || g.Grade_ID);
      const currentLevel = current
        ? Number(current.Grade_Level || current.Level || current.SortOrder || current.Order || current.Grade_Order || current.GradeIndex || current.Grade_ID)
        : Infinity;
      if (!current || gradeLevel < currentLevel) {
        map.set(stageId, g);
      }
    });
    return map;
  }, [store.grades]);

  const allowedGradeIds = useMemo(() => {
    const ids = new Set<string>();
    firstGradePerStage.forEach((g) => {
      const id = g?.Grade_ID || g?.id;
      if (id) ids.add(String(id));
    });
    return ids;
  }, [firstGradePerStage]);

  const sourceStudents = allStudents && allStudents.length ? allStudents : students || [];

  const filteredGrades = useMemo(
    () => grades.filter((g: any) => !selectedStageId || String(g.Stage_ID) === String(selectedStageId)),
    [grades, selectedStageId]
  );

  const filteredClasses = useMemo(
    () => classes.filter((c: any) => !selectedGradeId || String(c.Grade_ID) === String(selectedGradeId)),
    [classes, selectedGradeId]
  );

  const certFilteredGrades = useMemo(
    () => grades.filter((g: any) => !certStageId || String(g.Stage_ID) === String(certStageId)),
    [grades, certStageId]
  );

  const transferFilteredStudents = useMemo(() => {
    let list = [...sourceStudents];
    if (transferGradeId) {
      list = list.filter((s: any) => String(s.Grade_ID || s.gradeId) === String(transferGradeId));
    }
    if (transferClassId) {
      list = list.filter((s: any) => String(s.Class_ID || s.classId) === String(transferClassId));
    }
    if (transferSearchName.trim()) {
      const q = normalizeName(transferSearchName);
      list = list.filter((s: any) =>
        normalizeName(s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || '').includes(q)
      );
    }
    if (transferSearchNationalId.trim()) {
      const q = transferSearchNationalId.trim();
      list = list.filter((s: any) => (s.National_ID || s.nationalId || '').toString().includes(q));
    }
    list.sort((a, b) =>
      normalizeName(a.Name_Ar || a.Student_FullName || a.Full_Name || a.name || '').localeCompare(
        normalizeName(b.Name_Ar || b.Student_FullName || b.Full_Name || b.name || ''),
        'ar'
      )
    );
    return list;
  }, [sourceStudents, transferGradeId, transferClassId, transferSearchName, transferSearchNationalId]);

  const baseReports = studentReportConfig?.Available_Reports || [];
  const extraReports: ReportCard[] = [
    { Report_ID: 'STU-12D', Title_Ar: 'سجل ١٢ د', Title_En: 'Form 12D Register' },
    { Report_ID: 'STU-TRANSFER', Title_Ar: 'تقرير الطلاب المحولين', Title_En: 'Transferred Students' },
    { Report_ID: CLASS_LIST_REPORT_ID, Title_Ar: 'قوائم الفصول', Title_En: 'Class Rosters' },
    { Report_ID: ENROLL_CERT_REPORT_ID, Title_Ar: 'إفادة قيد طالب بالمدرسة', Title_En: 'Student Enrollment Certificate' },
    { Report_ID: TRANSFER_REQUEST_REPORT_ID, Title_Ar: 'طلب تحويل طالب', Title_En: 'Student Transfer Request' },
    { Report_ID: PARENTS_LIST_REPORT_ID, Title_Ar: 'قائمة أولياء الأمور', Title_En: 'Parents List' }
  ];
  const reports = useMemo(() => {
    const merged = [...baseReports];
    extraReports.forEach((er) => {
      if (!merged.some((r) => r.Report_ID === er.Report_ID)) merged.push(er);
    });
    return merged;
  }, [baseReports]);

  const currentYearId = useMemo(
    () =>
      workingYearId ||
      activeYear?.Year_ID ||
      activeYear?.AcademicYear_ID ||
      activeYear?.id ||
      '',
    [workingYearId, activeYear]
  );

  const currentSchoolCode = useMemo(
    () =>
      (
        activeSchool?.School_Code ||
        activeSchool?.Code ||
        activeSchool?.ID ||
        activeSchool?.id ||
        ''
      )
        .toString()
        .toLowerCase(),
    [activeSchool]
  );

  const academicYearLabel = useMemo(() => {
    if (activeYear) {
      return (
        activeYear.AcademicYear_Name ||
        activeYear.Year_Name ||
        activeYear.Name ||
        ''
      );
    }
    const targetYear = (years || []).find(
      (y: any) => String(y.Year_ID || y.id) === String(workingYearId)
    );
    return (
      targetYear?.AcademicYear_Name ||
      targetYear?.Year_Name ||
      targetYear?.Name ||
      ''
    );
  }, [activeYear, years, workingYearId]);

  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
    setTimeout(() => {
      alert(isRtl ? 'جاري تجهيز تقرير الطلاب للطباعة...' : 'Preparing student report for printing...');
    }, 50);
  };

  const selectedReport = reports.find((r) => r.Report_ID === selectedReportId);

  const handleStageChange = (value: string) => {
    setSelectedStageId(value);
    setSelectedGradeId('');
    setSelectedClassId('');
  };

  const handleGradeChange = (value: string) => {
    setSelectedGradeId(value);
    setSelectedClassId('');
  };

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
  };

  const selectedClassName = useMemo(() => {
    const cls = (classes || []).find((c: any) => String(c.Class_ID) === String(selectedClassId));
    return cls?.Class_Name || cls?.Name || '';
  }, [classes, selectedClassId]);

  const classSelectionReady = !!(selectedStageId && selectedGradeId && selectedClassId);

  const certSelectedStudent = useMemo(() => {
    if (!certStudentId) return null;
    return (sourceStudents || []).find(
      (s: any) =>
        String(s.Student_Global_ID || s.Student_ID || s.id) === String(certStudentId)
    );
  }, [certStudentId, sourceStudents]);

  const transferSelectedStudent = useMemo(() => {
    if (!transferStudentId) return null;
    return (sourceStudents || []).find(
      (s: any) =>
        String(s.Student_Global_ID || s.Student_ID || s.id) === String(transferStudentId)
    );
  }, [transferStudentId, sourceStudents]);

  const certYearLabel = useMemo(() => {
    if (certYearId) {
      const y = (years || []).find((yr: any) => String(yr.Year_ID || yr.id) === String(certYearId));
      return y?.AcademicYear_Name || y?.Year_Name || y?.Name || '';
    }
    return academicYearLabel || '';
  }, [certYearId, years, academicYearLabel]);

  const loadReportSettings = (reportId: string) => {
    if (typeof window === 'undefined') return defaultReportSettings;
    try {
      const raw = window.localStorage.getItem('REPORT_SETTINGS');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed[reportId] || defaultReportSettings;
    } catch {
      return defaultReportSettings;
    }
  };

  const handleOpenSettings = (reportId: string) => {
    setReportSettings(loadReportSettings(reportId));
    setSettingsReportId(reportId);
  };

  const handleSaveSettings = () => {
    if (!settingsReportId || typeof window === 'undefined') {
      setSettingsReportId(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem('REPORT_SETTINGS');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[settingsReportId] = reportSettings;
      window.localStorage.setItem('REPORT_SETTINGS', JSON.stringify(parsed));
    } catch {
      // ignore storage errors
    }
    setSettingsReportId(null);
  };

  const activeSettings = selectedReportId ? loadReportSettings(selectedReportId) : defaultReportSettings;
  // فرض إعدادات خاصة لبعض التقارير
  const effectiveSettings =
    selectedReportId === 'STU-12D'
      ? { ...activeSettings, paperSize: 'A3', orientation: 'landscape', margin: activeSettings.margin || '12' }
      : selectedReportId === 'STU-TRANSFER'
      ? { ...activeSettings, paperSize: 'A4', orientation: 'landscape', margin: activeSettings.margin || '12' }
      : selectedReportId === ENROLL_CERT_REPORT_ID
      ? {
          ...activeSettings,
          paperSize: activeSettings.paperSize || 'A4',
          orientation: activeSettings.orientation || 'portrait',
          titleFontSize: activeSettings.titleFontSize || '22',
          bodyFontSize: activeSettings.bodyFontSize || '14',
          signatureFontSize: activeSettings.signatureFontSize || '12'
        }
      : activeSettings;

  const ensureClassSelection = () => {
    if (!classSelectionReady) {
      alert(
        isRtl
          ? 'يرجى اختيار المرحلة ثم الصف ثم الفصل أولاً.'
          : 'Please select stage, grade, and class before continuing.'
      );
      return false;
    }
    return true;
  };

  if (!studentReportConfig) {
    return (
      <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-6 font-bold">
        {isRtl ? 'لا توجد تقارير طلاب معرفة حالياً.' : 'No student reports configured.'}
      </div>
    );
  }

  const onPreview = (id: string) => {
    setSelectedReportId(id);
  };

  const onPrint = (id: string) => {
    if (id === CLASS_LIST_REPORT_ID && !ensureClassSelection()) return;
    if (id === ENROLL_CERT_REPORT_ID && !certSelectedStudent) {
      alert(isRtl ? 'يرجى اختيار الطالب المراد طباعة إفادته.' : 'Please select a student first.');
      return;
    }
    if (id === TRANSFER_REQUEST_REPORT_ID && !transferSelectedStudent) {
      alert(isRtl ? 'يرجى اختيار الطالب المراد تحويله.' : 'Please select a student first.');
      return;
    }
    setSelectedReportId(id);
    setTimeout(() => window.print(), 200);
  };

  const mapEnrollmentStatus = (status: string) => {
    if (!status) return '—';
    const raw = status.toString().toLowerCase();
    if (raw.includes('enrolled') || raw.includes('active') || raw.includes('registered')) return 'مقيد';
    if (raw.includes('transfer')) return 'محول';
    if (raw.includes('dropped') || raw.includes('drop') || raw.includes('withdraw')) return 'منقطع';
    if (raw.includes('expel') || raw.includes('terminate')) return 'مفصول';
    if (['مقيد', 'محول', 'منقطع', 'مفصول'].includes(status)) return status;
    return status;
  };

  const classRosterStudents = useMemo(() => {
    if (!selectedClassId) return [];
    let list = [...sourceStudents];

    if (currentYearId) {
      list = list.filter((s: any) => {
        const yr =
          s.Academic_Year_ID ||
          s.academicYearId ||
          s.Year_ID ||
          s.yearId ||
          '';
        return String(yr) === String(currentYearId);
      });
    }

    if (currentSchoolCode) {
      list = list.filter((s: any) => {
        const sc =
          s.School_Code ||
          s.schoolCode ||
          s.School_ID ||
          s.schoolId ||
          '';
        return sc && sc.toString().toLowerCase() === currentSchoolCode;
      });
    }

    if (selectedStageId) {
      list = list.filter((s: any) => String(s.Stage_ID || s.stageId) === String(selectedStageId));
    }

    if (selectedGradeId) {
      list = list.filter((s: any) => String(s.Grade_ID || s.gradeId) === String(selectedGradeId));
    }

    list = list.filter((s: any) => String(s.Class_ID || s.classId) === String(selectedClassId));

    const getName = (s: any) => {
      const nm = s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || s.Student_Name || '';
      return activeSettings.normalizeNames ? normalizeName(nm) : nm;
    };

    list.sort((a, b) => getName(a).localeCompare(getName(b), 'ar'));
    return list;
  }, [
    sourceStudents,
    selectedClassId,
    selectedGradeId,
    selectedStageId,
    currentYearId,
    currentSchoolCode,
    activeSettings.normalizeNames
  ]);

  const certEligibleStudents = useMemo(() => {
    let list = [...sourceStudents];
    const targetYear = certYearId || currentYearId;
    if (targetYear) {
      list = list.filter((s: any) => {
        const yr =
          s.Academic_Year_ID ||
          s.academicYearId ||
          s.Year_ID ||
          s.yearId ||
          '';
        return String(yr) === String(targetYear);
      });
    }
    if (certStageId) {
      list = list.filter((s: any) => String(s.Stage_ID || s.stageId) === String(certStageId));
    }
    if (certGradeId) {
      list = list.filter((s: any) => String(s.Grade_ID || s.gradeId) === String(certGradeId));
    }
    list = list.filter((s: any) => {
      const status = (s.Status || s.Student_Status || s.status || '').toString().toLowerCase();
      return status.includes('enrolled') || status.includes('active') || status.includes('مقيد') || status === '';
    });
    const sortName = (s: any) => normalizeName(s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || '');
    list.sort((a, b) => sortName(a).localeCompare(sortName(b), 'ar'));
    return list;
  }, [sourceStudents, certYearId, certStageId, certGradeId, currentYearId]);

  const certFilteredStudents = useMemo(() => {
    let list = [...certEligibleStudents];
    if (certSearchName.trim()) {
      const q = normalizeName(certSearchName);
      list = list.filter((s: any) =>
        normalizeName(s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || '').includes(q)
      );
    }
    if (certSearchNationalId.trim()) {
      const q = certSearchNationalId.trim();
      list = list.filter((s: any) => (s.National_ID || s.nationalId || '').toString().includes(q));
    }
    return list;
  }, [certEligibleStudents, certSearchName, certSearchNationalId]);

  const mapFinanceYesNo = (value: any, override?: 'paid' | 'unpaid' | '') => {
    const use = override || value;
    const v = (use || '').toString().toLowerCase();
    if (use === 'paid' || use === true || v.includes('yes') || v.includes('paid') || v.includes('settled') || v.includes('نعم') || v.includes('مسدد')) {
      return isRtl ? 'مسدد' : 'Paid';
    }
    if (use === 'unpaid' || use === false || v.includes('no') || v.includes('unpaid') || v.includes('لا') || v.includes('غير') || v.includes('غير مسدد')) {
      return isRtl ? 'لم يسدد' : 'Unpaid';
    }
    return isRtl ? 'اختياري' : 'Optional';
  };

  const sortedStudents = useMemo(() => {
    let list = [...sourceStudents];

    if (currentYearId) {
      list = list.filter((s: any) => {
        const yr =
          s.Academic_Year_ID ||
          s.academicYearId ||
          s.Year_ID ||
          s.yearId ||
          '';
        return String(yr) === String(currentYearId);
      });
    }

    if (currentSchoolCode) {
      list = list.filter((s: any) => {
        const sc =
          s.School_Code ||
          s.schoolCode ||
          s.School_ID ||
          s.schoolId ||
          '';
        return sc && sc.toString().toLowerCase() === currentSchoolCode;
      });
    }

    if (allowedGradeIds.size > 0) {
      list = list.filter((s: any) => {
        const gid = String(
          s.Grade_ID ||
            s.gradeId ||
            s.GradeId ||
            s.grade_id ||
            ''
        );
        return gid && allowedGradeIds.has(gid);
      });
    }

    const mode = activeSettings.sortMode;
    const getBirthDate = (s: any) => new Date(s.Birth_Date || s.birthDate || s.DOB || '1900-01-01').getTime();
    const getGenderWeight = (s: any) => {
      const g = (s.Gender || s.gender || '').toString().toLowerCase();
      if (g.includes('ذ') || g.includes('male')) return 0;
      if (g.includes('أ') || g.includes('female')) return 1;
      return 2;
    };
    const getName = (s: any) => {
      const nm = s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || '';
      return activeSettings.normalizeNames ? normalizeName(nm) : nm;
    };

    switch (mode) {
      case 'gender':
        list.sort((a, b) => {
          const gw = getGenderWeight(a) - getGenderWeight(b);
          if (gw !== 0) return gw;
          return getName(a).localeCompare(getName(b), 'ar');
        });
        break;
      case 'name':
        list.sort((a, b) => getName(a).localeCompare(getName(b), 'ar'));
        break;
      case 'age_desc':
        list.sort((a, b) => getBirthDate(a) - getBirthDate(b));
        break;
      case 'age_asc':
        list.sort((a, b) => getBirthDate(b) - getBirthDate(a));
        break;
      default:
        break;
    }
    return list;
  }, [
    sourceStudents,
    activeSettings.sortMode,
    activeSettings.normalizeNames,
    currentYearId,
    currentSchoolCode,
    allowedGradeIds
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start" dir="rtl">
      <style>{`
        @media print {
          @page { size: ${effectiveSettings.paperSize} ${effectiveSettings.orientation}; margin: ${effectiveSettings.margin}mm; }
          body * { visibility: hidden; }
          #student-report-print, #student-report-print * { visibility: visible; }
          #student-report-print { position: absolute; inset: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {!selectedReport && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden no-print">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-900">تقارير الطلاب</h3>
              <p className="text-sm text-slate-500 font-bold">إعدادات الطباعة والهوية البصرية للتقارير</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-black">
                <tr>
                  <th className="p-4 text-right">إجراءات</th>
                  <th className="p-4 text-right">اسم التقرير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((rep) => {
                  const isClassListReport = rep.Report_ID === CLASS_LIST_REPORT_ID;
                  const isEnrollCertReport = rep.Report_ID === ENROLL_CERT_REPORT_ID;
                  const isTransferRequestReport = rep.Report_ID === TRANSFER_REQUEST_REPORT_ID;
                  const previewDisabled = false;
                  const printDisabled =
                    (isClassListReport && !classSelectionReady) ||
                    (isEnrollCertReport && !certSelectedStudent) ||
                    (isTransferRequestReport && !transferSelectedStudent);
                  return (
                    <tr key={rep.Report_ID} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 justify-start">
                            <button
                              onClick={() => handleOpenSettings(rep.Report_ID)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-indigo-600 font-bold"
                            >
                              ⚙️ إعدادات
                            </button>
                            <button
                              onClick={() => onPreview(rep.Report_ID)}
                              disabled={previewDisabled}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                            >
                              👁 معاينة
                            </button>
                            <button
                              onClick={() => onPrint(rep.Report_ID)}
                              disabled={printDisabled}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-200"
                            >
                              🖨 طباعة التقرير
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{isRtl ? rep.Title_Ar : rep.Title_En}</td>
                    </tr>
                  );
                })}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-slate-400 font-bold">
                      لا توجد تقارير متاحة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedReportId(null)}
            className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={16} className={`${isRtl ? '' : 'rotate-180'}`} />{' '}
            {isRtl ? 'العودة لتقارير الطلاب' : 'Back to Students Reports'}
          </button>

          {selectedReportId === CLASS_LIST_REPORT_ID && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 no-print">
              <p className="text-sm font-bold text-slate-700">
                {isRtl ? 'حدد المرحلة والصف والفصل قبل المعاينة أو الطباعة' : 'Select stage, grade, and class before preview/print'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'المرحلة' : 'Stage'}</label>
                  <select
                    value={selectedStageId}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    <option value="">{isRtl ? 'اختر المرحلة' : 'Select stage'}</option>
                    {stages.map((st: any) => (
                      <option key={st.Stage_ID || st.id} value={st.Stage_ID || st.id}>
                        {st.Stage_Name || st.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'الصف' : 'Grade'}</label>
                  <select
                    value={selectedGradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    disabled={!selectedStageId}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{isRtl ? 'اختر الصف' : 'Select grade'}</option>
                    {filteredGrades.map((g: any) => (
                      <option key={g.Grade_ID || g.id} value={g.Grade_ID || g.id}>
                        {g.Grade_Name || g.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'الفصل' : 'Class'}</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    disabled={!selectedGradeId}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{isRtl ? 'اختر الفصل' : 'Select class'}</option>
                    {filteredClasses.map((c: any) => (
                      <option key={c.Class_ID || c.id} value={c.Class_ID || c.id}>
                        {c.Class_Name || c.Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedReportId === ENROLL_CERT_REPORT_ID && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 no-print">
              <p className="text-sm font-bold text-slate-700">
                {isRtl ? 'اختر العام/المرحلة/الصف والطالب لعرض الإفادة' : 'Choose year/stage/grade and student'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <select
                  value={certYearId}
                  onChange={(e) => setCertYearId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'اختر العام الدراسي' : 'Select Year'}</option>
                  {(years || []).map((y: any) => (
                    <option key={y.Year_ID || y.id} value={y.Year_ID || y.id}>
                      {y.AcademicYear_Name || y.Year_Name || y.Name}
                    </option>
                  ))}
                </select>
                <select
                  value={certStageId}
                  onChange={(e) => {
                    setCertStageId(e.target.value);
                    setCertGradeId('');
                    setCertStudentId('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'المرحلة' : 'Stage'}</option>
                  {stages.map((st: any) => (
                    <option key={st.Stage_ID || st.id} value={st.Stage_ID || st.id}>
                      {st.Stage_Name || st.Name}
                    </option>
                  ))}
                </select>
                <select
                  value={certGradeId}
                  onChange={(e) => {
                    setCertGradeId(e.target.value);
                    setCertStudentId('');
                  }}
                  disabled={!certStageId}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{isRtl ? 'الصف' : 'Grade'}</option>
                  {certFilteredGrades.map((g: any) => (
                    <option key={g.Grade_ID || g.id} value={g.Grade_ID || g.id}>
                      {g.Grade_Name || g.Name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={certSearchName}
                  onChange={(e) => setCertSearchName(e.target.value)}
                  placeholder={isRtl ? 'بحث بالاسم' : 'Search by name'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
                <input
                  type="text"
                  value={certSearchNationalId}
                  onChange={(e) => setCertSearchNationalId(e.target.value)}
                  placeholder={isRtl ? 'بحث بالرقم القومي' : 'Search by national ID'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
                <select
                  value={certStudentId}
                  onChange={(e) => setCertStudentId(e.target.value)}
                  disabled={!certGradeId && !certStageId}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 lg:col-span-2"
                >
                  <option value="">{isRtl ? 'اختر الطالب' : 'Select student'}</option>
                  {certFilteredStudents.map((s: any) => (
                    <option
                      key={s.Student_Global_ID || s.Student_ID || s.id}
                      value={s.Student_Global_ID || s.Student_ID || s.id}
                    >
                      {s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || '—'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedReportId === TRANSFER_REQUEST_REPORT_ID && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 no-print">
              <p className="text-sm font-bold text-slate-700">
                {isRtl ? 'اختر الطالب للمعاينة والطباعة' : 'Choose a student to preview/print'}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrintNow}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow hover:bg-slate-900 transition"
                >
                  🖨️ {isRtl ? 'طباعة' : 'Print'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <input
                  type="text"
                  value={transferSearchName}
                  onChange={(e) => setTransferSearchName(e.target.value)}
                  placeholder={isRtl ? 'بحث بالاسم' : 'Search by name'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
                <input
                  type="text"
                  value={transferSearchNationalId}
                  onChange={(e) => setTransferSearchNationalId(e.target.value)}
                  placeholder={isRtl ? 'بحث بالرقم القومي' : 'Search by national ID'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
                <select
                  value={transferGradeId}
                  onChange={(e) => {
                    setTransferGradeId(e.target.value);
                    setTransferClassId('');
                    setTransferStudentId('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'الصف' : 'Grade'}</option>
                  {grades.map((g: any) => (
                    <option key={g.Grade_ID || g.id} value={g.Grade_ID || g.id}>
                      {g.Grade_Name || g.Name}
                    </option>
                  ))}
                </select>
                <select
                  value={transferClassId}
                  onChange={(e) => {
                    setTransferClassId(e.target.value);
                    setTransferStudentId('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'الفصل' : 'Class'}</option>
                  {classes
                    .filter((c: any) => !transferGradeId || String(c.Grade_ID) === String(transferGradeId))
                    .map((c: any) => (
                      <option key={c.Class_ID || c.id} value={c.Class_ID || c.id}>
                        {c.Class_Name || c.Name}
                      </option>
                    ))}
                </select>
                <select
                  value={transferStudentId}
                  onChange={(e) => setTransferStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'اختر الطالب' : 'Select student'}</option>
                  {transferFilteredStudents.map((s: any) => (
                    <option
                      key={s.Student_Global_ID || s.Student_ID || s.id}
                      value={s.Student_Global_ID || s.Student_ID || s.id}
                    >
                      {s.Name_Ar || s.Student_FullName || s.Full_Name || s.name || '—'}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder={isRtl ? 'سبب التحويل' : 'Transfer reason'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 lg:col-span-5"
                />
                <input
                  type="text"
                  value={transferFromSchool}
                  onChange={(e) => setTransferFromSchool(e.target.value)}
                  placeholder={isRtl ? 'اسم المدرسة المحول منها (إن وجد)' : 'From school name (optional)'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
                <input
                  type="text"
                  value={transferToSchool}
                  onChange={(e) => setTransferToSchool(e.target.value)}
                  placeholder={isRtl ? 'اسم المدرسة المحول إليها' : 'To school name'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
                <div className="grid grid-cols-2 gap-2 lg:col-span-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      {isRtl ? 'موقف سداد المصروفات' : 'Fees status'}
                    </label>
                    <select
                      value={transferFeesStatus}
                      onChange={(e) => setTransferFeesStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      <option value="">{isRtl ? 'اختياري' : 'Optional'}</option>
                      <option value="paid">{isRtl ? 'مسدد' : 'Paid'}</option>
                      <option value="unpaid">{isRtl ? 'لم يسدد' : 'Unpaid'}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      {isRtl ? 'موقف استلام الكتب' : 'Books status'}
                    </label>
                    <select
                      value={transferBooksStatus}
                      onChange={(e) => setTransferBooksStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      <option value="">{isRtl ? 'اختياري' : 'Optional'}</option>
                      <option value="paid">{isRtl ? 'مسدد' : 'Received'}</option>
                      <option value="unpaid">{isRtl ? 'لم يستلم' : 'Not received'}</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500">
                    {isRtl ? 'مدة بقائه في الصف (اختياري)' : 'Duration in grade (optional)'}
                  </label>
                  <input
                    type="text"
                    value={transferDuration}
                    onChange={(e) => setTransferDuration(e.target.value)}
                    placeholder={isRtl ? 'مثال: مستجد / سنة واحدة' : 'e.g., New / One year'}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedReportId === PARENTS_LIST_REPORT_ID && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 no-print">
              <p className="text-sm font-bold text-slate-700">
                {isRtl ? 'فلترة أولياء الأمور ثم معاينة/طباعة' : 'Filter guardians then preview/print'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <select
                  value={parentsStageId}
                  onChange={(e) => {
                    setParentsStageId(e.target.value);
                    setParentsGradeId('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'المرحلة' : 'Stage'}</option>
                  {stages.map((st: any) => (
                    <option key={st.Stage_ID || st.id} value={st.Stage_ID || st.id}>
                      {st.Stage_Name || st.Name}
                    </option>
                  ))}
                </select>
                <select
                  value={parentsGradeId}
                  onChange={(e) => setParentsGradeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'الصف' : 'Grade'}</option>
                  {grades
                    .filter((g: any) => !parentsStageId || String(g.Stage_ID) === String(parentsStageId))
                    .map((g: any) => (
                      <option key={g.Grade_ID || g.id} value={g.Grade_ID || g.id}>
                        {g.Grade_Name || g.Name}
                      </option>
                    ))}
                </select>
                <select
                  value={parentsStatus}
                  onChange={(e) => setParentsStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="">{isRtl ? 'حالة القيد (الكل)' : 'Status (all)'}</option>
                  <option value="مقيد">{isRtl ? 'مقيد' : 'Enrolled'}</option>
                  <option value="محول">{isRtl ? 'محول' : 'Transferred'}</option>
                  <option value="منقطع">{isRtl ? 'منقطع' : 'Dropped'}</option>
                  <option value="مفصول">{isRtl ? 'مفصول' : 'Expelled'}</option>
                </select>
                <input
                  type="text"
                  value={parentsSearch}
                  onChange={(e) => setParentsSearch(e.target.value)}
                  placeholder={isRtl ? 'بحث بالاسم أو الموبايل أو القومي' : 'Search name/mobile/NID'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 lg:col-span-2"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    setAppliedParentsFilters({
                      stageId: parentsStageId,
                      gradeId: parentsGradeId,
                      status: parentsStatus,
                      search: parentsSearch
                    })
                  }
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow hover:bg-slate-900 transition"
                >
                  🔄 {isRtl ? 'تحديث التقرير' : 'Refresh'}
                </button>
              </div>
            </div>
          )}

          <style>{`
            @media print {
              @page { size: ${pageSizeToken}; margin: ${printSettings.margins.top}mm ${printSettings.margins.right}mm ${printSettings.margins.bottom}mm ${printSettings.margins.left}mm; }
              #student-report-print {
                width: ${dims.w}mm;
                transform: scale(${printSettings.scale || 1});
                transform-origin: top center;
                font-family: ${printSettings.fontFamily}, sans-serif;
                font-size: ${printSettings.fontSize}px;
              }
            }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print:overflow-visible print:shadow-none print:border-0 print:rounded-none print:w-[210mm] print:max-w-full print:mx-auto print:p-6 print:scale-[0.9] print:origin-top print:text-[11px] print:leading-tight print:m-0"
            id="student-report-print"
            style={{
              fontFamily: effectiveSettings.font,
              fontSize: `${effectiveSettings.fontSize}px`,
              lineHeight: effectiveSettings.lineHeight
            }}
          >
            <SignatureReportLayout
              reportTitle={isRtl ? selectedReport.Title_Ar : selectedReport.Title_En}
              activeSchool={activeSchool}
              reportConfig={studentReportConfig}
              lang={lang}
              printOverrides={{
                paperSize: printSettings.paperSize,
                orientation: printSettings.orientation as any,
                marginTop: printSettings.margins.top,
                marginRight: printSettings.margins.right,
                marginBottom: printSettings.margins.bottom,
                marginLeft: printSettings.margins.left,
                scale: printSettings.scale,
                fontFamily: printSettings.fontFamily,
                fontSize: printSettings.fontSize
              }}
            >
              <div className="py-8 text-center space-y-6">
                {selectedReportId === ENROLL_CERT_REPORT_ID ? (
                  <div
                    className="space-y-6"
                    style={{
                      fontSize: `${effectiveSettings.bodyFontSize || '14'}px`,
                      lineHeight: effectiveSettings.lineHeight
                    }}
                  >
                    <div className="space-y-1">
                      <h3
                        className="font-black text-slate-900"
                        style={{ fontSize: `${effectiveSettings.titleFontSize || '22'}px` }}
                      >
                        إفادة قيد طالب
                      </h3>
                    </div>
                    {certSelectedStudent ? (
                      <div className="space-y-5 text-right" dir="rtl">
                        <p className="font-bold text-slate-800">
                          تفيد إدارة مدرسة {activeSchool?.School_Name || activeSchool?.name || '—'}
                        </p>
                        <p className="font-bold text-slate-800">
                          بأن الطالب / {certSelectedStudent.Name_Ar || certSelectedStudent.Student_FullName || certSelectedStudent.Full_Name || certSelectedStudent.name || '—'}
                        </p>
                        <p className="font-bold text-slate-800">
                          المقيد بالصف /{' '}
                          {
                            certSelectedStudent.Grade_Name ||
                            grades.find((g: any) => String(g.Grade_ID) === String(certSelectedStudent.Grade_ID))?.Grade_Name ||
                            '—'
                          }
                        </p>
                        <p className="font-bold text-slate-800">
                          للعام الدراسي / {certYearLabel || '—'}
                        </p>
                        <p className="font-bold text-slate-800">
                          وقد وُلِد بتاريخ / {certSelectedStudent.Birth_Date || certSelectedStudent.birthDate || '—'}
                        </p>
                        <p className="font-bold text-slate-800">وهذه إفادة منا بذلك،</p>
                        <p className="font-bold text-slate-800">دون أدنى مسؤولية على المدرسة.</p>
                        <p className="font-bold text-slate-800">{`تحريرًا في: ${new Date().toLocaleDateString()}`}</p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-2xl px-4 py-3">
                        {isRtl ? 'يرجى اختيار الطالب والصف قبل الطباعة.' : 'Please select a student and grade before printing.'}
                      </div>
                    )}
                    <div
                      className="grid grid-cols-3 gap-6 pt-8"
                      style={{ fontSize: `${effectiveSettings.signatureFontSize || '12'}px` }}
                    >
                      <div className="text-right font-bold text-slate-700">
                        <p>مدير المدرسة</p>
                      </div>
                      <div className="text-center font-bold text-slate-700">
                        <p>توقيع شؤون الطلاب</p>
                      </div>
                      <div className="text-left font-bold text-slate-700">
                        <p>خاتم المدرسة</p>
                      </div>
                    </div>
                  </div>
                ) : selectedReportId === TRANSFER_REQUEST_REPORT_ID ? (
                  <div
                    className="space-y-8 text-right"
                    dir="rtl"
                    style={{
                      fontFamily: effectiveSettings.font,
                      fontSize: `${effectiveSettings.fontSize}px`,
                      lineHeight: effectiveSettings.lineHeight
                    }}
                  >
                    <h3 className="text-2xl font-black text-slate-900 text-center">طلب تحويل طالب</h3>

                    {transferSelectedStudent ? (
                      <div className="space-y-6">
                        <table
                          className="w-full border border-slate-300 text-xs print:w-full print:text-[11px]"
                          style={{ pageBreakInside: 'auto', breakInside: 'auto' }}
                        >
                          <tbody>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black w-1/3">اسم الطالب</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                <span className="font-black text-indigo-700">
                                  {transferSelectedStudent.Name_Ar ||
                                    transferSelectedStudent.Student_FullName ||
                                    transferSelectedStudent.Full_Name ||
                                    transferSelectedStudent.name ||
                                    '—'}
                                </span>
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black w-1/3">الصف الدراسي</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                <span className="font-black text-emerald-700">
                                  {transferSelectedStudent.Grade_Name ||
                                    grades.find((g: any) => String(g.Grade_ID) === String(transferSelectedStudent.Grade_ID))?.Grade_Name ||
                                    '—'}
                                </span>
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">العام الدراسي</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {academicYearLabel || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">مدة بقائه في الصف</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferDuration ||
                                  transferSelectedStudent.Duration_In_Grade ||
                                  transferSelectedStudent.Years_In_Grade ||
                                  transferSelectedStudent.timeInGrade ||
                                  ''}
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">تاريخ ميلاد الطالب</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferSelectedStudent.Birth_Date || transferSelectedStudent.birthDate || transferSelectedStudent.DOB || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">رقم قومي الطالب</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                <span className="font-black text-rose-700">
                                  {transferSelectedStudent.National_ID || transferSelectedStudent.nationalId || '—'}
                                </span>
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">اسم ولي الأمر</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferSelectedStudent.Father?.Name ||
                                  transferSelectedStudent.Guardian?.Name ||
                                  transferSelectedStudent.Parent?.Name ||
                                  transferSelectedStudent.Guardian_Name ||
                                  transferSelectedStudent.Father_Name ||
                                  '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">رقم قومي ولي الأمر</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                <span className="font-black text-rose-700">
                                  {transferSelectedStudent.Father?.National_ID ||
                                    transferSelectedStudent.Guardian?.National_ID ||
                                    transferSelectedStudent.Guardian_National_ID ||
                                    transferSelectedStudent.Father_National_ID ||
                                    '—'}
                                </span>
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">تاريخ ميلاد ولي الأمر</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferSelectedStudent.Father?.DOB ||
                                  transferSelectedStudent.Guardian?.DOB ||
                                  transferSelectedStudent.Guardian_DOB ||
                                  transferSelectedStudent.Father_DOB ||
                                  '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">رقم موبايل ولي الأمر</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferSelectedStudent.Father?.Mobile ||
                                  transferSelectedStudent.Guardian?.Mobile ||
                                  transferSelectedStudent.Parent?.Mobile ||
                                  transferSelectedStudent.Guardian_Phone ||
                                  transferSelectedStudent.Guardian_Mobile ||
                                  transferSelectedStudent.Mother?.Mobile ||
                                  transferSelectedStudent.Mother_Mobile ||
                                  transferSelectedStudent.Mother?.WhatsApp ||
                                  transferSelectedStudent.Father?.WhatsApp ||
                                  '—'}
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">العنوان</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferSelectedStudent.Address ||
                                  transferSelectedStudent.Home_Address ||
                                  transferSelectedStudent.address ||
                                  transferSelectedStudent.Father?.Address ||
                                  transferSelectedStudent.Guardian?.Address ||
                                  transferSelectedStudent.Parent?.Address ||
                                  '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">المدرسة المحول منها</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferFromSchool ||
                                  transferSelectedStudent.Transfer_From ||
                                  transferSelectedStudent.From_School ||
                                  activeSchool?.School_Name ||
                                  activeSchool?.name ||
                                  '—'}
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">اسم المدرسة المقيد بها</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferFromSchool ||
                                  transferSelectedStudent.Transfer_From ||
                                  transferSelectedStudent.From_School ||
                                  activeSchool?.School_Name ||
                                  activeSchool?.name ||
                                  '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">اسم المدرسة المحول إليها</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {transferToSchool ||
                                  transferSelectedStudent.Transfer_To ||
                                  transferSelectedStudent.To_School ||
                                  transferSelectedStudent.Target_School ||
                                  '—'}
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">سبب التحويل</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1" colSpan={3}>
                                {transferReason || '—'}
                              </td>
                            </tr>
                            <tr className="odd:bg-white even:bg-slate-50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">موقفه من سداد الرسوم</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {mapFinanceYesNo(
                                  transferSelectedStudent.Fees_Status ||
                                    transferSelectedStudent.FeesPaid ||
                                    transferSelectedStudent.Has_Paid_Fees,
                                  transferFeesStatus
                                )}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1 font-black">موقفه من استلام الكتب</td>
                              <td className="border border-slate-300 px-2 py-1.5 print:px-1.5 print:py-1">
                                {mapFinanceYesNo(
                                  transferSelectedStudent.Books_Received ||
                                    transferSelectedStudent.Has_Books ||
                                    transferSelectedStudent.Received_Books,
                                  transferBooksStatus
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="space-y-3 text-right" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                          <p className="font-bold text-slate-800">بعد التحية:</p>
                          <p className="font-bold text-slate-800">
                            نرجو التكرم بموافقتنا بإمكان تحويل الطالب المذكور بعاليه إلى مدرستكم من عدمه،
                          </p>
                          <p className="font-bold text-slate-800">وتفضلوا بقبول فائق الاحترام</p>
                          <div className="grid grid-cols-3 gap-4 pt-4 text-sm font-bold text-slate-700">
                            <div className="text-right">شؤون طلاب</div>
                            <div className="text-center">حسابات</div>
                            <div className="text-left">مدير المدرسة</div>
                          </div>
                        </div>

                        <div className="border border-slate-300 rounded-2xl p-4 space-y-3 break-inside-avoid">
                          <h4 className="text-lg font-black text-slate-900 text-center">رأي المدرسة المحول إليها</h4>
                          <div className="flex flex-col gap-2 text-sm font-bold text-slate-800">
                            <label className="flex items-center gap-2">
                              <span className="inline-block w-4 h-4 border border-slate-400 rounded-sm" />
                              ☐ يمكن قبول تحويل الطالب
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="inline-block w-4 h-4 border border-slate-400 rounded-sm" />
                              ☐ لا يمكن قبول تحويل الطالب
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm font-bold text-slate-800 pt-2">
                            <div className="text-right">السيد الأستاذ / مدير المدرسة</div>
                            <div className="text-left">تحريرًا في: ____ / ____ / 20__</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-2xl px-4 py-3">
                        {isRtl ? 'يرجى اختيار الطالب أولاً قبل المعاينة أو الطباعة.' : 'Please choose a student before preview/print.'}
                      </div>
                    )}
                  </div>
                ) : selectedReportId === CLASS_LIST_REPORT_ID ? (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h3 className="text-2xl font-black text-slate-900">قوائم الفصول</h3>
                      <p className="text-sm font-bold text-slate-600">
                        {`فصل: ${selectedClassName || '—'} – ${academicYearLabel || '—'}`}
                      </p>
                    </div>
                    {!classSelectionReady ? (
                      <div className="bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-2xl px-4 py-3">
                        {isRtl ? 'الرجاء اختيار المرحلة والصف والفصل لعرض التقرير.' : 'Please choose stage, grade, and class to view the report.'}
                      </div>
                    ) : (
                      <table className="w-full border-collapse border border-slate-300 text-sm" dir="rtl">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="py-2 px-3 border border-slate-300 text-center">م</th>
                            <th className="py-2 px-3 border border-slate-300 text-center">اسم الطالب</th>
                            <th className="py-2 px-3 border border-slate-300 text-center">النوع</th>
                            <th className="py-2 px-3 border border-slate-300 text-center">الديانة</th>
                            <th className="py-2 px-3 border border-slate-300 text-center">حالة القيد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classRosterStudents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-4 px-3 text-center text-slate-500 font-bold">
                                {isRtl ? 'لا توجد بيانات طلاب لهذا الفصل.' : 'No students found for this class.'}
                              </td>
                            </tr>
                          ) : (
                            classRosterStudents.map((stu: any, idx: number) => {
                              const displayName =
                                activeSettings.normalizeNames
                                  ? normalizeName(
                                      stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—'
                                    )
                                  : stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—';
                              const gender = stu.Gender || stu.gender || '—';
                              const religion = stu.Religion || stu.religion || '—';
                              const statusText = mapEnrollmentStatus(
                                stu.Status || stu.Student_Status || stu.status || ''
                              );
                              return (
                                <tr key={stu.Student_Global_ID || stu.Student_ID || stu.id || idx}>
                                  <td className="py-2 px-3 border border-slate-300 text-center font-bold">{idx + 1}</td>
                                  <td className="py-2 px-3 border border-slate-300 text-right font-bold text-slate-800">
                                    {displayName}
                                  </td>
                                  <td className="py-2 px-3 border border-slate-300 text-center">{gender}</td>
                                  <td className="py-2 px-3 border border-slate-300 text-center">{religion}</td>
                                  <td className="py-2 px-3 border border-slate-300 text-center">{statusText || '—'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : selectedReportId === PARENTS_LIST_REPORT_ID ? (
                  <div className="space-y-4" dir="rtl">
                    <div className="text-center space-y-1">
                      <h3 className="text-2xl font-black text-slate-900">قائمة أولياء الأمور</h3>
                      <p className="text-sm font-bold text-slate-600">
                        {academicYearLabel || '—'}
                      </p>
                    </div>
                    <table className="w-full border-collapse border border-slate-300 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="py-2 px-3 border border-slate-300 text-center">كود ولي الأمر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">اسم ولي الأمر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">الرقم القومي</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">رقم الموبايل</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">عدد الأبناء</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">أكواد الأبناء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parentsRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-4 px-3 text-center text-slate-500 font-bold">
                              {isRtl ? 'لا توجد بيانات أولياء أمور بعد تطبيق الفلاتر.' : 'No guardians found.'}
                            </td>
                          </tr>
                        ) : (
                          parentsRows.map((p) => (
                            <tr key={p.id} className="odd:bg-white even:bg-slate-50">
                              <td className="py-2 px-3 border border-slate-300 text-center font-black">{p.id || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-right font-black text-slate-800">
                                {p.name || '—'}
                                {p.childrenNames.length > 0 && (
                                  <div className="text-[11px] text-slate-500 font-bold mt-1">
                                    {p.childrenNames.join(', ')}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{p.nationalId || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{p.mobile || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{p.childrenIds.length}</td>
                              <td className="py-2 px-3 border border-slate-300 text-right text-[11px]">
                                {p.childrenIds.join(', ') || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : sortedStudents.length === 0 ? (
                  <p className="text-slate-400 font-bold italic">-- {isRtl ? 'لا توجد بيانات طلاب' : 'No students data'} --</p>
                ) : (
                  selectedReportId === 'STU-12D' ? (
                    <table className="w-full border-collapse border border-slate-300 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="py-2 px-3 border border-slate-300 text-start">الاسم</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">المرحلة</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">الصف</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">الرقم القومي</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">تاريخ الميلاد</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">النوع</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">تاريخ الالتحاق</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">السن في أكتوبر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">الحالة</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">الديانة</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">ولي الأمر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">تاريخ ميلاد ولي الأمر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">وظيفة ولي الأمر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">عنوان ولي الأمر</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">هاتف ولي الأمر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((stu: any) => {
                          const displayName =
                            activeSettings.normalizeNames
                              ? normalizeName(stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—')
                              : stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—';
                          const stageName =
                            stu.Stage_Name ||
                            store.stages?.find((st: any) => String(st.Stage_ID) === String(stu.Stage_ID))?.Stage_Name ||
                            '—';
                          const gradeName =
                            stu.Grade_Name ||
                            store.grades?.find((g: any) => String(g.Grade_ID) === String(stu.Grade_ID))?.Grade_Name ||
                            '—';
                          const guardian = stu.Father || stu.Guardian || stu.Parent || {};
                          const guardianName =
                            guardian.Name || guardian.Full_Name || stu.Guardian_Name || stu.Father_Name || '—';
                          const guardianDob = guardian.DOB || guardian.Birth_Date || '—';
                          const guardianJob = guardian.Job || guardian.Occupation || '—';
                          const guardianAddress = guardian.Address || guardian.address || '—';
                          const guardianPhone =
                            guardian.Mobile ||
                            guardian.Phone ||
                            guardian.WhatsApp ||
                            stu.Guardian_Phone ||
                            stu.Guardian_Mobile ||
                            '—';
                          const religion = stu.Religion || stu.religion || '—';
                          const joinDate = stu.Join_Date || stu.joinDate || stu.Enroll_Date || '—';
                          const ageOct =
                            stu.Age_In_Oct ||
                            stu.ageOnOct1 ||
                            '—';

                          return (
                            <tr key={stu.Student_Global_ID || stu.Student_ID || stu.id}>
                              <td className="py-2 px-3 border border-slate-300 font-bold text-slate-800">{displayName}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{stageName}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{gradeName}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{stu.National_ID || stu.nationalId || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{stu.Birth_Date || stu.birthDate || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{stu.Gender || stu.gender || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{joinDate}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{ageOct}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{stu.Status || stu.Student_Status || '—'}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{religion}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{guardianName}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{guardianDob}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{guardianJob}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{guardianAddress}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{guardianPhone}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : selectedReportId === 'STU-TRANSFER' ? (
                    <table className="w-full border-collapse border border-slate-300 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="py-2 px-3 border border-slate-300 text-start">اسم الطالب</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">الصف</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">المدرسة المحول منها</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">المدرسة المحول إليها</th>
                          <th className="py-2 px-3 border border-slate-300 text-center">تاريخ التحويل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((stu: any) => {
                          const displayName =
                            activeSettings.normalizeNames
                              ? normalizeName(stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—')
                              : stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—';
                          const gradeName =
                            stu.Grade_Name ||
                            store.grades?.find((g: any) => String(g.Grade_ID) === String(stu.Grade_ID))?.Grade_Name ||
                            '—';
                          const fromSchool = stu.Transfer_From || stu.From_School || stu.Previous_School || '—';
                          const toSchool = stu.Transfer_To || stu.To_School || activeSchool?.School_Name || '—';
                          const transferDate = stu.Transfer_Date || stu.transferDate || '—';
                          return (
                            <tr key={stu.Student_Global_ID || stu.Student_ID || stu.id}>
                              <td className="py-2 px-3 border border-slate-300 font-bold text-slate-800">{displayName}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{gradeName}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{fromSchool}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{toSchool}</td>
                              <td className="py-2 px-3 border border-slate-300 text-center">{transferDate}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full border-collapse border border-slate-300 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="py-2 px-4 border border-slate-300 text-start">{isRtl ? 'اسم الطالب' : 'Student Name'}</th>
                          <th className="py-2 px-4 border border-slate-300 text-center">{isRtl ? 'الصف' : 'Grade'}</th>
                          <th className="py-2 px-4 border border-slate-300 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((stu: any) => {
                          const displayName =
                            activeSettings.normalizeNames
                              ? normalizeName(stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—')
                              : stu.Name_Ar || stu.Student_FullName || stu.Full_Name || stu.name || '—';
                          return (
                            <tr key={stu.Student_Global_ID || stu.Student_ID || stu.id}>
                              <td className="py-3 px-4 border border-slate-300 font-bold text-slate-800">
                                {displayName}
                              </td>
                              <td className="py-3 px-4 border border-slate-300 text-center">
                                {stu.Level ||
                                  stu.Grade_Name ||
                                  store.grades?.find((g: any) => String(g.Grade_ID) === String(stu.Grade_ID))?.Grade_Name ||
                                  '—'}
                              </td>
                              <td className="py-3 px-4 border border-slate-300 text-center text-green-600 font-black">
                                {stu.Status || 'ENROLLED'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </SignatureReportLayout>
          </div>
        </div>
      )}

      {/* نافذة الإعدادات الموحدة */}
      {settingsReportId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-800">إعدادات الطباعة</h4>
              <button
                onClick={() => setSettingsReportId(null)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>
              <div className="grid grid-cols-2 gap-3" dir="rtl">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">مقاس الورق</label>
                <select
                  value={reportSettings.paperSize}
                  onChange={(e) => setReportSettings((p) => ({ ...p, paperSize: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">اتجاه الصفحة</label>
                <select
                  value={reportSettings.orientation}
                  onChange={(e) => setReportSettings((p) => ({ ...p, orientation: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="portrait">طولي</option>
                  <option value="landscape">عرضي</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">نوع الخط</label>
                <select
                  value={reportSettings.font}
                  onChange={(e) => setReportSettings((p) => ({ ...p, font: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">حجم الخط</label>
                <input
                  type="number"
                  min={8}
                  max={20}
                  value={reportSettings.fontSize}
                  onChange={(e) => setReportSettings((p) => ({ ...p, fontSize: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ارتفاع السطر</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={3}
                  value={reportSettings.lineHeight}
                  onChange={(e) => setReportSettings((p) => ({ ...p, lineHeight: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">الهوامش (مم)</label>
                <input
                  type="number"
                  min={5}
                  max={25}
                  value={reportSettings.margin}
                  onChange={(e) => setReportSettings((p) => ({ ...p, margin: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ترتيب الطلاب</label>
                <select
                  value={reportSettings.sortMode}
                  onChange={(e) => setReportSettings((p) => ({ ...p, sortMode: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="default">ترتيب افتراضي</option>
                  <option value="gender">بنون ثم بنات</option>
                  <option value="name">أبجدي</option>
                  <option value="age_desc">العمر من الأكبر للأصغر</option>
                  <option value="age_asc">العمر من الأصغر للأكبر</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportSettings.normalizeNames}
                    onChange={(e) => setReportSettings((p) => ({ ...p, normalizeNames: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  تصحيح الأسماء (الهمزات/الياء/المسافات)
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSettingsReportId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-sm"
              >
                حفظ
              </button>
            </div>
            {settingsReportId === ENROLL_CERT_REPORT_ID && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100" dir="rtl">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">حجم عنوان التقرير</label>
                  <input
                    type="number"
                    min={16}
                    max={32}
                    value={reportSettings.titleFontSize}
                    onChange={(e) => setReportSettings((p) => ({ ...p, titleFontSize: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">حجم نص الإفادة</label>
                  <input
                    type="number"
                    min={12}
                    max={20}
                    value={reportSettings.bodyFontSize}
                    onChange={(e) => setReportSettings((p) => ({ ...p, bodyFontSize: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">حجم التوقيع</label>
                  <input
                    type="number"
                    min={10}
                    max={18}
                    value={reportSettings.signatureFontSize}
                    onChange={(e) => setReportSettings((p) => ({ ...p, signatureFontSize: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <PrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        settings={tempPrintSettings}
        onChange={setTempPrintSettings}
        onPrint={applyTempPrint}
        preview={
          <SignatureReportLayout
            reportTitle={isRtl ? (selectedReport?.Title_Ar || 'تقرير') : (selectedReport?.Title_En || 'Report')}
            activeSchool={activeSchool}
            reportConfig={studentReportConfig}
            lang={lang}
            printOverrides={{
              paperSize: tempPrintSettings.paperSize,
              orientation: tempPrintSettings.orientation,
              marginTop: tempPrintSettings.margins.top,
              marginRight: tempPrintSettings.margins.right,
              marginBottom: tempPrintSettings.margins.bottom,
              marginLeft: tempPrintSettings.margins.left,
              scale: tempPrintSettings.scale,
              fontFamily: tempPrintSettings.fontFamily,
              fontSize: tempPrintSettings.fontSize
            }}
          >
            {selectedReportId === TRANSFER_REQUEST_REPORT_ID
              ? renderTransferTablePreview(tempPrintSettings)
              : selectedReportId === PARENTS_LIST_REPORT_ID
              ? renderParentsPreview(tempPrintSettings)
              : (
                <div className="text-center text-slate-500 font-bold py-10">
                  {isRtl ? 'المعاينة متاحة لتقرير تحويل الطالب فقط هنا.' : 'Preview shown for Transfer Request report.'}
                </div>
              )}
          </SignatureReportLayout>
        }
      />
    </div>
  );
};

export default StudentReportsTab;
