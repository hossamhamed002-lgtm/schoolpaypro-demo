import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Copy,
  Edit,
  FileSpreadsheet,
  Download,
  Upload,
  IdCard,
  Lock,
  Mail,
  Paperclip,
  Plus,
  Printer,
  Search,
  Trash2
} from 'lucide-react';
import AddStudentModal, { Student as StudentForm, StudentStatusOption } from './AddStudentModal';
import * as XLSX from 'xlsx';
import { StudentMaster, StudentStatus, ParentData, Grade, Class as ClassType } from '../../types';
import { processStudentImport } from './studentImportProcessor';

type StudentType = 'New' | 'Transfer';
type Status = 'Active' | 'Inactive';
type NotesCategory = 'ActionNeeded' | 'Clear';

interface StudentRow {
  id: string;
  serial: number;
  name: string;
  arabicName: string;
  fatherName: string;
  gender: 'Male' | 'Female';
  stage: string;
  grade: string;
  className: string;
  address: string;
  nationalId: string;
  fatherNationalId: string;
  fatherMobile: string;
  academicYear: string;
  academicYearId: string;
  studentType: StudentType;
  status: Status;
  notesCategory: NotesCategory;
  notes: string;
}

type ColumnFilters = {
  serial: string;
  code: string;
  userName: string;
  arabicName: string;
  fatherName: string;
  gender: string;
  stage: string;
  grade: string;
  className: string;
  address: string;
  nationalId: string;
  fatherNationalId: string;
  fatherMobile: string;
  status: string;
};

const initialColumnFilters: ColumnFilters = {
  serial: '',
  code: '',
  userName: '',
  arabicName: '',
  fatherName: '',
  gender: '',
  stage: '',
  grade: '',
  className: '',
  address: '',
  nationalId: '',
  fatherNationalId: '',
  fatherMobile: '',
  status: ''
};

type SelectionFilterOption = 'all' | 'selected' | 'unselected';
type NotesFilterOption = '' | NotesCategory;
type StudentTypeFilterOption = 'All' | StudentType;

const rowsPerPageOptions = [50, 100, 250, 500];

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

const TEMPLATE_HEADERS_ROW = [...TEMPLATE_HEADERS];

const normalizeString = (value: unknown) => String(value ?? '').trim();

