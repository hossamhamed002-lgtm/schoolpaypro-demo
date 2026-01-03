
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Edit3, Trash2, X, GraduationCap, 
  FileDown, Upload, Fingerprint, Calendar,
  User, Heart, PlusCircle, Phone, 
  ChevronLeft, ChevronRight, CheckCircle2,
  ChevronLast, ChevronFirst, Eye, ShieldCheck, 
  Settings2, LayoutPanelLeft, Download, Mail, Briefcase, MessageCircle, AlertTriangle, MapPin, Info,
  Filter, FileSpreadsheet, EyeOff
} from 'lucide-react';
import * as XLSX from 'https://esm.sh/xlsx';
import { StudentMaster, StudentStatus, ParentData, Grade, Class as ClassType } from '../../types';
import AddStudentModal, { Student as StudentForm, StudentStatusOption } from './AddStudentModal';
import { processStudentImport } from './studentImportProcessor';

const StudentsListTab: React.FC<{ store: any, isTransferredMode?: boolean }> = ({ store, isTransferredMode }) => {
  const { t, lang, addStudent, updateStudent, importStudentsBatch, students, deleteStudent, deleteStudentsBatch, stages, grades, classes, activeYear, activeSchool } = store;
  const isRtl = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<StudentMaster | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- حالة التحديد الجماعي (STRICT PATCH) ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- إعدادات الترقيم (Pagination) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- حالات تخصيص البيانات ---
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    nid: true,
    level: true,
    guardian: true,
    actions: true
  });
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]); 
  }, [searchTerm, levelFilter, statusFilter]);

  const filtered = useMemo(() => {
    return students.filter((s: StudentMaster) => {
      const matchesSearch = s.Name_Ar.toLowerCase().includes(searchTerm.toLowerCase()) || s.National_ID.includes(searchTerm);
      const matchesLevel = !levelFilter || s.Level?.includes(levelFilter);
      let matchesStatus = true;
      if (isTransferredMode) {
        matchesStatus = s.Status === StudentStatus.DEPARTED;
      } else {
        const isNotDeparted = s.Status !== StudentStatus.DEPARTED;
        const matchesCustomFilter = !statusFilter || s.Status === statusFilter;
        matchesStatus = isNotDeparted && matchesCustomFilter;
      }
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [students, searchTerm, levelFilter, statusFilter, isTransferredMode]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // --- منطق الحذف الجماعي (STRICT PATCH) ---
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    
    const confirmMsg = isRtl 
      ? 'هل أنت متأكد من حذف الطلاب المحددين؟ لا يمكن التراجع عن هذا الإجراء.' 
      : 'Are you sure you want to delete the selected students? This action cannot be undone.';
      
    if (window.confirm(confirmMsg)) {
      deleteStudentsBatch(selectedIds);
      setSelectedIds([]);
      alert(isRtl ? 'تم حذف الطلاب المحددين بنجاح' : 'Selected students deleted successfully');
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedData.map(s => s.Student_Global_ID);
    const allOnPageSelected = currentPageIds.every(id => selectedIds.includes(id));
    
    if (allOnPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const isAllOnPageSelected = paginatedData.length > 0 && paginatedData.every(s => selectedIds.includes(s.Student_Global_ID));

  const handleExportToExcel = () => {
    if (filtered.length === 0) return;
    const dataToExport = filtered.map(s => ({
      [isRtl ? 'كود الطالب' : 'Student ID']: s.Student_Global_ID,
      [isRtl ? 'اسم الطالب' : 'Student Name']: s.Name_Ar,
      [isRtl ? 'الرقم القومي' : 'National ID']: s.National_ID,
      [isRtl ? 'الصف الدراسي' : 'Level']: s.Level,
      [isRtl ? 'الحالة' : 'Status']: s.Status
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `students_export.xlsx`);
  };

  const TEMPLATE_HEADERS = [
    'Name Ar',
    'Name En',
    'National ID',
    'Birth Date',
    'Gender',
    'Nationality',
    'Religion',
    'Place of Birth',
    'Grade',
    'Class',
    'Father Name',
    'Father National ID',
    'Father Job',
    'Father Mobile',
    'Father WhatsApp',
    'Father Email',
    'Father ID Type',
    'Father Nationality',
    'Father Address',
    'Mother Name',
    'Mother National ID',
    'Mother Job',
    'Mother Mobile',
    'Mother WhatsApp',
    'Mother Email',
    'Mother ID Type',
    'Mother Nationality'
  ] as const;

  const normalizeString = (value: unknown) => String(value ?? '').trim();

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Import Template');
    XLSX.writeFile(workbook, 'student_import_template.xlsx');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        alert(isRtl ? 'لا توجد أوراق بيانات داخل الملف.' : 'No worksheets found in the uploaded file.');
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as unknown[][];
      const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
      const headers = headerRow.map((cell) => normalizeString(cell));
      const headerIndex = new Map<string, number>();
      headers.forEach((header, index) => {
        if (header) headerIndex.set(header, index);
      });

      const missingHeaders = TEMPLATE_HEADERS.filter((header) => !headerIndex.has(header));
      if (missingHeaders.length > 0) {
        alert(
          isRtl
            ? `الملف المرفوع لا يحتوي على العناوين المطلوبة. العناوين الناقصة: ${missingHeaders.join('، ')}`
            : `The uploaded file is missing required headers: ${missingHeaders.join(', ')}`
        );
        return;
      }

      const dataRows = rows.slice(1).filter((row) => row.some((cell) => normalizeString(cell) !== ''));
      const rowObjects = dataRows.map((row) => {
        const record: Record<string, unknown> = {};
        headerRow.forEach((header, index) => {
          const key = normalizeString(header);
          if (key) record[key] = row[index];
        });
        return record;
      });

      const { validRecords, errors } = processStudentImport(rowObjects, {
        stages,
        grades,
        classes,
        activeYear,
        schoolId: normalizeString(activeSchool?.School_ID)
      });

      if (errors.length > 0) {
        const trimmed = errors.slice(0, 10).join('\n');
        alert(
          isRtl
            ? `تم العثور على أخطاء أثناء الاستيراد:\n${trimmed}${errors.length > 10 ? '\n...' : ''}`
            : `Import errors found:\n${trimmed}${errors.length > 10 ? '\n...' : ''}`
        );
      }

      const studentsToImport = validRecords;

      if (studentsToImport.length === 0) {
        alert(isRtl ? 'لا توجد بيانات صالحة للاستيراد.' : 'No valid rows found to import.');
        return;
      }

      importStudentsBatch(studentsToImport);
      alert(
        isRtl
          ? `تم استيراد ${studentsToImport.length} طالب/ة بنجاح.`
          : `Imported ${studentsToImport.length} students successfully.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : normalizeString(error);
      alert(
        isRtl
          ? `تعذر استيراد الملف. ${message}`
          : `Failed to import the file. ${message}`
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const statusMap: Record<StudentStatusOption, StudentStatus> = {
    'Enrolled (مقيد)': StudentStatus.ENROLLED,
    'New (مستجد)': StudentStatus.NEW,
    'Transferred In (محول)': StudentStatus.TRANSFERRED,
    'Transferred Out (منقول)': StudentStatus.DEPARTED,
    'Repeating (باق للإعادة)': StudentStatus.REPEATING
  };

  const mapStatusToOption = (status: StudentStatus): StudentStatusOption => {
    switch (status) {
      case StudentStatus.ENROLLED:
        return 'Enrolled (مقيد)';
      case StudentStatus.TRANSFERRED:
        return 'Transferred In (محول)';
      case StudentStatus.DEPARTED:
        return 'Transferred Out (منقول)';
      case StudentStatus.REPEATING:
        return 'Repeating (باق للإعادة)';
      case StudentStatus.NEW:
      default:
        return 'New (مستجد)';
    }
  };

  const buildParentPayload = (
    source: StudentForm['father'],
    prefix: string,
    existing?: ParentData
  ): ParentData => ({
    Parent_ID: existing?.Parent_ID ?? `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    Name: source.name,
    National_ID: source.nationalId,
    DOB: source.birthDate || '',
    Mobile: source.mobile || '',
    WhatsApp: source.whatsapp || '',
    Address: source.address || '',
    Job: source.job || '',
    Email: existing?.Email ?? '',
    ID_Type: existing?.ID_Type ?? '',
    Nationality: existing?.Nationality ?? ''
  });

  const buildStudentPayload = (values: StudentForm, existing?: StudentMaster) => {
    const grade = grades.find((g: Grade) => g.Grade_ID === values.gradeId);
    const klass = classes.find((c: ClassType) => c.Class_ID === values.classId);
    const levelParts = [grade?.Grade_Name, klass?.Class_Name].filter(Boolean);

    return {
      Name_Ar: values.name,
      Name_En: existing?.Name_En || '',
      Academic_Year_ID: activeYear?.Year_ID || existing?.Academic_Year_ID || '',
      National_ID: values.nationalId,
      DOB: values.birthDate,
      Age_In_Oct: values.ageOnOct1,
      Gender: values.gender,
      Status: statusMap[values.status],
      Gov_Code: values.governmentCode,
      Guardian_Phone: values.father.mobile || values.mother.mobile || '',
      Stage_ID: values.stageId,
      Grade_ID: values.gradeId,
      Class_ID: values.classId,
      Section: existing?.Section || 'Arabic',
      Level: levelParts.join(' - '),
      Father: buildParentPayload(values.father, 'FTH', existing?.Father),
      Mother: buildParentPayload(values.mother, 'MTH', existing?.Mother),
      Emergency_Phone: existing?.Emergency_Phone || '',
      Is_Integration: existing?.Is_Integration || false,
      Bus_Number: existing?.Bus_Number || '',
      Email: existing?.Email || '',
      Attachments: existing?.Attachments || []
    };
  };

  const mapStudentToForm = (student: StudentMaster): Partial<StudentForm> => ({
    stageId: student.Stage_ID || '',
    gradeId: student.Grade_ID || '',
    classId: student.Class_ID || '',
    name: student.Name_Ar || '',
    nationalId: student.National_ID || '',
    birthDate: student.DOB || '',
    gender: student.Gender || 'Male',
    ageOnOct1: student.Age_In_Oct || '',
    status: mapStatusToOption(student.Status),
    governmentCode: student.Gov_Code || '',
    father: {
      name: student.Father?.Name || '',
      nationalId: student.Father?.National_ID || '',
      birthDate: student.Father?.DOB || '',
      mobile: student.Father?.Mobile || '',
      whatsapp: student.Father?.WhatsApp || '',
      address: student.Father?.Address || '',
      job: student.Father?.Job || ''
    },
    mother: {
      name: student.Mother?.Name || '',
      nationalId: student.Mother?.National_ID || '',
      birthDate: student.Mother?.DOB || '',
      mobile: student.Mother?.Mobile || '',
      whatsapp: student.Mother?.WhatsApp || '',
      job: student.Mother?.Job || ''
    },
    attachments: [],
    notes: ''
  });

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700 text-start pb-20">
      
      <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6 relative z-50">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {!isTransferredMode && (
            <button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all">
              <Plus size={18} /> {t.registerStudent}
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all"
            >
              <Upload size={18} /> {isRtl ? 'استيراد / تحميل النموذج' : 'Import / Download Template'}
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all"
              title={isRtl ? 'تحميل نموذج الاستيراد' : 'Download import template'}
            >
              <Download size={18} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls" />
          </div>

          {/* زر الحذف الجماعي (STRICT PATCH) */}
          <button 
            disabled={selectedIds.length === 0}
            onClick={handleBatchDelete}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedIds.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-rose-600 text-white shadow-lg hover:bg-slate-900'}`}
          >
            <Trash2 size={18} /> {isRtl ? 'حذف الطلاب المحددين' : 'Delete Selected'}
          </button>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
             <button onClick={handleExportToExcel} className="p-2.5 text-indigo-600 hover:bg-white rounded-xl transition-all flex items-center gap-2">
                <FileSpreadsheet size={20} />
             </button>
             <button onClick={() => setIsCustomizeOpen(true)} className="p-2.5 text-indigo-700 hover:bg-white rounded-xl transition-all flex items-center gap-2">
                <Settings2 size={20} />
             </button>
          </div>
        </div>

        <div className="relative flex-1 max-w-xl w-full">
          <Search className={`absolute inset-y-0 ${isRtl ? 'right-5' : 'left-5'} my-auto text-slate-300`} size={20} />
          <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-transparent rounded-[1.5rem] pr-14 pl-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner" />
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar relative flex-1">
          <table className="w-full text-start border-collapse min-w-max">
            <thead className="sticky top-0 z-30 bg-slate-900 text-white">
              <tr>
                {/* عمود الاختيار (STRICT PATCH) */}
                <th className="px-4 py-6 text-center w-12">
                   <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" checked={isAllOnPageSelected} onChange={toggleSelectAll} />
                </th>
                {visibleColumns.name && <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'الاسم' : 'Name'}</th>}
                {visibleColumns.nid && <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'الرقم القومي' : 'National ID'}</th>}
                {visibleColumns.level && <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'المستوى' : 'Level'}</th>}
                {visibleColumns.guardian && <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'ولي الأمر' : 'Guardian'}</th>}
                {visibleColumns.actions && <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center bg-indigo-600">{t.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-bold text-slate-700 text-sm">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="py-32 text-center opacity-30 italic font-black text-xl">{isRtl ? 'لا توجد بيانات متاحة' : 'No data available'}</td></tr>
              ) : (
                paginatedData.map((stu: StudentMaster) => (
                  <tr key={stu.Student_Global_ID} className={`group hover:bg-slate-50 transition-all cursor-default ${selectedIds.includes(stu.Student_Global_ID) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-4 py-5 text-center">
                       <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" checked={selectedIds.includes(stu.Student_Global_ID)} onChange={() => toggleSelectRow(stu.Student_Global_ID)} />
                    </td>
                    {visibleColumns.name && <td className="px-8 py-5 text-slate-900 whitespace-nowrap" onClick={() => toggleSelectRow(stu.Student_Global_ID)}>{stu.Name_Ar}</td>}
                    {visibleColumns.nid && <td className="px-8 py-5 font-mono text-[13px] text-slate-400">{stu.National_ID}</td>}
                    {visibleColumns.level && <td className="px-8 py-5 whitespace-nowrap"><span className="bg-slate-100 px-3 py-1 rounded-xl text-xs">{stu.Level}</span></td>}
                    {visibleColumns.guardian && <td className="px-8 py-5 font-mono text-indigo-600 whitespace-nowrap">{stu.Father?.Mobile || '---'}</td>}
                    {visibleColumns.actions && (
                      <td className="px-8 py-5 text-center">
                         <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewStudent(stu)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Eye size={18} /></button>
                            {!isTransferredMode && <button onClick={() => { setEditingStudent(stu); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={18} /></button>}
                            {!isTransferredMode && <button onClick={() => { if(confirm(isRtl ? 'هل أنت متأكد من حذف هذا الطالب؟' : 'Are you sure you want to delete this student?')) deleteStudent(stu.Student_Global_ID); }} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={18} /></button>}
                         </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {isRtl ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
             </div>
             <div className="flex items-center gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-3 rounded-xl border transition-all bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-30"><ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} /></button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-3 rounded-xl border transition-all bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-30"><ChevronLeft size={18} className={isRtl ? '' : 'rotate-180'} /></button>
             </div>
          </div>
        )}
      </div>

      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={(values) => {
          const payload = buildStudentPayload(values, editingStudent || undefined);
          if (editingStudent) {
            updateStudent(editingStudent.Student_Global_ID, payload);
          } else {
            addStudent(payload);
          }
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        stages={stages}
        grades={grades}
        classes={classes}
        activeAcademicYear={activeYear}
        initialValues={editingStudent ? mapStudentToForm(editingStudent) : undefined}
        title={editingStudent ? (isRtl ? 'تعديل بيانات الطالب' : 'Edit Student') : t.registerStudent}
        subtitle={editingStudent ? (isRtl ? 'تحديث بيانات الطالب' : 'Update student record') : (isRtl ? 'تسجيل بيانات طالب جديد' : 'Register a new student record')}
        submitLabel={editingStudent ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'حفظ السجل' : 'Save Record')}
        existingStudents={students || []}
        currentStudentId={editingStudent?.Student_Global_ID}
      />

      {/* Customize Modal */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900">{isRtl ? 'تخصيص العرض' : 'Customize View'}</h3>
               <button onClick={() => setIsCustomizeOpen(false)}><X /></button>
            </div>
            <div className="space-y-6 text-start">
               <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الأعمدة الظاهرة</h4>
                 {Object.entries(visibleColumns).map(([key, val]) => (
                   <button key={key} onClick={() => setVisibleColumns(prev => ({...prev, [key]: !val}))} className={`w-full flex items-center justify-between p-4 rounded-xl border font-bold text-xs ${val ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>
                      <span>{key}</span> {val ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                   </button>
                 ))}
               </div>
               <button onClick={() => setIsCustomizeOpen(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase">تطبيق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsListTab;
