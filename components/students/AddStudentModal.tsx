import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Heart, Paperclip, Info, GraduationCap, Users } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AcademicYear,
  NATIONAL_ID_REGEX,
  parseNationalId,
  formatDateInput,
  getAcademicYearReferenceDate,
  calculateAgeOnDate,
  formatAge
} from './nationalIdUtils';
import { StudentMaster } from '../../types';

interface Stage {
  Stage_ID: string;
  Stage_Name: string;
}

interface Grade {
  Grade_ID: string;
  Stage_ID: string;
  Grade_Name: string;
}

interface Class {
  Class_ID: string;
  Grade_ID: string;
  Class_Name: string;
}

export const studentStatusOptions = [
  'Enrolled (مقيد)',
  'New (مستجد)',
  'Transferred In (محول)',
  'Transferred Out (منقول)',
  'Repeating (باق للإعادة)'
] as const;

export type StudentStatusOption = typeof studentStatusOptions[number];

interface Parent {
  name: string;
  nationalId: string;
  birthDate: string;
  mobile: string;
  whatsapp: string;
  address?: string;
  job: string;
}

export interface Student {
  stageId: string;
  gradeId: string;
  classId: string;
  name: string;
  nationalId: string;
  birthDate: string;
  gender: 'Male' | 'Female';
  ageOnOct1: string;
  status: StudentStatusOption;
  governmentCode: string;
  father: Parent;
  mother: Parent;
  attachments: File[];
  notes: string;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (student: Student) => void;
  stages: Stage[];
  grades: Grade[];
  classes: Class[];
  activeAcademicYear?: AcademicYear | null;
  initialValues?: Partial<Student>;
  title?: string;
  submitLabel?: string;
  subtitle?: string;
  existingStudents?: StudentMaster[];
  currentStudentId?: string;
}

const genderSchema = z
  .union([z.literal(''), z.literal('Male'), z.literal('Female')])
  .refine((value) => value === 'Male' || value === 'Female', {
    message: 'Gender is required'
  });

const optionalNationalIdSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || NATIONAL_ID_REGEX.test(value), {
    message: 'Invalid National ID'
  });

const formSchema = z.object({
  stageId: z.string().min(1, 'Stage is required'),
  gradeId: z.string().min(1, 'Grade is required'),
  classId: z.string().min(1, 'Class is required'),
  name: z.string().min(1, 'Student name is required'),
  nationalId: z.string().regex(NATIONAL_ID_REGEX, 'Invalid National ID'),
  birthDate: z.string().min(1, 'Birth date is required'),
  gender: genderSchema,
  ageOnOct1: z.string().min(1, 'Age is required'),
  status: z.enum(studentStatusOptions),
  governmentCode: z.string().optional().default(''),
  father: z.object({
    name: z.string().min(1, 'Father name is required'),
    nationalId: optionalNationalIdSchema,
    birthDate: z.string().optional().default(''),
    mobile: z.string().optional().default(''),
    whatsapp: z.string().optional().default(''),
    address: z.string().optional().default(''),
    job: z.string().optional().default('')
  }),
  mother: z.object({
    name: z.string().min(1, 'Mother name is required'),
    nationalId: optionalNationalIdSchema,
    birthDate: z.string().optional().default(''),
    mobile: z.string().optional().default(''),
    whatsapp: z.string().optional().default(''),
    job: z.string().optional().default('')
  }),
  attachments: z.array(z.instanceof(File)).optional().default([]),
  notes: z.string().optional().default('')
});

type StudentFormValues = Omit<Student, 'gender'> & { gender: '' | 'Male' | 'Female' };

type TabKey = 'student' | 'father' | 'mother' | 'attachments' | 'other';