const mockStudents: StudentRow[] = [
  {
    id: 'mock-1',
    serial: 1,
    name: 'Aaliyah Hassan',
    arabicName: 'عالية حسن',
    fatherName: 'Hassan Ibrahim',
    gender: 'Female',
    stage: 'Primary',
    grade: 'Grade 1',
    className: '1A',
    address: '17 Abbas El-Akkad St, Nasr City',
    nationalId: '29807121004561',
    fatherNationalId: '29701121300011',
    fatherMobile: '0100-123-4567',
    academicYear: '2024-2025',
    academicYearId: 'YEAR-2024',
    studentType: 'New',
    status: 'Active',
    notesCategory: 'ActionNeeded',
    notes: 'Medical clearance pending'
  },
  {
    id: 'mock-2',
    serial: 2,
    name: 'Mariam El-Khateeb',
    arabicName: 'مريم الخطيب',
    fatherName: 'Karim El-Khateeb',
    gender: 'Female',
    stage: 'Primary',
    grade: 'Grade 2',
    className: '1B',
    address: '38 El-Mollak Street, Maadi',
    nationalId: '28805121122334',
    fatherNationalId: '28805121222343',
    fatherMobile: '0102-555-2246',
    academicYear: '2024-2025',
    academicYearId: 'YEAR-2024',
    studentType: 'New',
    status: 'Active',
    notesCategory: 'Clear',
    notes: 'Documents ready'
  },
  {
    id: 'mock-3',
    serial: 3,
    name: 'Omar Zaki',
    arabicName: 'عمر زكي',
    fatherName: 'Zaki Fathy',
    gender: 'Male',
    stage: 'Preparatory',
    grade: 'Grade 7',
    className: '7A',
    address: '10 Naguib Mahfouz, Heliopolis',
    nationalId: '29511221133445',
    fatherNationalId: '29511221333445',
    fatherMobile: '0111-223-7789',
    academicYear: '2023-2024',
    academicYearId: 'YEAR-2023',
    studentType: 'Transfer',
    status: 'Inactive',
    notesCategory: 'Clear',
    notes: 'Transfer finalized'
  },
  {
    id: 'mock-4',
    serial: 4,
    name: 'Layla Saad',
    arabicName: 'ليلى سعد',
    fatherName: 'Saad Mokhtar',
    gender: 'Female',
    stage: 'Secondary',
    grade: 'Grade 11',
    className: '11C',
    address: '21 Salah Salem, Heliopolis',
    nationalId: '29709121566778',
    fatherNationalId: '29709121566700',
    fatherMobile: '0120-908-4132',
    academicYear: '2024-2025',
    academicYearId: 'YEAR-2024',
    studentType: 'New',
    status: 'Active',
    notesCategory: 'ActionNeeded',
    notes: 'Scholarship documents pending'
  },
  {
    id: 'mock-5',
    serial: 5,
    name: 'Faris Mostafa',
    arabicName: 'فارس مصطفى',
    fatherName: 'Mostafa Abdelrahman',
    gender: 'Male',
    stage: 'Secondary',
    grade: 'Grade 12',
    className: '12B',
    address: '5 Road 8, New Cairo',
    nationalId: '29804121677889',
    fatherNationalId: '29804121777880',
    fatherMobile: '0101-909-2233',
    academicYear: '2023-2024',
    academicYearId: 'YEAR-2023',
    studentType: 'Transfer',
    status: 'Active',
    notesCategory: 'Clear',
    notes: 'Transfer finalized'
  },
  {
    id: 'mock-6',
    serial: 6,
    name: 'Sara Nabil',
    arabicName: 'سارة نبيل',
    fatherName: 'Nabil Ismail',
    gender: 'Female',
    stage: 'Preparatory',
    grade: 'Grade 8',
    className: '8B',
    address: '4 Abdul Aziz Fahmy, Zamalek',
    nationalId: '29507121988990',
    fatherNationalId: '29507121988001',
    fatherMobile: '0115-450-1166',
    academicYear: '2022-2023',
    academicYearId: 'YEAR-2022',
    studentType: 'Transfer',
    status: 'Inactive',
    notesCategory: 'ActionNeeded',
    notes: 'Legal approval pending'
  },
  {
    id: 'mock-7',
    serial: 7,
    name: 'Youssef Adel',
    arabicName: 'يوسف عادل',
    fatherName: 'Adel Sharif',
    gender: 'Male',
    stage: 'Primary',
    grade: 'Grade 3',
    className: '2A',
    address: '12 Abdel Aziz Fahmy, Zamalek',
    nationalId: '29901122099001',
    fatherNationalId: '29901122099002',
    fatherMobile: '0109-338-7731',
    academicYear: '2024-2025',
    academicYearId: 'YEAR-2024',
    studentType: 'New',
    status: 'Active',
    notesCategory: 'Clear',
    notes: 'Sibling already enrolled'
  },
  {
    id: 'mock-8',
    serial: 8,
    name: 'Noor Fathy',
    arabicName: 'نور فتحي',
    fatherName: 'Fathy El-Mohandes',
    gender: 'Female',
    stage: 'Kindergarten',
    grade: 'KG 2',
    className: 'KG-2',
    address: '67 Ismailia Road, Heliopolis',
    nationalId: '29904124112131',
    fatherNationalId: '29904124112000',
    fatherMobile: '0105-554-1199',
    academicYear: '2024-2025',
    academicYearId: 'YEAR-2024',
    studentType: 'New',
    status: 'Active',
    notesCategory: 'ActionNeeded',
    notes: 'Health screening required'
  },
  {
    id: 'mock-9',
    serial: 9,
    name: 'Ibrahim Nasr',
    arabicName: 'إبراهيم نصر',
    fatherName: 'Nasr Eldin El-Gendy',
    gender: 'Male',
    stage: 'Kindergarten',
    grade: 'KG 1',
    className: 'KG-1',
    address: '3 Omar Makram, Downtown',
    nationalId: '29809122333455',
    fatherNationalId: '29809122333221',
    fatherMobile: '0102-833-4488',
    academicYear: '2023-2024',
    academicYearId: 'YEAR-2023',
    studentType: 'Transfer',
    status: 'Inactive',
    notesCategory: 'Clear',
    notes: 'Awaiting final paperwork'
  },
  {
    id: 'mock-10',
    serial: 10,
    name: 'Dalia Mansour',
    arabicName: 'داليا منصور',
    fatherName: 'Mansour Khaled',
    gender: 'Female',
    stage: 'Secondary',
    grade: 'Grade 9',
    className: '9A',
    address: '40 Ahmed Orabi, Mohandessin',
    nationalId: '29709122000114',
    fatherNationalId: '29709122000111',
    fatherMobile: '0114-225-6677',
    academicYear: '2022-2023',
    academicYearId: 'YEAR-2022',
    studentType: 'Transfer',
    status: 'Active',
    notesCategory: 'ActionNeeded',
    notes: 'ID card generation pending'
  }
];

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

