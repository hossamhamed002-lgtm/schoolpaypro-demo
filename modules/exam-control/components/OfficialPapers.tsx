
import React, { useState, useEffect } from 'react';
import { FileStack, Printer, FileText, Layout, Info, X, Users, ClipboardList, UserX, UserMinus, BookCheck, ClipboardCheck, DoorOpen, CalendarDays, ClipboardPaste, ListChecks, FileDown, Loader2, MoveHorizontal } from 'lucide-react';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';
import { GRADE_LABELS, GradeLevel, ExamCommittee, Student, Subject } from '../examControl.types';

// استيراد المكونات الفرعية
import CommitteeCover from './OfficialPapers/CommitteeCover';
import EnvelopeCover from './OfficialPapers/EnvelopeCover';
import CommitteeSign from './OfficialPapers/CommitteeSign';
import OpeningMinute from './OfficialPapers/OpeningMinute';
import ConflictUndertaking from './OfficialPapers/ConflictUndertaking';
import AbsentList from './OfficialPapers/AbsentList';
import ObserversDistribution from './OfficialPapers/ObserversDistribution';
import TotalAbsenceForm from './OfficialPapers/TotalAbsenceForm';
import IndividualAbsenceForm from './OfficialPapers/IndividualAbsenceForm';
import SubjectCorrectionForm from './OfficialPapers/SubjectCorrectionForm';
import SubjectCorrectionMinute from './OfficialPapers/SubjectCorrectionMinute';
import ControlRoomMinute from './OfficialPapers/ControlRoomMinute';
import CombinedExamSchedule from './OfficialPapers/CombinedExamSchedule';
import SortingAssignmentForm from './OfficialPapers/SortingAssignmentForm';
import AnnualWorkSheet from './OfficialPapers/AnnualWorkSheet';

type DocType = 'committee_cover' | 'envelope' | 'committee_sign' | 'opening_minute' | 'absent_list' | 'conflict_undertaking' | 'observers_distribution' | 'total_absence' | 'individual_absence' | 'subject_correction' | 'correction_minute' | 'control_room_minute' | 'combined_schedule' | 'sorting_assignment' | 'annual_work_sheet';

