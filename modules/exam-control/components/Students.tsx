
import React, { useState, useRef, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, Save, X, Upload, Download, FileSpreadsheet, Filter, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle, Wand2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Stage, GradeLevel, GRADE_LABELS } from '../examControl.types';

interface StudentsProps {
  students: Student[];
  onUpdate: (students: Student[]) => void;
  externalMode?: boolean;
  externalStudents?: Student[];
}

type SortKey = 'name' | 'gender' | 'religion' | 'classroom' | 'seatingNumber' | 'birthDate' | 'enrollmentStatus';
type SortDirection = 'asc' | 'desc';
type SortMode = 'name' | 'boys' | 'girls';

const Students: React.FC<StudentsProps> = ({ students, onUpdate, externalMode = false, externalStudents = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Custom Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all'); 
  const [importStage, setImportStage] = useState<Stage | 'all'>('all');
  const [importGrade, setImportGrade] = useState<GradeLevel | 'all'>('all');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting State with Persistence
  const [sortMode, setSortMode] = useState<SortMode>(() => {
      const saved = localStorage.getItem('app_student_sort_mode');
      return (saved as SortMode) || 'name';
  });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>(() => {
      const saved = localStorage.getItem('app_student_sort_mode');
      if (saved === 'boys') return { key: 'gender', direction: 'desc' };
      if (saved === 'girls') return { key: 'gender', direction: 'asc' };
      return { key: 'name', direction: 'asc' };
  });

  const handleSortModeChange = (mode: SortMode) => {
      setSortMode(mode);
      localStorage.setItem('app_student_sort_mode', mode);

      if (mode === 'name') {
        setSortConfig({ key: 'name', direction: 'asc' });
      } else if (mode === 'boys') {
        setSortConfig({ key: 'gender', direction: 'desc' });
      } else if (mode === 'girls') {
         setSortConfig({ key: 'gender', direction: 'asc' });
      }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({ 
    stage: 'primary', 
    gradeLevel: 'p1',
    enrollmentStatus: 'مستجد',
    gender: 'ذكر',
    religion: 'مسلم',
    isIntegration: false
  });

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleImportFromEnrolled = () => {
    if (!externalMode) return;
    if (!externalStudents.length) {
      alert('لا توجد بيانات طلاب متاحة للربط.');
      return;
    }
    const filtered = externalStudents.filter((student) => {
      const matchesStage = importStage === 'all' || student.stage === importStage;
      const matchesGrade = importGrade === 'all' || student.gradeLevel === importGrade;
      return matchesStage && matchesGrade;
    });
    if (!filtered.length) {
      alert('لا توجد طلاب مطابقة للفلاتر المحددة.');
      return;
    }
    const currentMap = new Map(students.map((student) => [student.id, student]));
    const merged = filtered.map((student) => {
      const current = currentMap.get(student.id);
      if (!current) return student;
      return {
        ...student,
        seatingNumber: current.seatingNumber ?? student.seatingNumber,
        secretNumberTerm1: current.secretNumberTerm1 ?? student.secretNumberTerm1,
        secretNumberTerm2: current.secretNumberTerm2 ?? student.secretNumberTerm2,
        secretNumberSecondRole: current.secretNumberSecondRole ?? student.secretNumberSecondRole,
        committeeId: current.committeeId ?? student.committeeId,
        committeeIdSecondRole: current.committeeIdSecondRole ?? student.committeeIdSecondRole,
        enrollmentStatus: current.enrollmentStatus ?? student.enrollmentStatus,
        isIntegration: current.isIntegration ?? false
      };
    });
    onUpdate(merged);
    alert(`تم جلب ${merged.length} طالب بنجاح.`);
  };

  // Helper to extract Gender and DOB from Egyptian National ID
  const extractInfoFromId = (id: string) => {
    if (!id || id.length !== 14) return null;
    
    // C YY MM DD SS G N Z
    const century = parseInt(id[0]);
    const year = parseInt(id.substring(1, 3));
    const month = parseInt(id.substring(3, 5));
    const day = parseInt(id.substring(5, 7));
    const genderDigit = parseInt(id.substring(12, 13));

    if (isNaN(century) || isNaN(year) || isNaN(month) || isNaN(day) || isNaN(genderDigit)) return null;

    const fullYear = (century === 2 ? 1900 : 2000) + year;
    const gender: 'ذكر' | 'أنثى' = genderDigit % 2 !== 0 ? 'ذكر' : 'أنثى';
    const birthDate = `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    return { gender, birthDate };
  };

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const updates: any = { nationalId: val };
    
    const info = extractInfoFromId(updates.nationalId);
    if (info) {
        updates.gender = info.gender;
        updates.birthDate = info.birthDate;
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // --- NAME NORMALIZATION LOGIC ---
  const normalizeArabicName = (name: string) => {
    if (!name) return "";
    return name
        .trim()
        .replace(/\s+/g, " ") // توحيد المسافات (إزالة المسافات المزدوجة)
        .replace(/[أإآ]/g, "ا") // حذف الهمزات من الألف
        .replace(/ؤ/g, "و") // توحيد الواو المهموزة
        .replace(/ئ/g, "ي") // توحيد الياء المهموزة
        .replace(/ة/g, "ه") // توحيد التاء المربوطة والهاء (أو العكس حسب التفضيل)
        .replace(/ى/g, "ي"); // توحيد الياء والألف المقصورة
  };

  const handleBulkNormalizeNames = () => {
    if (students.length === 0) return;

    setConfirmDialog({
        isOpen: true,
        title: 'ضبط وتصحيح الأسماء',
        message: 'سيتم تعديل أسماء جميع الطلاب لتصحيح الهمزات، الياء، التاء المربوطة، وحذف المسافات الزائدة.\n\nهذا الإجراء يساعد في دقة الترتيب الأبجدي ومنع الأخطاء.\nهل تريد الاستمرار؟',
        action: () => {
            const updatedStudents = students.map(s => ({
                ...s,
                name: normalizeArabicName(s.name)
            }));
            onUpdate(updatedStudents);
            closeConfirm();
            alert("تم ضبط وتصحيح أسماء الطلاب بنجاح.");
        }
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.classroom || !formData.nationalId || !formData.gradeLevel) {
      alert("يرجى ملء البيانات الأساسية بما في ذلك الصف الدراسي");
      return;
    }

    if (formData.id) {
      // Edit
      const updated = students.map(s => s.id === formData.id ? { ...s, ...formData } as Student : s);
      onUpdate(updated);
    } else {
      // Add
      const newStudent: Student = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        nationalId: formData.nationalId,
        classroom: formData.classroom,
        stage: formData.stage || 'primary',
        gradeLevel: formData.gradeLevel as GradeLevel,
        seatingNumber: null,
        secretNumberTerm1: null,
        secretNumberTerm2: null,
        // Fix: Add missing secretNumberSecondRole property required by Student type
        secretNumberSecondRole: null,
        gender: formData.gender as 'ذكر' | 'أنثى',
        religion: formData.religion as 'مسلم' | 'مسيحي',
        birthDate: formData.birthDate,
        enrollmentStatus: formData.enrollmentStatus as any || 'مستجد',
        isIntegration: formData.isIntegration || false
      };
      onUpdate([...students, newStudent]);
    }
    closeModal();
  };

  // --- ACTIONS ---

  const requestDelete = (id: string) => {
    setConfirmDialog({
        isOpen: true,
        title: 'حذف طالب',
        message: 'هل أنت متأكد من حذف هذا الطالب؟\nسيتم حذف جميع البيانات والدرجات المرتبطة به نهائياً.',
        action: () => {
            const newStudents = students.filter(s => s.id !== id);
            onUpdate(newStudents);
            if (selectedIds.has(id)) {
                const newSet = new Set(selectedIds);
                newSet.delete(id);
                setSelectedIds(newSet);
            }
            closeConfirm();
        }
    });
  };

  const requestDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    setConfirmDialog({
        isOpen: true,
        title: 'حذف متعدد',
        message: `هل أنت متأكد من حذف (${count}) طالب تم تحديدهم؟\nلا يمكن التراجع عن هذا الإجراء.`,
        action: () => {
            const newStudents = students.filter(s => !selectedIds.has(s.id));
            onUpdate(newStudents);
            setSelectedIds(new Set());
            closeConfirm();
        }
    });
  };

  const requestBulkDelete = () => {
    const targetLabel = filterGrade === 'all' ? 'جميع الطلاب في المدرسة' : `طلاب ${GRADE_LABELS[filterGrade]}`;
    const targetCount = filterGrade === 'all' 
        ? students.length 
        : students.filter(s => s.gradeLevel === filterGrade).length;

    if (targetCount === 0) {
        alert("لا يوجد طلاب لحذفهم.");
        return;
    }

    setConfirmDialog({
        isOpen: true,
        title: 'حذف جماعي خطير!',
        message: `أنت على وشك حذف ${targetCount} طالب (${targetLabel}).\n\nسيتم مسح كافة البيانات والدرجات وأرقام الجلوس.\nهل أنت متأكد تماماً؟`,
        action: () => {
            const remainingStudents = filterGrade === 'all'
                ? []
                : students.filter(s => s.gradeLevel !== filterGrade);
            
            onUpdate(remainingStudents);
            setSelectedIds(new Set());
            closeConfirm();
        }
    });
  };
  
  const handleClearSelection = () => {
      setSelectedIds(new Set());
  };

  const openModal = (student?: Student) => {
    if (student) {
      setFormData(student);
    } else {
      const defaultGrade: GradeLevel = filterGrade !== 'all' ? filterGrade : 'p1';
      const defaultStage: Stage = ['p1','p2','p3','p4','p5','p6'].includes(defaultGrade) ? 'primary' : 'preparatory';
      
      setFormData({ 
        name: '', 
        nationalId: '', 
        classroom: '', 
        stage: defaultStage, 
        gradeLevel: defaultGrade,
        enrollmentStatus: 'مستجد',
        gender: 'ذكر',
        religion: 'مسلم',
        isIntegration: false
      });
    }
    setIsModalOpen(true);
  };

  const getAvailableGrades = (stage: Stage) => {
    if (stage === 'primary') return ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    return ['m1', 'm2', 'm3'];
  };

  // Sorting Handler
  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const matchesSearch = s.name.includes(searchTerm) || 
      s.nationalId.includes(searchTerm) ||
      s.classroom.includes(searchTerm) ||
      (s.seatingNumber && s.seatingNumber.toString().includes(searchTerm));

      const matchesGrade = filterGrade === 'all' || s.gradeLevel === filterGrade;

      return matchesSearch && matchesGrade;
    });

    result.sort((a, b) => {
      const key = sortConfig.key;
      let aVal: any = a[key];
      let bVal: any = b[key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      let comparison = 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, 'ar');
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal), 'ar');
      }

      if (sortConfig.direction === 'desc') comparison *= -1;

      if (comparison === 0 && key !== 'name') {
        return a.name.localeCompare(b.name, 'ar');
      }

      return comparison;
    });

    return result;
  }, [students, searchTerm, filterGrade, sortConfig]);

  // Selection Logic
  const toggleSelectAll = () => {
      const allIds = filteredStudents.map(s => s.id);
      const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
      
      const newSet = new Set(selectedIds);
      if (allSelected) {
          allIds.forEach(id => newSet.delete(id));
      } else {
          allIds.forEach(id => newSet.add(id));
      }
      setSelectedIds(newSet);
  };

  const toggleSelectRow = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  // --- EXCEL EXPORT ---
  const handleExport = () => {
    const dataToExport = filteredStudents.map(s => ({
      'الاسم': s.name,
      'الرقم القومي': s.nationalId,
      'النوع': s.gender || '-',
      'الديانة': s.religion || 'مسلم',
      'تاريخ الميلاد': s.birthDate || '-',
      'حالة القيد': s.enrollmentStatus || 'مستجد',
      'الفصل': s.classroom,
      'الصف': GRADE_LABELS[s.gradeLevel],
      'رقم الجلوس': s.seatingNumber || 'غير محدد',
      'دمج': s.isIntegration ? 'نعم' : 'لا'
    }));

    const fileName = filterGrade !== 'all' ? `طلاب_${GRADE_LABELS[filterGrade]}.xlsx` : "قائمة_الطلاب.xlsx";
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    XLSX.writeFile(wb, fileName);
  };

  // --- EXCEL IMPORT ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        const newStudents: Student[] = data.map((row: any) => {
            let detectedStage: Stage = 'primary';
            let detectedGrade: GradeLevel = filterGrade !== 'all' ? filterGrade : 'p1';

            if (['m1', 'm2', 'm3'].includes(detectedGrade)) {
              detectedStage = 'preparatory';
            }
            
            const nationalId = row['الرقم القومي'] || row['NationalID'] || '';
            const extracted = extractInfoFromId(nationalId.toString());
            
            // Integration Logic
            const integrationVal = row['دمج'] || row['Integration'] || '';
            const isIntegration = integrationVal === 'نعم' || integrationVal === true || integrationVal === 'true';

            return {
                id: Math.random().toString(36).substr(2, 9),
                name: row['الاسم'] || row['Name'] || 'بدون اسم',
                nationalId: nationalId,
                classroom: row['الفصل'] || row['Classroom'] || 'غير محدد',
                stage: detectedStage, 
                gradeLevel: detectedGrade,
                seatingNumber: null,
                secretNumberTerm1: null,
                secretNumberTerm2: null,
                // Fix: Add missing secretNumberSecondRole property required by Student type
                secretNumberSecondRole: null,
                gender: extracted?.gender || row['النوع'] || 'ذكر',
                religion: row['الديانة'] || row['Religion'] || 'مسلم',
                birthDate: extracted?.birthDate || row['تاريخ الميلاد'] || '',
                enrollmentStatus: row['حالة القيد'] || 'مستجد',
                isIntegration: isIntegration
            };
        });

        if (newStudents.length > 0) {
            onUpdate([...students, ...newStudents]);
            alert(`تم استيراد ${newStudents.length} طالب بنجاح في (${GRADE_LABELS[filterGrade !== 'all' ? filterGrade : 'p1']})`);
        }
      } catch (error) {
        console.error(error);
        alert("خطأ في قراءة الملف.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 relative">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">إدارة الطلاب</h2>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {selectedIds.size > 0 && !externalMode && (
                <>
                    <button 
                        type="button" 
                        onClick={requestDeleteSelected} 
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition font-bold shadow-sm"
                    >
                        <Trash2 size={16} /> <span className="hidden sm:inline">حذف المحدد</span> ({selectedIds.size})
                    </button>
                    <button 
                        type="button" 
                        onClick={handleClearSelection} 
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm transition font-medium"
                    >
                        <X size={16} /> <span className="hidden sm:inline">إلغاء</span>
                    </button>
                </>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx, .xls"
            />
            {externalMode && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <select
                  value={importStage}
                  onChange={(e) => setImportStage(e.target.value as Stage | 'all')}
                  className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 text-sm font-medium"
                >
                  <option value="all">كل المراحل</option>
                  <option value="primary">الابتدائي</option>
                  <option value="preparatory">الإعدادي</option>
                </select>
                <select
                  value={importGrade}
                  onChange={(e) => setImportGrade(e.target.value as GradeLevel | 'all')}
                  className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 text-sm font-medium"
                >
                  <option value="all">كل الصفوف</option>
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((grade) => (
                    <option key={grade} value={grade}>{GRADE_LABELS[grade]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleImportFromEnrolled}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition font-bold"
                >
                  جلب الطلاب
                </button>
              </div>
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition flex-1 sm:flex-none justify-center">
              <Upload size={16} /> استيراد
            </button>
            <button type="button" onClick={handleExport} className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition flex-1 sm:flex-none justify-center">
              <Download size={16} /> تصدير
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2 hidden sm:block"></div>

            <button type="button" onClick={handleBulkNormalizeNames} className="bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition flex-1 sm:flex-none justify-center font-bold" title="ضبط الهمزات والمسافات والتاء والياء">
              <Wand2 size={16} /> ضبط الأسماء
            </button>

            {!externalMode && (
              <>
                <button type="button" onClick={requestBulkDelete} className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition flex-1 sm:flex-none justify-center">
                  <Trash2 size={16} /> <span className="hidden sm:inline">{filterGrade === 'all' ? 'حذف الجميع' : 'حذف كل الصف'}</span><span className="sm:hidden">حذف</span>
                </button>
                <button type="button" onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition shadow-lg shadow-blue-200 flex-1 sm:flex-none justify-center">
                  <Plus size={16} /> طالب جديد
                </button>
              </>
            )}
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Filter size={20} className="text-gray-400" />
                <select 
                    value={filterGrade} 
                    onChange={(e) => setFilterGrade(e.target.value as GradeLevel | 'all')}
                    className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-700 font-medium focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                >
                    <option value="all">عرض كل الصفوف</option>
                    {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => (
                        <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex items-center bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
                <button 
                  onClick={() => handleSortModeChange('name')} 
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition ${sortMode === 'name' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  أبجدي
                </button>
                <button 
                  onClick={() => handleSortModeChange('boys')} 
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition ${sortMode === 'boys' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  بنون
                </button>
                <button 
                  onClick={() => handleSortModeChange('girls')} 
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition ${sortMode === 'girls' ? 'bg-white shadow text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  بنات
                </button>
            </div>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="بحث بالاسم، الرقم القومي، الفصل..." 
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 w-10 text-center">
                    <input 
                        type="checkbox"
                        checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id))}
                        onChange={toggleSelectAll}
                        disabled={externalMode}
                        className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${externalMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    />
                </th>
                <SortableHeader label="الاسم" colKey="name" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="النوع" colKey="gender" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="الديانة" colKey="religion" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="تاريخ الميلاد" colKey="birthDate" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="حالة القيد" colKey="enrollmentStatus" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="الفصل" colKey="classroom" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="جلوس" colKey="seatingNumber" currentSort={sortConfig} onSort={handleSort} />
                <th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-gray-50 transition duration-150 ${selectedIds.has(student.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleSelectRow(student.id)} 
                  >
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox"
                            checked={selectedIds.has(student.id)}
                            onChange={() => toggleSelectRow(student.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </td>
                    <td className="p-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                            {student.name}
                            {!externalMode && student.isIntegration && (
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded border border-indigo-200 font-bold whitespace-nowrap">دمج</span>
                            )}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{student.nationalId}</div>
                        <div className="text-[10px] text-blue-600 font-bold mt-1">{GRADE_LABELS[student.gradeLevel]}</div>
                    </td>
                    <td className="p-4 text-gray-600">{student.gender || '-'}</td>
                    <td className="p-4 text-gray-600">{student.religion || 'مسلم'}</td>
                    <td className="p-4 text-gray-600 font-mono text-sm">{student.birthDate || '-'}</td>
                    <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${student.enrollmentStatus === 'باق' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                           {student.enrollmentStatus || 'مستجد'}
                        </span>
                    </td>
                    <td className="p-4 text-gray-600"><span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{student.classroom}</span></td>
                    <td className="p-4 text-gray-600 font-mono">
                      {student.seatingNumber ? <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">{student.seatingNumber}</span> : '-'}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openModal(student); }} 
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"
                            title="تعديل"
                        >
                            <Edit2 size={18} />
                        </button>
                        {!externalMode && (
                          <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); requestDelete(student.id); }} 
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                              title="حذف"
                          >
                              <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                    <FileSpreadsheet className="text-gray-300 mb-4" size={48} />
                    <p className="text-lg font-medium">لا توجد بيانات {filterGrade !== 'all' ? `لـ ${GRADE_LABELS[filterGrade]}` : ''}</p>
                    <p className="text-sm text-gray-400 mt-2">ابدأ بإضافة طلاب جدد أو استيراد ملف Excel</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmDialog.title}</h3>
                    <p className="text-gray-600 whitespace-pre-line mb-6">{confirmDialog.message}</p>
                    
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={closeConfirm}
                            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            إلغاء
                        </button>
                        <button 
                            onClick={confirmDialog.action}
                            className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
                        >
                            تأكيد التنفيذ
                        </button>
                    </div>
                </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg text-gray-800">{formData.id ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}</h3>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-red-500 transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={externalMode}
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition ${externalMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  placeholder="الاسم رباعي"
                />
              </div>

              <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">الرقم القومي (14 رقم)</label>
                    <input 
                    type="text" 
                    maxLength={14}
                    value={formData.nationalId || ''} 
                    onChange={handleNationalIdChange}
                    disabled={externalMode}
                    className={`w-full border rounded-lg p-2.5 font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition ${externalMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="الرقم القومي"
                    />
                    <p className="text-xs text-gray-400 mt-1">يتم استنتاج النوع وتاريخ الميلاد تلقائياً</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">الديانة</label>
                    <select
                        value={formData.religion || 'مسلم'}
                        onChange={e => setFormData({...formData, religion: e.target.value as any})}
                        disabled={externalMode}
                        className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    >
                        <option value="مسلم">مسلم</option>
                        <option value="مسيحي">مسيحي</option>
                    </select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                    <select
                        value={formData.gender || 'ذكر'}
                        onChange={e => setFormData({...formData, gender: e.target.value as any})}
                        disabled={externalMode}
                        className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    >
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
                    <input 
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={e => setFormData({...formData, birthDate: e.target.value})}
                        disabled={externalMode}
                        className={`w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المرحلة</label>
                    <select
                        value={formData.stage || 'primary'}
                        onChange={e => {
                          const newStage = e.target.value as Stage;
                          setFormData({
                            ...formData, 
                            stage: newStage,
                            gradeLevel: newStage === 'primary' ? 'p1' : 'm1'
                          });
                        }}
                        disabled={externalMode}
                        className={`w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    >
                        <option value="primary">الابتدائية</option>
                        <option value="preparatory">الإعدادية</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الصف الدراسي</label>
                    <select
                        value={formData.gradeLevel || (formData.stage === 'primary' ? 'p1' : 'm1')}
                        onChange={e => setFormData({...formData, gradeLevel: e.target.value as GradeLevel})}
                        disabled={externalMode}
                        className={`w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    >
                        {getAvailableGrades(formData.stage || 'primary').map(g => (
                          <option key={g} value={g}>{GRADE_LABELS[g as GradeLevel]}</option>
                        ))}
                    </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفصل</label>
                  <input
                      type="text"
                      value={formData.classroom || ''} 
                      onChange={e => setFormData({...formData, classroom: e.target.value})}
                      disabled={externalMode}
                      className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                      placeholder="مثلاً: 1/أ"
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">حالة القيد</label>
                    <select
                        value={formData.enrollmentStatus || 'مستجد'}
                        onChange={e => setFormData({...formData, enrollmentStatus: e.target.value as any})}
                        disabled={externalMode}
                        className={`w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none ${externalMode ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    >
                        <option value="مستجد">مستجد</option>
                        <option value="باق">باق للإعادة</option>
                        <option value="وافد">وافد</option>
                    </select>
                </div>
              </div>

              {/* Integration Checkbox */}
              {!externalMode && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition" onClick={() => setFormData(prev => ({ ...prev, isIntegration: !prev.isIntegration }))}>
                    <input 
                        type="checkbox" 
                        checked={formData.isIntegration || false}
                        onChange={(e) => setFormData({...formData, isIntegration: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                        <span className="font-bold text-indigo-800 text-sm block">طالب دمج</span>
                        <span className="text-xs text-indigo-600 block mt-0.5">تفعيل هذا الخيار للطالب ذوي الاحتياجات الخاصة (دمج)</span>
                    </div>
                </div>
              )}

            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 sticky bottom-0 border-t">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition font-medium">إلغاء</button>
              <button type="button" onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition shadow-md shadow-blue-200 font-bold">
                <Save size={18} /> حفظ البيانات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Extracted Header Component for cleaner code
const SortableHeader = ({ label, colKey, currentSort, onSort }: { label: string, colKey: any, currentSort: any, onSort: any }) => (
    <th 
      className="p-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition select-none"
      onClick={() => onSort(colKey)}
    >
      <div className="flex items-center gap-1 group">
          {label} 
          <span className="text-gray-300 group-hover:text-blue-500 transition">
            {currentSort.key !== colKey ? <ArrowUpDown size={14} /> : (currentSort.direction === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />)}
          </span>
      </div>
    </th>
);

export default Students;