const EnrolledStudents: React.FC<{ store: any }> = ({ store }) => {
  const {
    lang,
    addStudent,
    updateStudent,
    importStudentsBatch,
    deleteStudentsBatch,
    allStudents,
    students: studentRecords,
    stages,
    grades,
    classes,
    activeYear,
    activeSchool,
    years
  } = store;
  const isRtl = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatGenderLabel = (value?: string) => {
    const normalized = (value || '').toString().trim().toLowerCase();
    if (['male', 'm', 'ذكر', 'ولد', 'بنين'].includes(normalized)) return 'ذكر';
    if (['female', 'f', 'أنثى', 'انثى', 'بنات', 'بنت'].includes(normalized)) return 'أنثى';
    return value || '—';
  };
  const [editingStudent, setEditingStudent] = useState<StudentMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentTypeFilter, setStudentTypeFilter] = useState<StudentTypeFilterOption>('All');
  const [stageFilter, setStageFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [systemNotesFilter, setSystemNotesFilter] = useState<NotesFilterOption>('');
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilterOption>('all');
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(initialColumnFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(500);
  const [currentPage, setCurrentPage] = useState(1);
  const activeAcademicYearId = activeYear?.Year_ID || 'all';

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    activeAcademicYearId,
    studentTypeFilter,
    stageFilter,
    gradeFilter,
    classFilter,
    systemNotesFilter,
    selectionFilter,
    columnFilters,
    rowsPerPage
  ]);

  const baseStudents = useMemo(() => {
    const source = Array.isArray(allStudents) && allStudents.length > 0 ? allStudents : studentRecords || [];
    if (activeAcademicYearId === 'all') {
      return source;
    }
    return source.filter((student) => student.Academic_Year_ID === activeAcademicYearId);
  }, [allStudents, studentRecords, activeAcademicYearId]);

  const academicYearLookup = useMemo(() => {
    const map = new Map<string, string>();
    (years || []).forEach((year: any) => map.set(year.Year_ID, year.Year_Name));
    return map;
  }, [years]);

  const stageLookup = useMemo(() => new Map((stages || []).map((stage: any) => [stage.Stage_ID, stage.Stage_Name])), [stages]);
  const gradeLookup = useMemo(() => new Map((grades || []).map((grade: Grade) => [grade.Grade_ID, grade.Grade_Name])), [grades]);
  const classLookup = useMemo(() => new Map((classes || []).map((klass: ClassType) => [klass.Class_ID, klass.Class_Name])), [classes]);

  const convertedStudents: StudentRow[] = useMemo(() => {
    if (!baseStudents || baseStudents.length === 0) {
      return mockStudents;
    }

    return baseStudents.map((student, index) => {
      const studentCode =
        student.Student_Global_ID
        || student.Student_ID
        || student.Student_Number
        || student.Gov_Code
        || student.National_ID
        || student.id
        || student.Id
        || student.studentId
        || `STU-${index + 1}`;
      const stage = stageLookup.get(student.Stage_ID) || '—';
      const grade = gradeLookup.get(student.Grade_ID) || '—';
      const className = classLookup.get(student.Class_ID) || '—';
      const notesCategory: NotesCategory = student.Status === StudentStatus.ENROLLED ? 'Clear' : 'ActionNeeded';
      const status: Status = [StudentStatus.TRANSFERRED, StudentStatus.DEPARTED].includes(student.Status)
        ? 'Inactive'
        : 'Active';
      return {
        id: studentCode,
        serial: index + 1,
        code: studentCode,
        name: student.Name_Ar || student.Name_En || '—',
        arabicName: student.Name_Ar || '—',
        fatherName: student.Father?.Name || '—',
        gender: student.Gender === 'Female' ? 'Female' : 'Male',
        stage,
        grade,
        className,
        address: student.Father?.Address || '—',
        nationalId: student.National_ID || '—',
        fatherNationalId: student.Father?.National_ID || '—',
        fatherMobile: student.Father?.Mobile || student.Guardian_Phone || '—',
        academicYear: academicYearLookup.get(student.Academic_Year_ID) || '—',
        academicYearId: student.Academic_Year_ID || '—',
        studentType: student.Status === StudentStatus.TRANSFERRED ? 'Transfer' : 'New',
        status,
        notesCategory,
        notes: status === 'Active' ? 'Registry verified' : 'Needs paperwork'
      };
    });
  }, [baseStudents, stageLookup, gradeLookup, classLookup, academicYearLookup]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) =>
      convertedStudents.some((student) => student.id === id)
    ));
  }, [convertedStudents]);

  const stageOptions = useMemo(() => Array.from(new Set(convertedStudents.map((student) => student.stage))), [convertedStudents]);
  const gradeOptions = useMemo(() => Array.from(new Set(convertedStudents.map((student) => student.grade))), [convertedStudents]);
  const classOptions = useMemo(() => Array.from(new Set(convertedStudents.map((student) => student.className))), [convertedStudents]);

  const updateColumnFilter = (key: keyof ColumnFilters, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return convertedStudents.filter((student) => {
      if (activeAcademicYearId !== 'all' && student.academicYearId !== activeAcademicYearId) {
        return false;
      }
      if (studentTypeFilter !== 'All' && student.studentType !== studentTypeFilter) {
        return false;
      }
      if (stageFilter && student.stage !== stageFilter) {
        return false;
      }
      if (gradeFilter && student.grade !== gradeFilter) {
        return false;
      }
      if (classFilter && student.className !== classFilter) {
        return false;
      }
      if (systemNotesFilter && student.notesCategory !== systemNotesFilter) {
        return false;
      }

      const matchesSelection =
        selectionFilter === 'all' ||
        (selectionFilter === 'selected' && selectedIds.includes(student.id)) ||
        (selectionFilter === 'unselected' && !selectedIds.includes(student.id));
      if (!matchesSelection) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = `${student.name} ${student.arabicName} ${student.fatherName} ${student.nationalId}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (columnFilters.serial && !student.serial.toString().includes(columnFilters.serial)) {
        return false;
      }
      if (columnFilters.code && !(student.code || '').toString().includes(columnFilters.code)) {
        return false;
      }
      if (columnFilters.userName && !student.name.toLowerCase().includes(columnFilters.userName.toLowerCase())) {
        return false;
      }
      if (columnFilters.arabicName && !student.arabicName.toLowerCase().includes(columnFilters.arabicName.toLowerCase())) {
        return false;
      }
      if (columnFilters.fatherName && !student.fatherName.toLowerCase().includes(columnFilters.fatherName.toLowerCase())) {
        return false;
      }
      if (columnFilters.gender && student.gender !== columnFilters.gender) {
        return false;
      }
      if (columnFilters.stage && student.stage !== columnFilters.stage) {
        return false;
      }
      if (columnFilters.grade && student.grade !== columnFilters.grade) {
        return false;
      }
      if (columnFilters.className && student.className !== columnFilters.className) {
        return false;
      }
      if (columnFilters.address && !student.address.toLowerCase().includes(columnFilters.address.toLowerCase())) {
        return false;
      }
      if (columnFilters.nationalId && !student.nationalId.includes(columnFilters.nationalId)) {
        return false;
      }
      if (columnFilters.fatherNationalId && !student.fatherNationalId.includes(columnFilters.fatherNationalId)) {
        return false;
      }
      if (columnFilters.fatherMobile && !student.fatherMobile.includes(columnFilters.fatherMobile)) {
        return false;
      }
      if (columnFilters.status && student.status !== columnFilters.status) {
        return false;
      }

      return true;
    });
  }, [
    activeAcademicYearId,
    studentTypeFilter,
    stageFilter,
    gradeFilter,
    classFilter,
    systemNotesFilter,
    selectionFilter,
    columnFilters,
    searchTerm,
    selectedIds,
    convertedStudents
  ]);

  const safeRowsPerPage = Math.max(rowsPerPage, 1);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / safeRowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * safeRowsPerPage;
    return filteredStudents.slice(start, start + safeRowsPerPage);
  }, [filteredStudents, currentPage, safeRowsPerPage]);

  const currentPageIds = paginatedStudents.map((student) => student.id);
  const allOnPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const showingStart = filteredStudents.length === 0 ? 0 : (currentPage - 1) * safeRowsPerPage + 1;
  const showingEnd = Math.min(filteredStudents.length, currentPage * safeRowsPerPage);

  const handleExportToExcel = () => {
    if (filteredStudents.length === 0) return;
    const data = filteredStudents.map((student) => ({
      'Student Name': student.name,
      'Father Name': student.fatherName,
      'Academic Year': student.academicYear,
      'Grade': student.grade,
      'Class': student.className,
      'National ID': student.nationalId,
      'Father National ID': student.fatherNationalId,
      'Mobile': student.fatherMobile,
      'Status': student.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');
    XLSX.writeFile(workbook, 'enrolled_students.xlsx');
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS_ROW]);
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
        alert('No worksheets found in the uploaded file.');
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' }) as unknown[][];
      const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
      const headers = headerRow.map((cell) => normalizeString(cell));
      const headerIndex = new Map<string, number>();
      headers.forEach((header, index) => {
        if (header) headerIndex.set(header, index);
      });

      const normalizeHeader = (value: string) => normalizeString(value).toLowerCase();
      const normalizedHeaderSet = new Set(headers.map(normalizeHeader));
      const requiredHeaderGroups = [
        { label: 'National ID / الرقم القومي', keys: ['National ID', 'الرقم القومي'] },
        { label: 'Name Ar / اسم الطالب', keys: ['Name Ar', 'اسم الطالب', 'اسم الطالب بالعربية'] },
        { label: 'Grade / الصف', keys: ['Grade', 'الصف'] },
        { label: 'Class / الفصل', keys: ['Class', 'الفصل'] }
      ];
      const missingGroups = requiredHeaderGroups.filter((group) => (
        !group.keys.some((key) => normalizedHeaderSet.has(normalizeHeader(key)))
      ));
      if (missingGroups.length > 0) {
        alert(`Uploaded file is missing required headers: ${missingGroups.map((group) => group.label).join(', ')}`);
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
        alert(`Import errors found:\n${trimmed}${errors.length > 10 ? '\n...' : ''}`);
      }

      if (validRecords.length === 0) {
        alert('No valid rows found to import.');
        return;
      }

      importStudentsBatch(validRecords);
      alert(`Imported ${validRecords.length} students successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : normalizeString(error);
      alert(`Failed to import the file. ${message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm('Delete selected students? This cannot be undone.');
    if (!confirmed) return;
    deleteStudentsBatch(selectedIds);
    setSelectedIds([]);
  };

  const handleToolbarEdit = () => {
    if (selectedIds.length === 0) {
      alert('Select a student row to edit.');
      return;
    }
    const studentId = selectedIds[0];
    const pool = (allStudents && allStudents.length > 0 ? allStudents : studentRecords) || [];
    const matched = pool.find((student: StudentMaster) => student.Student_Global_ID === studentId);
    if (!matched) {
      alert('Selected entry cannot be edited in this view.');
      return;
    }
    setEditingStudent(matched);
    setIsModalOpen(true);
  };

  const toolbarActions = [
    { label: 'Lock', icon: Lock, onClick: () => alert('Lock action is not enabled yet.') },
    { label: 'Duplicate', icon: Copy, onClick: () => alert('Duplicate action coming soon.') },
    { label: 'Attachments', icon: Paperclip, onClick: () => alert('Attachments panel will open soon.') },
    { label: 'Search', icon: Search, onClick: () => alert('Use the filter bar to search quickly.') },
    { label: 'Export', icon: FileSpreadsheet, onClick: handleExportToExcel, extraClass: 'text-emerald-500 hover:bg-emerald-50' },
    { label: 'Email', icon: Mail, onClick: () => alert('Email notifications are in development.') },
    { label: 'ID Card', icon: IdCard, onClick: () => alert('ID card generation pipeline triggered.') },
    { label: 'Print', icon: Printer, onClick: () => window.print() },
    { label: 'Delete', icon: Trash2, onClick: handleBatchDelete, extraClass: 'text-rose-500 hover:bg-rose-50' },
    { label: 'Edit', icon: Edit, onClick: handleToolbarEdit },
    { label: 'Add', icon: Plus, onClick: () => { setEditingStudent(null); setIsModalOpen(true); }, extraClass: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100' }
  ];

  const systemNotesOptions = [
    { value: '', label: 'كل الملاحظات' },
    { value: 'ActionNeeded' as NotesFilterOption, label: 'Action Required' },
    { value: 'Clear' as NotesFilterOption, label: 'Clear Notes' }
  ];

  const buildStudentPayload = (values: StudentForm, existing?: StudentMaster) => {
    const stageId = values.stageId || existing?.Stage_ID || '';
    const gradeId = values.gradeId || existing?.Grade_ID || '';
    const classId = values.classId || existing?.Class_ID || '';
    const grade = grades.find((g: Grade) => g.Grade_ID === gradeId);
    const klass = classes.find((c: ClassType) => c.Class_ID === classId);
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
      Stage_ID: stageId,
      Grade_ID: gradeId,
      Class_ID: classId,
      Section: existing?.Section || 'Arabic',
      Level: levelParts.join(' - '),
      Stage_Name: stageId ? (stages.find((s: any) => s.Stage_ID === stageId)?.Stage_Name || '') : '',
      Grade_Name: gradeId ? (grade?.Grade_Name || '') : '',
      Class_Name: classId ? (klass?.Class_Name || '') : '',
      Father: buildParentPayload(values.father, 'FTH', existing?.Father),
      Mother: buildParentPayload(values.mother, 'MTH', existing?.Mother),
      Emergency_Phone: existing?.Emergency_Phone || '',
      Is_Integration: existing?.Is_Integration || false,
      Bus_Number: existing?.Bus_Number || '',
      Email: existing?.Email || '',
      Attachments: existing?.Attachments || []
    };
  };

  const mapStudentToForm = (student: StudentMaster): Partial<StudentForm> => {
    const gradeIdFromName = student.Grade_ID
      || grades.find((g: Grade) => g.Grade_Name === student.Grade_Name)?.Grade_ID
      || '';
    const classIdFromName = student.Class_ID
      || classes.find((c: ClassType) => c.Class_Name === student.Class_Name)?.Class_ID
      || '';

    return ({
      stageId: student.Stage_ID || '',
      gradeId: gradeIdFromName,
      classId: classIdFromName,
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
  };

  return (
    <section dir="rtl" className="space-y-5">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-semibold tracking-wide uppercase">Enrolled Students</p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Students Grid</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition"
          >
            <Upload size={16} /> استيراد
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
          >
            <FileSpreadsheet size={16} /> نموذج الاستيراد
          </button>
          <button
            type="button"
            onClick={handleExportToExcel}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition"
          >
            <Download size={16} /> تصدير
          </button>
          {toolbarActions.map((action) => (
            <button
              key={action.label}
              type="button"
              aria-label={action.label}
              onClick={action.onClick}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm transition duration-200 hover:shadow-md hover:bg-slate-50 ${action.extraClass ?? ''}`}
            >
              <action.icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">بحث حسب...</label>
          <div className="relative">
            <Search size={18} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-300`} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="بحث بالاسم أو الرقم القومي أو ولي الأمر..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            السنة الدراسية: {academicYearLookup.get(activeAcademicYearId) || activeYear?.Year_Name || '—'}
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 flex-1 min-w-[220px]">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Student Type</label>
            <select
              value={studentTypeFilter}
              onChange={(event) => setStudentTypeFilter(event.target.value as StudentTypeFilterOption)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="All">كل الأنواع</option>
              <option value="New">مستجد</option>
              <option value="Transfer">منقول</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Stage</label>
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">كل المراحل</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Grade</label>
            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">كل الصفوف</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Class</label>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">كل الفصول</option>
              {classOptions.map((classItem) => (
                <option key={classItem} value={classItem}>
                  {classItem}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-[180px] flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 block">ملاحظات النظام</label>
          <select
            value={systemNotesFilter}
            onChange={(event) => setSystemNotesFilter(event.target.value as NotesFilterOption)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {systemNotesOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              نموذج
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              استيراد
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="overflow-y-auto max-h-[520px]">
            <table className="min-w-[1200px] w-full text-right">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-sm">
                  <th className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-indigo-500"
                        aria-label="Toggle select on this page"
                      />
                      <span className="font-black text-slate-600 text-[11px]">اختيار</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <span>#</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>كود الطالب</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>اسم الطالب</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>الاسم بالعربية</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>اسم الأب</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>النوع</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>المرحلة</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>الصف</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>الفصل</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>العنوان</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>الرقم القومي</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>رقم الأب القومي</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>هاتف الأب</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>الحالة</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                </tr>
                <tr className="sticky top-[46px] z-10 bg-white">
                  <th className="px-2 py-1">
                    <select
                      value={selectionFilter}
                      onChange={(event) => setSelectionFilter(event.target.value as SelectionFilterOption)}
                      className="w-full text-[11px] text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 focus:outline-none"
                    >
                      <option value="all">الكل</option>
                      <option value="selected">المحدد</option>
                      <option value="unselected">غير المحدد</option>
                    </select>
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="#"
                      value={columnFilters.serial}
                      onChange={(event) => updateColumnFilter('serial', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="كود الطالب"
                      value={columnFilters.code}
                      onChange={(event) => updateColumnFilter('code', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="الاسم"
                      value={columnFilters.userName}
                      onChange={(event) => updateColumnFilter('userName', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="الاسم بالعربية"
                      value={columnFilters.arabicName}
                      onChange={(event) => updateColumnFilter('arabicName', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="اسم الأب"
                      value={columnFilters.fatherName}
                      onChange={(event) => updateColumnFilter('fatherName', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <select
                      value={columnFilters.gender}
                      onChange={(event) => updateColumnFilter('gender', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    >
                      <option value="">كل الأنواع</option>
                      <option value="Male">ذكر</option>
                      <option value="Female">أنثى</option>
                    </select>
                  </th>
                  <th className="px-3 py-1">
                    <select
                      value={columnFilters.stage}
                      onChange={(event) => updateColumnFilter('stage', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    >
                      <option value="">كل المراحل</option>
                      {stageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="px-3 py-1">
                    <select
                      value={columnFilters.grade}
                      onChange={(event) => updateColumnFilter('grade', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    >
                      <option value="">كل الصفوف</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="px-3 py-1">
                    <select
                      value={columnFilters.className}
                      onChange={(event) => updateColumnFilter('className', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    >
                      <option value="">كل الفصول</option>
                      {classOptions.map((classItem) => (
                        <option key={classItem} value={classItem}>
                          {classItem}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="العنوان"
                      value={columnFilters.address}
                      onChange={(event) => updateColumnFilter('address', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="الرقم القومي"
                      value={columnFilters.nationalId}
                      onChange={(event) => updateColumnFilter('nationalId', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="رقم الأب القومي"
                      value={columnFilters.fatherNationalId}
                      onChange={(event) => updateColumnFilter('fatherNationalId', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="هاتف الأب"
                      value={columnFilters.fatherMobile}
                      onChange={(event) => updateColumnFilter('fatherMobile', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    />
                  </th>
                  <th className="px-3 py-1">
                    <select
                      value={columnFilters.status}
                      onChange={(event) => updateColumnFilter('status', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none"
                    >
                      <option value="">الكل</option>
                      <option value="Active">نشط</option>
                      <option value="Inactive">غير نشط</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="text-[12px] text-slate-700 odd:bg-white even:bg-slate-50 hover:bg-indigo-50 transition-colors"
                  >
                    <td className="px-2 py-2 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student.id)}
                        onChange={() => toggleRowSelection(student.id)}
                        className="h-4 w-4 accent-indigo-500"
                        aria-label={`Select row ${student.serial}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{student.serial}</td>
                    <td className="px-3 py-2 font-mono text-[12px] font-bold text-slate-800">{student.code || '—'}</td>
                    <td className="px-3 py-2 font-semibold">{student.name}</td>
                    <td className="px-3 py-2">{student.arabicName}</td>
                    <td className="px-3 py-2">{student.fatherName}</td>
                    <td className="px-3 py-2">{formatGenderLabel(student.gender)}</td>
                    <td className="px-3 py-2">{student.stage}</td>
                    <td className="px-3 py-2">{student.grade}</td>
                    <td className="px-3 py-2">{student.className}</td>
                    <td className="px-3 py-2">{student.address}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{student.nationalId}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{student.fatherNationalId}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{student.fatherMobile}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] font-black transition ${
                          student.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        }`}
                        aria-pressed={student.status === 'Active'}
                      >
                        {student.status}
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-6 py-8 text-center text-slate-500 text-[13px]">
                      No students matched the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 bg-white">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {rowsPerPageOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Showing {showingStart}-{showingEnd} of {filteredStudents.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition disabled:border-slate-200 disabled:text-slate-300"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition disabled:border-slate-200 disabled:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
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
          setSelectedIds([]);
        }}
        stages={stages}
        grades={grades}
        classes={classes}
        activeAcademicYear={activeYear}
        initialValues={editingStudent ? mapStudentToForm(editingStudent) : undefined}
        title={editingStudent ? 'Update Student' : 'Register Student'}
        subtitle={editingStudent ? 'Edit the selected record' : 'Add a new enrolled student'}
        submitLabel={editingStudent ? 'Save Changes' : 'Save Record'}
        existingStudents={allStudents || []}
        currentStudentId={editingStudent?.Student_Global_ID}
      />
    </section>
  );
};

export default EnrolledStudents;