const deriveFatherName = (studentName: string): string => {
  const parts = studentName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(1).join(' ');
};

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  stages,
  grades,
  classes,
  activeAcademicYear,
  initialValues,
  title,
  submitLabel,
  subtitle,
  existingStudents = [],
  currentStudentId
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('student');

  const baseDefaults: StudentFormValues = {
    stageId: '',
    gradeId: '',
    classId: '',
    name: '',
    nationalId: '',
    birthDate: '',
    gender: '',
    ageOnOct1: '',
    status: 'New (مستجد)',
    governmentCode: '',
    father: {
      name: '',
      nationalId: '',
      birthDate: '',
      mobile: '',
      whatsapp: '',
      address: '',
      job: ''
    },
    mother: {
      name: '',
      nationalId: '',
      birthDate: '',
      mobile: '',
      whatsapp: '',
      job: ''
    },
    attachments: [],
    notes: ''
  };

  const mergedDefaults = useMemo(() => ({
    ...baseDefaults,
    ...initialValues,
    father: { ...baseDefaults.father, ...initialValues?.father },
    mother: { ...baseDefaults.mother, ...initialValues?.mother },
    attachments: initialValues?.attachments ?? baseDefaults.attachments,
    notes: initialValues?.notes ?? baseDefaults.notes
  }), [initialValues]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    setError,
    formState: { errors, dirtyFields }
  } = useForm<StudentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: baseDefaults
  });

  const studentName = useWatch({ control, name: 'name' });
  const studentNationalId = useWatch({ control, name: 'nationalId' });
  const fatherNationalId = useWatch({ control, name: 'father.nationalId' });
  const motherNationalId = useWatch({ control, name: 'mother.nationalId' });
  const selectedStageId = useWatch({ control, name: 'stageId' });
  const selectedGradeId = useWatch({ control, name: 'gradeId' });
  const selectedClassId = useWatch({ control, name: 'classId' });
  const birthDateValue = useWatch({ control, name: 'birthDate' });
  const attachments = useWatch({ control, name: 'attachments' });

  const referenceDate = useMemo(
    () => getAcademicYearReferenceDate(activeAcademicYear),
    [activeAcademicYear]
  );

  const filteredGrades = useMemo(
    () => grades.filter((grade) => grade.Stage_ID === selectedStageId),
    [grades, selectedStageId]
  );

  const filteredClasses = useMemo(
    () => classes.filter((klass) => klass.Grade_ID === selectedGradeId),
    [classes, selectedGradeId]
  );

  useEffect(() => {
    if (!selectedStageId) {
      setValue('gradeId', '', { shouldValidate: true });
      setValue('classId', '', { shouldValidate: true });
      return;
    }
    const gradeStillValid = grades.some(
      (grade) => grade.Stage_ID === selectedStageId && grade.Grade_ID === selectedGradeId
    );
    if (!gradeStillValid) {
      setValue('gradeId', '', { shouldValidate: true });
      setValue('classId', '', { shouldValidate: true });
    }
  }, [selectedStageId, selectedGradeId, grades, setValue]);

  useEffect(() => {
    if (!selectedGradeId) {
      setValue('classId', '', { shouldValidate: true });
      return;
    }
    const classStillValid = classes.some(
      (klass) => klass.Grade_ID === selectedGradeId && klass.Class_ID === selectedClassId
    );
    if (!classStillValid) {
      setValue('classId', '', { shouldValidate: true });
    }
  }, [selectedGradeId, selectedClassId, classes, setValue]);

  useEffect(() => {
    if (!studentName) return;
    const derived = deriveFatherName(studentName);
    const fatherNameDirty = Boolean(dirtyFields.father?.name);
    if (!fatherNameDirty) {
      setValue('father.name', derived, { shouldDirty: false });
    }
  }, [studentName, dirtyFields.father?.name, setValue]);

  useEffect(() => {
    const parsed = parseNationalId(studentNationalId);
    if (!parsed) {
      setValue('birthDate', '', { shouldValidate: true });
      setValue('gender', '', { shouldValidate: true });
      return;
    }
    setValue('birthDate', formatDateInput(parsed.birthDate), { shouldValidate: true });
    setValue('gender', parsed.gender, { shouldValidate: true });
  }, [studentNationalId, setValue]);

  useEffect(() => {
    const parsed = parseNationalId(fatherNationalId);
    setValue('father.birthDate', parsed ? formatDateInput(parsed.birthDate) : '', {
      shouldValidate: true
    });
  }, [fatherNationalId, setValue]);

  useEffect(() => {
    const parsed = parseNationalId(motherNationalId);
    setValue('mother.birthDate', parsed ? formatDateInput(parsed.birthDate) : '', {
      shouldValidate: true
    });
  }, [motherNationalId, setValue]);

  useEffect(() => {
    if (!birthDateValue) {
      setValue('ageOnOct1', '', { shouldValidate: true });
      return;
    }
    const parsed = new Date(birthDateValue);
    if (Number.isNaN(parsed.getTime())) {
      setValue('ageOnOct1', '', { shouldValidate: true });
      return;
    }
    const age = calculateAgeOnDate(parsed, referenceDate);
    setValue('ageOnOct1', formatAge(age), { shouldValidate: true });
  }, [birthDateValue, referenceDate, setValue]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('student');
      reset(mergedDefaults);
    }
  }, [isOpen, mergedDefaults, reset]);

  const submitForm = handleSubmit((values) => {
    const normalizedValues = { ...values, nationalId: values.nationalId.trim() };
    const duplicate = existingStudents.some(
      (student) =>
        student.National_ID === normalizedValues.nationalId &&
        student.Student_Global_ID !== currentStudentId
    );
    if (duplicate) {
      setActiveTab('student');
      setError('nationalId', {
        type: 'duplicate',
        message: 'National ID is already registered for another student.'
      });
      return;
    }
    const parsed = formSchema.parse(normalizedValues) as StudentFormValues;
    onSubmit({
      ...parsed,
      gender: parsed.gender as 'Male' | 'Female',
      attachments: parsed.attachments || []
    });
    onClose();
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="w-full max-w-6xl rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl">
              <GraduationCap size={28} />
            </div>
            <div className="text-start">
              <h2 className="text-2xl font-black text-slate-900">{title || 'Add Student'}</h2>
              <p className="text-xs font-bold text-slate-400">{subtitle || 'Register a new student record'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-rose-50 text-slate-500">
            <X size={24} />
          </button>
        </div>

        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-100 bg-white px-4">
          <button
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-2 px-6 py-4 border-b-4 font-black text-xs uppercase tracking-widest ${
              activeTab === 'student' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'
            }`}
          >
            <User size={16} /> Student Basic Data (بيانات الطالب)
          </button>
          <button
            onClick={() => setActiveTab('father')}
            className={`flex items-center gap-2 px-6 py-4 border-b-4 font-black text-xs uppercase tracking-widest ${
              activeTab === 'father' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'
            }`}
          >
            <Heart size={16} /> Father's Data (بيانات الأب)
          </button>
          <button
            onClick={() => setActiveTab('mother')}
            className={`flex items-center gap-2 px-6 py-4 border-b-4 font-black text-xs uppercase tracking-widest ${
              activeTab === 'mother' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'
            }`}
          >
            <Users size={16} /> Mother's Data (بيانات الأم)
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`flex items-center gap-2 px-6 py-4 border-b-4 font-black text-xs uppercase tracking-widest ${
              activeTab === 'attachments' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'
            }`}
          >
            <Paperclip size={16} /> Attachments (المرفقات)
          </button>
          <button
            onClick={() => setActiveTab('other')}
            className={`flex items-center gap-2 px-6 py-4 border-b-4 font-black text-xs uppercase tracking-widest ${
              activeTab === 'other' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'
            }`}
          >
            <Info size={16} /> Other Data (بيانات أخرى)
          </button>
        </div>

        <form onSubmit={submitForm} className="flex-1 overflow-y-auto p-8 space-y-10 text-start">
          {activeTab === 'student' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stage</label>
                  <select {...register('stageId')} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold">
                    <option value="">Select Stage</option>
                    {stages.map((stage) => (
                      <option key={stage.Stage_ID} value={stage.Stage_ID}>
                        {stage.Stage_Name}
                      </option>
                    ))}
                  </select>
                  {errors.stageId && <p className="text-xs text-rose-500 font-bold">{errors.stageId.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade</label>
                  <select
                    {...register('gradeId')}
                    disabled={!selectedStageId}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold disabled:bg-slate-50"
                  >
                    <option value="">Select Grade</option>
                    {filteredGrades.map((grade) => (
                      <option key={grade.Grade_ID} value={grade.Grade_ID}>
                        {grade.Grade_Name}
                      </option>
                    ))}
                  </select>
                  {errors.gradeId && <p className="text-xs text-rose-500 font-bold">{errors.gradeId.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</label>
                  <select
                    {...register('classId')}
                    disabled={!selectedGradeId}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold disabled:bg-slate-50"
                  >
                    <option value="">Select Class</option>
                    {filteredClasses.map((klass) => (
                      <option key={klass.Class_ID} value={klass.Class_ID}>
                        {klass.Class_Name}
                      </option>
                    ))}
                  </select>
                  {errors.classId && <p className="text-xs text-rose-500 font-bold">{errors.classId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Name</label>
                  <input {...register('name')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                  {errors.name && <p className="text-xs text-rose-500 font-bold">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID</label>
                  <input
                    {...register('nationalId')}
                    type="text"
                    maxLength={14}
                    inputMode="numeric"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-mono font-black"
                  />
                  {errors.nationalId && <p className="text-xs text-rose-500 font-bold">{errors.nationalId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Birth Date</label>
                  <input
                    {...register('birthDate')}
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-500"
                  />
                  {errors.birthDate && <p className="text-xs text-rose-500 font-bold">{errors.birthDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                  <input
                    {...register('gender')}
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-500"
                  />
                  {errors.gender && <p className="text-xs text-rose-500 font-bold">{errors.gender.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age on Oct 1st</label>
                  <input
                    {...register('ageOnOct1')}
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-500"
                  />
                  {errors.ageOnOct1 && <p className="text-xs text-rose-500 font-bold">{errors.ageOnOct1.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Status</label>
                  <select {...register('status')} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold">
                    {studentStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.status && <p className="text-xs text-rose-500 font-bold">{errors.status.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Government Code</label>
                  <input {...register('governmentCode')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'father' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father Name</label>
                  <input {...register('father.name')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                  {errors.father?.name && <p className="text-xs text-rose-500 font-bold">{errors.father.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID</label>
                  <input
                    {...register('father.nationalId')}
                    type="text"
                    maxLength={14}
                    inputMode="numeric"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-mono font-black"
                  />
                  {errors.father?.nationalId && <p className="text-xs text-rose-500 font-bold">{errors.father.nationalId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Birth Date</label>
                  <input
                    {...register('father.birthDate')}
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</label>
                  <input {...register('father.mobile')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                  <input {...register('father.whatsapp')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</label>
                  <input {...register('father.address')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job</label>
                  <input {...register('father.job')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mother' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother Name</label>
                  <input {...register('mother.name')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                  {errors.mother?.name && <p className="text-xs text-rose-500 font-bold">{errors.mother.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID</label>
                  <input
                    {...register('mother.nationalId')}
                    type="text"
                    maxLength={14}
                    inputMode="numeric"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-mono font-black"
                  />
                  {errors.mother?.nationalId && <p className="text-xs text-rose-500 font-bold">{errors.mother.nationalId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Birth Date</label>
                  <input
                    {...register('mother.birthDate')}
                    type="text"
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</label>
                  <input {...register('mother.mobile')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                  <input {...register('mother.whatsapp')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job</label>
                <input {...register('mother.job')} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold" />
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attachments</label>
                <input
                  type="file"
                  multiple
                  onChange={(event) => {
                    const files = event.target.files ? (Array.from(event.target.files) as File[]) : [];
                    setValue('attachments', files, { shouldValidate: true });
                  }}
                  className="w-full bg-white border border-dashed border-slate-200 rounded-2xl px-5 py-6 font-bold"
                />
                {errors.attachments && <p className="text-xs text-rose-500 font-bold">{errors.attachments.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Files</label>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                  {attachments?.length ? (
                    <ul className="space-y-1">
                      {attachments.map((file, index) => (
                        <li key={`${file.name}-${index}`}>{file.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <span>No files selected.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'other' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest">
              Cancel
            </button>
            <button type="submit" className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg">
              {submitLabel || 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;
