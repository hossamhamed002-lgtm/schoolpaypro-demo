
import React, { useState, useMemo, useEffect } from 'react';
import { Grid, Plus, Trash2, Users, Wand2, Printer, CheckCircle2, Info } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS, ExamCommittee } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onUpdateStudents?: (students: Student[]) => void;
}

const SecondRoleCommittees: React.FC<Props> = ({ students, subjects, grades, onUpdateStudents }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const [committees, setCommittees] = useState<ExamCommittee[]>([]);
  const [newComm, setNewComm] = useState({ name: '', location: '', capacity: 20 });
  
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  useEffect(() => {
    setCommittees(db.getSecondRoleCommittees());
  }, []);

  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const saveToDb = (newList: ExamCommittee[]) => {
      setCommittees(newList);
      db.saveSecondRoleCommittees(newList);
  };

  const r2Students = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
    const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);

    return gradeStudents.filter(st => {
      const stGrades = grades[st.id] || {};
      let hasFail = false;
      gradeSubjects.forEach(sub => {
        const rec = stGrades[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1 + t2) / 2;
        
        if (selectedGrade === 'p1' || selectedGrade === 'p2') {
            if (annualAvg < sub.maxScore * 0.5) hasFail = true;
        } else {
            const isAbs = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1);
            const passedWritten = (sub.examScore === 0) || (safeVal(rec?.term2?.exam) >= sub.examScore * EXAM_THRESHOLD);
            if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) hasFail = true;
        }
      });
      return hasFail;
    }).sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  }, [students, grades, selectedGrade, subjects, certConfig]);

  const addCommittee = () => {
      if (!newComm.name || !newComm.location) return;
      const item: ExamCommittee = { id: `r2_comm_${Date.now()}`, name: newComm.name, location: newComm.location, capacity: newComm.capacity, gradeLevel: selectedGrade };
      saveToDb([...committees, item]);
      setNewComm({ name: '', location: '', capacity: 20 });
  };

  const removeCommittee = (id: string) => {
      saveToDb(committees.filter(c => c.id !== id));
      if (onUpdateStudents) {
          const updated = students.map(s => s.committeeIdSecondRole === id ? { ...s, committeeIdSecondRole: null } : s);
          onUpdateStudents(updated);
      }
  };

  const autoDistribute = () => {
      if (!onUpdateStudents) return;
      const gradeComms = committees.filter(c => c.gradeLevel === selectedGrade);
      if (gradeComms.length === 0) { alert("يرجى إضافة لجان لهذا الصف أولاً"); return; }
      
      let currentIdx = 0;
      const distributionMap = new Map<string, string>();
      gradeComms.forEach(comm => {
          for (let i = 0; i < comm.capacity; i++) {
              if (currentIdx >= r2Students.length) break;
              distributionMap.set(r2Students[currentIdx].id, comm.id);
              currentIdx++;
          }
      });

      const updated = students.map(s => {
          if (distributionMap.has(s.id)) return { ...s, committeeIdSecondRole: distributionMap.get(s.id) };
          if (s.gradeLevel === selectedGrade) return { ...s, committeeIdSecondRole: null };
          return s;
      });
      onUpdateStudents(updated);
      alert(`تم بنجاح توزيع ${distributionMap.size} طالب على اللجان المحددة.`);
  };

  return (
    <div className="space-y-6">
      {/* التنبيه الخاص برقم الجلوس */}
      <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-l-xl flex items-center gap-3 text-blue-800 shadow-sm no-print">
          <Info size={24} className="shrink-0" />
          <div>
              <p className="font-black text-sm">تذكير هام حول أرقام الجلوس</p>
              <p className="text-xs opacity-90 font-bold">يعتمد النظام تلقائياً أرقام جلوس الدور الأول لطلاب الدور الثاني. لا حاجة لتوليد أرقام جديدة.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6 h-fit">
              <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><Grid size={24}/></div>
                  <h3 className="font-bold text-gray-800">إدارة لجان الدور الثاني</h3>
                  <p className="text-[10px] text-gray-400">تأكد من توزيع الطلاب بعد إنشاء اللجان</p>
              </div>
              <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-500">اختر الصف:</span>
                  <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded-lg p-2 bg-gray-50 font-bold text-blue-700 outline-none">
                      {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                  </select>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 space-y-3">
                  <h4 className="text-sm font-bold text-gray-700">لجنة جديدة</h4>
                  <input type="text" placeholder="اسم اللجنة" value={newComm.name} onChange={e => setNewComm({...newComm, name: e.target.value})} className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-emerald-400" />
                  <input type="text" placeholder="المقر (الفصل)" value={newComm.location} onChange={e => setNewComm({...newComm, location: e.target.value})} className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-emerald-400" />
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">السعة:</span>
                      <input type="number" value={newComm.capacity} onChange={e => setNewComm({...newComm, capacity: parseInt(e.target.value)})} className="w-20 p-2 border rounded text-center font-bold" />
                  </div>
                  <button onClick={addCommittee} className="w-full py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2"><Plus size={16}/> إضافة اللجنة</button>
              </div>
              <button onClick={autoDistribute} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2"><Wand2 size={18}/> توزيع المرحلين تلقائياً</button>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
              <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-gray-800"><Users size={20} className="text-blue-600"/> اللجان المضافة لـ {GRADE_LABELS[selectedGrade]}</h3>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">عدد المرحلين: {r2Students.length}</span>
              </div>
              <div className="divide-y overflow-y-auto max-h-[500px] custom-scrollbar">
                  {committees.filter(c => c.gradeLevel === selectedGrade).map(comm => {
                      const count = students.filter(s => s.committeeIdSecondRole === comm.id).length;
                      return (
                          <div key={comm.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                              <div className="space-y-1">
                                  <p className="font-black text-lg text-gray-800">{comm.name}</p>
                                  <p className="text-sm text-gray-500 flex items-center gap-2"><span>المقر: {comm.location}</span> | <span>السعة: {comm.capacity}</span></p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="text-center px-4 py-1.5 rounded-lg border-2 border-blue-50 bg-blue-50/20">
                                      <p className="text-[10px] text-blue-400 font-bold uppercase">الموزعين</p>
                                      <p className={`font-black text-xl ${count === comm.capacity ? 'text-red-600' : 'text-blue-700'}`}>{count}</p>
                                  </div>
                                  <button onClick={() => removeCommittee(comm.id)} className="p-2 text-gray-300 hover:text-red-600 transition"><Trash2 size={20}/></button>
                              </div>
                          </div>
                      );
                  })}
                  {committees.filter(c => c.gradeLevel === selectedGrade).length === 0 && (
                      <div className="p-20 text-center text-gray-400 italic">لا توجد لجان مضافة بعد</div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default SecondRoleCommittees;