const OfficialPapers: React.FC<{ allowedReportIds?: string[] }> = ({ allowedReportIds = [] }) => {
    const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p4');
    const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');
    const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [isExporting, setIsExporting] = useState(false);
    const [printMargin, setPrintMargin] = useState(5);
    
    const [allCommittees, setAllCommittees] = useState<ExamCommittee[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const schoolInfo = db.getSchoolInfo();

    useEffect(() => {
        setAllCommittees(db.getCommittees());
        setAllStudents(db.getStudents());
        setAllSubjects(db.getSubjects());
    }, []);

    const filteredCommittees = allCommittees.filter(c => c.gradeLevel === selectedGrade);
    const filteredSubjects = allSubjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);
    const availableClasses = Array.from(new Set(allStudents.filter(s => s.gradeLevel === selectedGrade).map(s => s.classroom))).sort();

    const isAllowed = allowedReportIds.length === 0 || allowedReportIds.includes('EXM-RPT-OFFICIAL');

    const documents = [
        { id: 'annual_work_sheet' as DocType, title: 'كشف مجمع أعمال السنة', icon: ListChecks, category: 'شئون طلبة', color: 'bg-emerald-50 text-emerald-700', orientation: 'portrait' as const },
        { id: 'sorting_assignment' as DocType, title: 'تكليف فرز الأوراق', icon: ClipboardPaste, category: 'لوجستيات', color: 'bg-emerald-50 text-emerald-700', orientation: 'portrait' as const },
        { id: 'combined_schedule' as DocType, title: 'جدول الامتحانات المجمع', icon: CalendarDays, category: 'لوجستيات', color: 'bg-blue-50 text-blue-700', orientation: 'portrait' as const },
        { id: 'control_room_minute' as DocType, title: 'محضر فتح/غلق الكنترول', icon: DoorOpen, category: 'محاضر رسمية', color: 'bg-indigo-50 text-indigo-700', orientation: 'portrait' as const },
        { id: 'correction_minute' as DocType, title: 'محضر تصحيح مادة', icon: ClipboardCheck, category: 'شئون معلمين', color: 'bg-cyan-50 text-cyan-700', orientation: 'portrait' as const },
        { id: 'subject_correction' as DocType, title: 'لجنة تصحيح مادة', icon: BookCheck, category: 'شئون معلمين', color: 'bg-emerald-50 text-emerald-700', orientation: 'portrait' as const },
        { id: 'observers_distribution' as DocType, title: 'توزيع الملاحظين', icon: ClipboardList, category: 'شئون معلمين', color: 'bg-rose-50 text-rose-700', orientation: 'portrait' as const },
        { id: 'individual_absence' as DocType, title: 'استمارة غياب فردي', icon: UserMinus, category: 'شئون طلبة', color: 'bg-orange-50 text-orange-700', orientation: 'portrait' as const },
        { id: 'total_absence' as DocType, title: 'استمارة غياب إجمالي', icon: UserX, category: 'شئون طلبة', color: 'bg-amber-50 text-amber-700', orientation: 'portrait' as const },
        { id: 'committee_cover' as DocType, title: 'غلاف لجان (رسمي)', icon: Users, category: 'لوجستيات', color: 'bg-indigo-50 text-indigo-700', orientation: 'portrait' as const },
        { id: 'envelope' as DocType, title: 'غلاف مظروف أسئلة', icon: FileText, category: 'لوجستيات', color: 'bg-blue-50 text-blue-700', orientation: 'portrait' as const },
        { id: 'committee_sign' as DocType, title: 'يافطة لجنة طلابية', icon: Layout, category: 'لوجستيات', color: 'bg-emerald-50 text-emerald-700', orientation: 'portrait' as const },
        { id: 'opening_minute' as DocType, title: 'محضر فتح مظاريف', icon: Info, category: 'محاضر رسمية', color: 'bg-orange-50 text-orange-700', orientation: 'portrait' as const },
        { id: 'conflict_undertaking' as DocType, title: 'إقرار موانع (قرابة)', icon: Info, category: 'محاضر رسمية', color: 'bg-purple-50 text-purple-700', orientation: 'portrait' as const },
        { id: 'absent_list' as DocType, title: 'كشف غياب فارغ', icon: FileText, category: 'نماذج فارغة', color: 'bg-slate-50 text-slate-700', orientation: 'portrait' as const },
    ];

    const currentDocInfo = documents.find(d => d.id === selectedDoc);

    const renderSelectedDoc = () => {
        const props = { schoolInfo, selectedGrade, selectedTerm, selectedSubjectId, selectedClass };
        const selectedCommittee = allCommittees.find(c => c.id === selectedCommitteeId) || null;

        switch (selectedDoc) {
            case 'annual_work_sheet': return <AnnualWorkSheet {...props} />;
            case 'sorting_assignment': return <SortingAssignmentForm schoolInfo={schoolInfo} />;
            case 'combined_schedule': return <CombinedExamSchedule schoolInfo={schoolInfo} selectedTerm={selectedTerm} />;
            case 'control_room_minute': return <ControlRoomMinute schoolInfo={schoolInfo} />;
            case 'correction_minute': return <SubjectCorrectionMinute {...props} />;
            case 'subject_correction': return <SubjectCorrectionForm {...props} />;
            case 'individual_absence': return <IndividualAbsenceForm {...props} />;
            case 'total_absence': return <TotalAbsenceForm {...props} />;
            case 'observers_distribution': return <ObserversDistribution {...props} />;
            case 'committee_cover': return <CommitteeCover {...props} committee={selectedCommittee} students={allStudents} />;
            case 'envelope': return <EnvelopeCover {...props} />;
            case 'committee_sign': return <CommitteeSign {...props} />;
            case 'opening_minute': return <OpeningMinute {...props} />;
            case 'conflict_undertaking': return <ConflictUndertaking schoolInfo={schoolInfo} />;
            case 'absent_list': return <AbsentList {...props} />;
            default: return null;
        }
    };

    const handlePrint = () => {
        exportUtils.print('exam-print-root', 'portrait', printMargin);
    };

    const handleExportPDF = () => {
        setIsExporting(true);
        const fileName = currentDocInfo?.title || 'وثيقة_مدرسية';
        exportUtils.exportToPDF('print-paper', fileName, 'portrait', printMargin)
            .finally(() => setIsExporting(false));
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {!isAllowed && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-slate-400 font-bold">
                    غير مصرح لك بعرض المطبوعات الرسمية
                </div>
            )}
            {isAllowed && (
            <>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileStack className="text-blue-600" /> الورقيات والمطبوعات الرسمية
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-bold italic">جميع المطبوعات مجهزة للطباعة بالوضع الطولي A4 مع احتواء آلي للنصوص</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
                {documents.map((doc) => (
                    <div 
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc.id)}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group flex flex-col items-center text-center"
                    >
                        <div className={`w-16 h-16 ${doc.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <doc.icon size={32} />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{doc.title}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{doc.category}</p>
                    </div>
                ))}
            </div>

            {selectedDoc && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-4 md:p-8 flex flex-col no-print">
                    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                        <div className="flex flex-col md:flex-row justify-between items-center text-white mb-6 gap-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Printer size={24} /> {currentDocInfo?.title}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                {/* وحدة التحكم في الهامش */}
                                <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-xl border border-white/20">
                                    <span className="text-[10px] font-bold text-white/60 flex items-center gap-1">
                                        <MoveHorizontal size={14}/> الهامش:
                                    </span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="30" 
                                        value={printMargin} 
                                        onChange={(e) => setPrintMargin(parseInt(e.target.value))} 
                                        className="w-24 accent-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono font-bold w-10">{printMargin}mm</span>
                                </div>

                                {selectedDoc === 'annual_work_sheet' && (
                                    <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                        <span className="text-[10px] font-bold text-emerald-300">الفصل:</span>
                                        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="bg-transparent text-emerald-100 font-black outline-none cursor-pointer text-sm">
                                            <option value="all" className="text-black">كل الفصول</option>
                                            {availableClasses.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                                        </select>
                                    </div>
                                )}

                                {selectedDoc !== 'combined_schedule' && selectedDoc !== 'sorting_assignment' && (
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                                        <span className="text-[10px] font-bold text-white/60">الصف:</span>
                                        <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value as GradeLevel); setSelectedSubjectId(''); setSelectedCommitteeId(''); setSelectedClass('all'); }} className="bg-transparent text-white font-bold outline-none cursor-pointer text-sm">
                                            {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g} className="text-black">{GRADE_LABELS[g]}</option>)}
                                        </select>
                                    </div>
                                )}

                                {selectedDoc !== 'sorting_assignment' && (
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                                        <span className="text-[10px] font-bold text-white/60">الفصل:</span>
                                        <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value as any)} className="bg-transparent text-white font-bold outline-none cursor-pointer text-sm">
                                            <option value="term1" className="text-black">الفصل الدراسي الأول</option>
                                            <option value="term2" className="text-black">الفصل الدراسي الثاني</option>
                                        </select>
                                    </div>
                                )}

                                {(selectedDoc === 'subject_correction' || selectedDoc === 'correction_minute' || selectedDoc === 'opening_minute') && (
                                    <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                        <span className="text-[10px] font-bold text-emerald-300">المادة:</span>
                                        <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="bg-transparent text-emerald-100 font-black outline-none cursor-pointer text-sm">
                                            <option value="" className="text-black">-- اختر المادة --</option>
                                            {filteredSubjects.map(s => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="w-px h-6 bg-white/20 mx-2"></div>

                                <button 
                                    onClick={handleExportPDF} 
                                    disabled={isExporting}
                                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} PDF
                                </button>

                                <button 
                                    onClick={handlePrint} 
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2"
                                >
                                    <Printer size={18} /> طباعة
                                </button>
                                
                                <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-white/10 rounded-full transition">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-200/50 rounded-3xl p-4 md:p-10 overflow-auto flex justify-center custom-scrollbar">
                            <div className="bg-white shadow-2xl origin-top transform scale-100 w-[210mm] min-h-[297mm]">
                                {renderSelectedDoc()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default OfficialPapers;
