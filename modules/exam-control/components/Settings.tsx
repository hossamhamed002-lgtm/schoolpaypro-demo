
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Settings2, Folder, CheckSquare, Square, AlertTriangle, Layers, Edit3, X, Check, ToggleLeft, ToggleRight, BookOpen, Bookmark, Loader2, CheckCircle2, Palette, RefreshCw, Beaker, Calendar, ShieldAlert } from 'lucide-react';
import { Subject, GradeLevel, GRADE_LABELS, GradeGroup, GradeDescriptor, CertificateConfig } from '../examControl.types';
import { db } from '../services/db';

interface SettingsProps {
  subjects: Subject[];
  onUpdate: (subjects: Subject[]) => void;
}

// --- TEMPLATES DEFINITION BASED ON RULES ---
const ALL_GRADES: GradeLevel[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3'];
const FROM_P4_TO_M3: GradeLevel[] = ['p4', 'p5', 'p6', 'm1', 'm2', 'm3'];
const FROM_P3_TO_P6: GradeLevel[] = ['p3', 'p4', 'p5', 'p6'];

const SUBJECT_TEMPLATES: Partial<Subject>[] = [
    // 1. Basic Subjects (Added to Total)
    { name: 'اللغة العربية', maxScore: 100, minScore: 50, yearWork: 40, practicalScore: 0, examScore: 60, isAddedToTotal: true, isBasic: true, showInSchedule: true, gradeLevels: ALL_GRADES },
    { name: 'اللغة الإنجليزية', maxScore: 100, minScore: 50, yearWork: 40, practicalScore: 0, examScore: 60, isAddedToTotal: true, isBasic: true, showInSchedule: true, gradeLevels: ALL_GRADES },
    { name: 'الرياضيات', maxScore: 100, minScore: 50, yearWork: 40, practicalScore: 0, examScore: 60, isAddedToTotal: true, isBasic: true, showInSchedule: true, gradeLevels: ALL_GRADES },
    { name: 'العلوم', maxScore: 100, minScore: 50, yearWork: 20, practicalScore: 20, examScore: 60, isAddedToTotal: true, isBasic: true, showInSchedule: true, gradeLevels: FROM_P4_TO_M3 },
    { name: 'الدراسات الاجتماعية', maxScore: 100, minScore: 50, yearWork: 40, practicalScore: 0, examScore: 60, isAddedToTotal: true, isBasic: true, showInSchedule: true, gradeLevels: FROM_P4_TO_M3 },

    // 2. Non-Added Subjects (Pass/Fail)
    { name: 'التربية الدينية', maxScore: 100, minScore: 50, yearWork: 40, practicalScore: 0, examScore: 60, isAddedToTotal: false, isBasic: true, showInSchedule: true, gradeLevels: ALL_GRADES },
    { name: 'التربية الفنية', maxScore: 100, minScore: 50, yearWork: 100, practicalScore: 0, examScore: 0, isAddedToTotal: false, isBasic: false, showInSchedule: true, gradeLevels: FROM_P4_TO_M3 },
    { name: 'التربية الرياضية', maxScore: 100, minScore: 50, yearWork: 100, practicalScore: 0, examScore: 0, isAddedToTotal: false, isBasic: false, showInSchedule: false, gradeLevels: ALL_GRADES },
    { name: 'الحاسب الآلي وتكنولوجيا المعلومات', maxScore: 100, minScore: 50, yearWork: 20, practicalScore: 20, examScore: 60, isAddedToTotal: false, isBasic: false, showInSchedule: true, gradeLevels: FROM_P4_TO_M3 },
    { name: 'المهارات المهنية', maxScore: 100, minScore: 50, yearWork: 100, practicalScore: 0, examScore: 0, isAddedToTotal: false, isBasic: false, showInSchedule: true, gradeLevels: FROM_P3_TO_P6 },
];

const Settings: React.FC<SettingsProps> = ({ subjects, onUpdate }) => {
  const [activeGroupId, setActiveGroupId] = useState<string>('g_lower_primary');
  const [gradeGroups, setGradeGroups] = useState<GradeGroup[]>([]);
  const [editingSubjects, setEditingSubjects] = useState<Subject[]>([]);
  const [descriptors, setDescriptors] = useState<GradeDescriptor[]>([]);
  const [certConfig, setCertConfig] = useState<CertificateConfig>(db.getCertConfig());
  
  // Auto-Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const isFirstRender = useRef(true);

  // Group Renaming State
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Modals
  const [descriptorModalOpen, setDescriptorModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean; type: 'subject'|'group'; id: string | null; name: string}>({
      isOpen: false, type: 'subject', id: null, name: ''
  });

  // Initial Load
  useEffect(() => {
    setGradeGroups(db.getGradeGroups());
    setDescriptors(db.getGradeDescriptors());
    setCertConfig(db.getCertConfig());
    setEditingSubjects(JSON.parse(JSON.stringify(subjects)));
  }, []);

  // Auto-Save Effect
  useEffect(() => {
    if (isFirstRender.current) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
        db.saveGradeGroups(gradeGroups);
        db.saveGradeDescriptors(descriptors);
        db.saveCertConfig(certConfig);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [gradeGroups, descriptors, certConfig]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSaveStatus('saving');
    const timer = setTimeout(() => {
        onUpdate(editingSubjects);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [editingSubjects]);

  const handleAddGroup = () => {
      const newGroup: GradeGroup = { id: `g_${Date.now()}`, name: 'مجموعة جديدة', grades: [] };
      setGradeGroups(prev => [...prev, newGroup]);
      setActiveGroupId(newGroup.id);
  };

  const startRenaming = (group: GradeGroup) => { setRenamingGroupId(group.id); setRenameValue(group.name); };
  const saveRename = () => { if (renamingGroupId) { setGradeGroups(prev => prev.map(g => g.id === renamingGroupId ? { ...g, name: renameValue } : g)); setRenamingGroupId(null); }};
  const requestDeleteGroup = (group: GradeGroup) => setDeleteConfirm({ isOpen: true, type: 'group', id: group.id, name: group.name });

  const executeDeleteGroup = () => {
      if (deleteConfirm.id) {
          const newGroups = gradeGroups.filter(g => g.id !== deleteConfirm.id);
          setGradeGroups(newGroups);
          setEditingSubjects(prev => prev.filter(s => s.groupId !== deleteConfirm.id));
          if (activeGroupId === deleteConfirm.id && newGroups.length > 0) setActiveGroupId(newGroups[0].id);
          setDeleteConfirm({ isOpen: false, type: 'group', id: null, name: '' });
      }
  };

  const handleGroupGradeToggle = (groupId: string, grade: GradeLevel) => {
      let newGradesList: GradeLevel[] = [];
      const updatedGroups = gradeGroups.map(group => {
          if (group.id === groupId) {
              const current = group.grades || [];
              const isRemoving = current.includes(grade);
              const newGrades = isRemoving ? current.filter(g => g !== grade) : [...current, grade];
              newGradesList = newGrades;
              return { ...group, grades: newGrades };
          }
          return group;
      });
      setGradeGroups(updatedGroups);

      setEditingSubjects(prev => {
          const otherSubjects = prev.filter(s => s.groupId !== groupId);
          const currentInGroup = prev.filter(s => s.groupId === groupId);

          let updatedInGroup = currentInGroup.map(s => ({
              ...s,
              gradeLevels: newGradesList
          }));

          const isAdded = newGradesList.includes(grade);
          if (isAdded) {
              SUBJECT_TEMPLATES.forEach(template => {
                  if (template.gradeLevels?.includes(grade)) {
                      const cleanTemplateName = template.name?.trim() || "";
                      const exists = updatedInGroup.some(s => s.name.trim() === cleanTemplateName);
                      
                      if (!exists) {
                          updatedInGroup.push({
                              id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                              name: cleanTemplateName,
                              maxScore: template.maxScore || 100,
                              minScore: template.minScore || 50,
                              certificateMax: template.maxScore || 100,
                              yearWork: template.yearWork || 0,
                              practicalScore: template.practicalScore || 0,
                              examScore: template.examScore || 0,
                              isAddedToTotal: template.isAddedToTotal || false,
                              isBasic: template.isBasic !== undefined ? template.isBasic : true,
                              showInSchedule: template.showInSchedule !== undefined ? template.showInSchedule : true,
                              stage: 'all',
                              gradeLevels: newGradesList,
                              groupId: groupId
                          });
                      }
                  }
              });
          }

          return [...otherSubjects, ...updatedInGroup];
      });
  };

  const handleDescriptorChange = (id: string, field: keyof GradeDescriptor, value: any) => {
      setDescriptors(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };
  const addDescriptor = () => {
      setDescriptors(prev => [...prev, { id: `desc_${Date.now()}`, label: 'تقدير جديد', minPercent: 0, color: '#000000' }]);
  };
  const removeDescriptor = (id: string) => {
      setDescriptors(prev => prev.filter(d => d.id !== id));
  };

  const handleSubjectChange = (id: string, field: keyof Subject, value: any) => {
    setEditingSubjects(prev => prev.map(s => {
        if (s.id === id) {
            if (field === 'yearWork' || field === 'examScore' || field === 'practicalScore') {
                const yearWork = field === 'yearWork' ? value : s.yearWork;
                const practicalScore = field === 'practicalScore' ? value : (s.practicalScore || 0);
                const examScore = field === 'examScore' ? value : s.examScore;
                
                return { 
                    ...s, 
                    yearWork, 
                    practicalScore, 
                    examScore, 
                    maxScore: (yearWork + practicalScore + examScore), 
                    certificateMax: s.certificateMax || (yearWork + practicalScore + examScore) 
                };
            }
            return { ...s, [field]: value };
        }
        return s;
    }));
  };

  const toggleAddedToTotal = (id: string) => {
      setEditingSubjects(prev => prev.map(s => s.id === id ? { ...s, isAddedToTotal: !s.isAddedToTotal } : s));
  };

  const toggleShowInSchedule = (id: string) => {
      setEditingSubjects(prev => prev.map(s => s.id === id ? { ...s, showInSchedule: !s.showInSchedule } : s));
  };

  const toggleIsBasic = (id: string) => {
    setEditingSubjects(prev => prev.map(s => {
        if (s.id === id) {
            const newIsBasic = !s.isBasic;
            if (!newIsBasic) return { ...s, isBasic: false, isAddedToTotal: false, examScore: 0, practicalScore: 0, yearWork: s.maxScore, minScore: 0, showInSchedule: false };
            else return { ...s, isBasic: true, isAddedToTotal: true, examScore: 60, practicalScore: 0, yearWork: 40, minScore: 50, showInSchedule: true };
        }
        return s;
    }));
  };

  const addSubjectToGroup = (groupId: string) => {
    const group = gradeGroups.find(g => g.id === groupId);
    const newSubject: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: 'مادة جديدة', maxScore: 100, minScore: 50, yearWork: 40, practicalScore: 0, examScore: 60, isAddedToTotal: true, isBasic: true, showInSchedule: true, stage: 'all', gradeLevels: group?.grades || [], groupId: groupId, certificateMax: 100
    };
    setEditingSubjects(prev => [...prev, newSubject]);
  };

  const requestDeleteSubject = (id: string, name: string) => setDeleteConfirm({ isOpen: true, type: 'subject', id, name });
  const executeDeleteSubject = () => {
    if (deleteConfirm.id) {
      setEditingSubjects(prev => prev.filter(s => s.id !== deleteConfirm.id));
      setDeleteConfirm({ isOpen: false, type: 'subject', id: null, name: '' });
    }
  };

  const activeGroup = gradeGroups.find(g => g.id === activeGroupId);
  const groupSubjects = editingSubjects.filter(s => s.groupId === activeGroupId && s.id !== 'sub_total_desc');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Settings2 className="text-blue-600" /> مصفوفة المواد والدرجات
            </h2>
            <p className="text-gray-500 text-sm mt-1">ضبط هيكل الدرجات والتقديرات</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setDescriptorModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition font-bold"
            >
                <Palette size={18} /> التقديرات والألوان
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 transition-all duration-300">
                {saveStatus === 'saving' ? (
                    <>
                        <Loader2 size={16} className="text-blue-600 animate-spin" />
                        <span className="text-sm text-blue-600 font-medium">جارٍ الحفظ...</span>
                    </>
                ) : (
                    <>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-sm text-gray-500 font-medium">تم الحفظ {lastSavedTime}</span>
                    </>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-3">
              <div className="bg-slate-800 text-white p-4 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2"><Layers size={20} /> <span className="font-bold">المجموعات</span></div>
                  <button onClick={handleAddGroup} className="bg-slate-600 hover:bg-slate-500 p-1 rounded transition" title="إضافة مجموعة"><Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                  {gradeGroups.map(group => (
                      <div 
                        key={group.id}
                        onClick={() => setActiveGroupId(group.id)}
                        className={`w-full text-right px-4 py-3 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer border ${activeGroupId === group.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}
                      >
                          {renamingGroupId === group.id ? (
                              <div className="flex items-center gap-2 w-full">
                                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full text-sm p-1 border rounded" autoFocus onClick={(e) => e.stopPropagation()} />
                                  <button onClick={(e) => { e.stopPropagation(); saveRename(); }} className="text-green-600"><Check size={16}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); setRenamingGroupId(null); }} className="text-red-500"><X size={16}/></button>
                              </div>
                          ) : (
                              <>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Folder size={18} className={activeGroupId === group.id ? "text-blue-600" : "text-gray-400"} />
                                    <span className={`truncate font-medium ${activeGroupId === group.id ? "text-blue-700" : "text-gray-600"}`}>{group.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); startRenaming(group); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit3 size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); requestDeleteGroup(group); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                                </div>
                              </>
                          )}
                      </div>
                  ))}
              </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
             {activeGroup && (
                 <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                            <CheckSquare size={18} className="text-blue-600" /> الصفوف الدراسية المرتبطة بـ ({activeGroup.name})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(grade => {
                                const isSelected = activeGroup.grades.includes(grade);
                                return (
                                    <div key={grade} onClick={() => handleGroupGradeToggle(activeGroup.id, grade)} className={`cursor-pointer border rounded-lg p-2.5 flex items-center gap-3 transition-all ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                                        {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        <span className="text-xs">{GRADE_LABELS[grade]}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><RefreshCw size={10}/> عند اختيار صف، سيتم إضافة المواد المقررة عليه تلقائياً إلى هذه المجموعة.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings2 size={20} className="text-indigo-600" /> ضبط درجات الكنترول</h3>
                            <button onClick={() => addSubjectToGroup(activeGroup.id)} className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-md shadow-indigo-200"><Plus size={16} /> إضافة مادة يدوياً</button>
                        </div>

                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-right border-collapse border border-slate-200 text-sm min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="p-3 bg-slate-800 text-white border border-slate-700 w-40 font-bold">البيان / المادة</th>
                                        {groupSubjects.map(sub => (
                                            <th key={sub.id} className="p-2 bg-slate-100 border border-slate-300 min-w-[140px]">
                                                <input type="text" value={sub.name} onChange={(e) => handleSubjectChange(sub.id, 'name', e.target.value)} className="w-full text-center p-2 bg-white border border-slate-200 rounded font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="اسم المادة" />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-3 bg-amber-50 text-amber-800 font-bold border border-amber-100">نوع المادة</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-amber-100 bg-amber-50/30 text-center">
                                                <button onClick={() => toggleIsBasic(sub.id)} className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 mx-auto w-full justify-center ${sub.isBasic ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                    {sub.isBasic ? <BookOpen size={14} className="text-amber-700"/> : <Bookmark size={14} className="text-gray-500"/>} {sub.isBasic ? 'أساسية' : 'إضافية'}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 flex items-center justify-center gap-1"><Calendar size={14}/> تظهر في جدول الامتحانات</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-emerald-100 bg-emerald-50/30 text-center">
                                                <button onClick={() => toggleShowInSchedule(sub.id)} className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 mx-auto ${sub.showInSchedule ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                                                    {sub.showInSchedule ? <ToggleRight className="text-emerald-600"/> : <ToggleLeft className="text-gray-500"/>} {sub.showInSchedule ? 'نعم' : 'لا'}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 font-bold text-gray-700 border border-slate-200">أعمال السنة</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-slate-200">
                                                <input type="number" value={sub.yearWork} onChange={(e) => handleSubjectChange(sub.id, 'yearWork', parseInt(e.target.value) || 0)} className="w-full text-center p-1.5 bg-white border border-gray-200 rounded font-medium focus:ring-2 focus:ring-blue-300 outline-none" />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-teal-50 font-bold text-teal-800 border border-teal-100 flex items-center justify-center gap-1"><Beaker size={14}/> درجة العملي</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-teal-100 bg-teal-50/20">
                                                <input type="number" value={sub.practicalScore || 0} onChange={(e) => handleSubjectChange(sub.id, 'practicalScore', parseInt(e.target.value) || 0)} className="w-full text-center p-1.5 bg-white border border-gray-200 rounded font-medium focus:ring-2 focus:ring-teal-300 outline-none" disabled={!sub.isBasic} />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 font-bold text-gray-700 border border-slate-200">درجة الامتحان</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-slate-200">
                                                <input type="number" value={sub.examScore} onChange={(e) => handleSubjectChange(sub.id, 'examScore', parseInt(e.target.value) || 0)} disabled={!sub.isBasic} className={`w-full text-center p-1.5 border border-gray-200 rounded font-medium focus:ring-2 focus:ring-blue-300 outline-none ${!sub.isBasic ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`} />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 font-bold text-gray-600 border border-slate-200 text-xs">{(certConfig.minExamPassingPercent)}% من التحريري</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-slate-200 text-gray-500 font-mono">{(sub.examScore * (certConfig.minExamPassingPercent / 100)).toFixed(1)}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-red-50 text-red-800 font-bold border border-red-100">النهاية العظمى (داخلي)</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-red-100 bg-red-50/30">
                                                <div className="font-bold text-lg text-red-600">{sub.maxScore}</div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-purple-50 text-purple-800 font-bold border border-purple-100">النهاية العظمى في الشهادة<br/><span className="text-[10px] font-normal">(الدرجة الفعلية)</span></td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-purple-100 bg-purple-50/30">
                                                <input 
                                                    type="number" 
                                                    value={sub.certificateMax || sub.maxScore} 
                                                    onChange={(e) => handleSubjectChange(sub.id, 'certificateMax', parseInt(e.target.value) || 0)}
                                                    className="w-full text-center p-1.5 border border-purple-200 rounded font-bold text-purple-700 focus:ring-2 focus:ring-purple-300 outline-none bg-white"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-blue-50 text-blue-800 font-bold border border-blue-100">النهاية الصغرى</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-blue-100 bg-blue-50/30">
                                                <input type="number" value={sub.minScore} onChange={(e) => handleSubjectChange(sub.id, 'minScore', parseInt(e.target.value) || 0)} disabled={!sub.isBasic} className={`w-full text-center p-1.5 border border-blue-200 rounded font-bold text-blue-600 focus:ring-2 focus:ring-blue-300 outline-none ${!sub.isBasic ? 'bg-gray-100 text-gray-400' : 'bg-white'}`} />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-indigo-50 text-indigo-800 font-bold border border-indigo-100">تضاف للمجموع</td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-indigo-100 bg-indigo-50/30 text-center">
                                                <button onClick={() => toggleAddedToTotal(sub.id)} disabled={!sub.isBasic} className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 mx-auto ${sub.isAddedToTotal ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'} ${!sub.isBasic ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    {sub.isAddedToTotal ? <ToggleRight className="text-green-600"/> : <ToggleLeft className="text-gray-500"/>} {sub.isAddedToTotal ? 'نعم' : 'لا'}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-gray-50 border border-gray-200"></td>
                                        {groupSubjects.map(sub => (
                                            <td key={sub.id} className="p-2 border border-gray-200 text-center bg-gray-50">
                                                <button onClick={() => requestDeleteSubject(sub.id, sub.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition"><Trash2 size={18} /></button>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                            {groupSubjects.length === 0 && <div className="p-12 text-center text-gray-400 border-2 border-dashed rounded-lg mt-4">لا توجد مواد مضافة لهذه المجموعة. اختر الصفوف لإضافة المواد تلقائياً أو اضغط على "إضافة مادة يدوياً".</div>}
                        </div>
                    </div>
                 </>
             )}
          </div>
      </div>

      {descriptorModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <Palette size={20} className="text-purple-600"/> إعدادات التقديرات وحدود النجاح
                      </h3>
                      <button onClick={() => setDescriptorModalOpen(false)} className="text-gray-500 hover:text-red-500"><X size={20}/></button>
                  </div>
                  <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                      {/* Global Passing Thresholds */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="col-span-full mb-1 flex items-center gap-2 text-blue-800">
                             <ShieldAlert size={18}/>
                             <span className="font-black text-sm">حدود النجاح العامة للنظام</span>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-blue-700 mb-2">الحد الأدنى للنجاح في المادة / المجموع (%):</label>
                              <div className="flex items-center gap-3">
                                  <input 
                                    type="number" 
                                    value={certConfig.minPassingPercent} 
                                    onChange={(e) => setCertConfig({...certConfig, minPassingPercent: parseInt(e.target.value) || 50})}
                                    className="w-full p-2.5 border-2 border-blue-200 rounded-lg text-center font-black text-blue-900 focus:border-blue-500 outline-none"
                                  />
                                  <span className="text-blue-600 font-bold">%</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-blue-700 mb-2">شرط الحد الأدنى لورقة التحريري (%):</label>
                              <div className="flex items-center gap-3">
                                  <input 
                                    type="number" 
                                    value={certConfig.minExamPassingPercent} 
                                    onChange={(e) => setCertConfig({...certConfig, minExamPassingPercent: parseInt(e.target.value) || 30})}
                                    className="w-full p-2.5 border-2 border-blue-200 rounded-lg text-center font-black text-blue-900 focus:border-blue-500 outline-none"
                                  />
                                  <span className="text-blue-600 font-bold">%</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-gray-700 flex items-center gap-2"><Palette size={16}/> حدود التقديرات والألوان</h4>
                          <button onClick={addDescriptor} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"><Plus size={14}/> إضافة تقدير</button>
                      </div>

                      <div className="space-y-3">
                          {descriptors.sort((a,b) => b.minPercent - a.minPercent).map(desc => (
                              <div key={desc.id} className="flex gap-3 items-center bg-white p-3 rounded-xl border-2 hover:border-blue-100 transition-all group">
                                  <div className="relative">
                                      <input 
                                        type="color" 
                                        value={desc.color} 
                                        onChange={(e) => handleDescriptorChange(desc.id, 'color', e.target.value)}
                                        className="w-12 h-12 p-0 border-0 rounded-full cursor-pointer shadow-sm overflow-hidden"
                                      />
                                      <div className="absolute inset-0 rounded-full border-2 border-white pointer-events-none ring-1 ring-black/5"></div>
                                  </div>
                                  
                                  <div className="flex-1">
                                      <input 
                                        type="text" 
                                        value={desc.label} 
                                        onChange={(e) => handleDescriptorChange(desc.id, 'label', e.target.value)}
                                        className="w-full p-2 border-b-2 border-transparent focus:border-blue-500 text-sm font-black text-gray-800 outline-none bg-transparent"
                                        placeholder="اسم التقدير"
                                      />
                                  </div>

                                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border">
                                      <span className="text-gray-500 text-[10px] font-black">أكبر من أو يساوي</span>
                                      <input 
                                        type="number" 
                                        value={desc.minPercent} 
                                        onChange={(e) => handleDescriptorChange(desc.id, 'minPercent', parseInt(e.target.value))}
                                        className="w-14 bg-white border rounded text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-200"
                                      />
                                      <span className="text-gray-500 text-sm font-bold">%</span>
                                  </div>

                                  <button 
                                      onClick={() => removeDescriptor(desc.id)} 
                                      className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                      title="حذف"
                                  >
                                      <Trash2 size={18}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                      
                      <div className="mt-8 text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-dashed flex items-start gap-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <p>ملاحظة: يتم ترتيب التقديرات تلقائياً من الأعلى للأدنى. تأكد من تغطية كافة النطاقات من 0% وحتى 100% لضمان ظهور التقديرات بشكل صحيح في الشهادات.</p>
                      </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
                      <button onClick={() => setDescriptorModalOpen(false)} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">حفظ وإغلاق</button>
                  </div>
              </div>
          </div>
      )}

      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{deleteConfirm.type === 'group' ? 'حذف المجموعة' : 'حذف المادة'}</h3>
                <p className="text-gray-600 mb-6 text-sm whitespace-pre-line">{deleteConfirm.type === 'group' ? `هل أنت متأكد من حذف مجموعة "${deleteConfirm.name}"؟\nسيتم حذف جميع المواد والإعدادات المرتبطة بها.` : `هل أنت متأكد من حذف مادة "${deleteConfirm.name}"؟`}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setDeleteConfirm({ isOpen: false, type: 'subject', id: null, name: '' })} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition">إلغاء</button>
                    <button onClick={deleteConfirm.type === 'group' ? executeDeleteGroup : executeDeleteSubject} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition shadow-lg shadow-red-200">تأكيد الحذف</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
