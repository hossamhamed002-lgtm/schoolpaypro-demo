
import React, { useState, useMemo } from 'react';
import { 
  Users, Search, RefreshCw, 
  Phone, MessageCircle, Hash, 
  User, CheckCircle2, ChevronLeft, ChevronRight,
  Info
} from 'lucide-react';
import { StudentMaster } from '../../types';
import { useAcademicYear } from '../../contexts/AcademicYearContext';

const ParentsListTab: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang, parents = [], students = [], generateParents } = store;
  const isRtl = lang === 'ar';
  const { selectedYearId } = useAcademicYear();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const parentsWithActiveChildren = useMemo(() => {
    if (!selectedYearId) return parents;

    const activeKeys = new Set<string>();
    students.forEach((student: StudentMaster) => {
      if (student.Academic_Year_ID !== selectedYearId) return;
      const father = student.Father;
      const mother = student.Mother;

      [father?.Parent_ID, father?.National_ID, mother?.Parent_ID, mother?.National_ID].forEach((identifier) => {
        if (identifier) {
          activeKeys.add(identifier);
        }
      });
    });

    return parents.filter((parent: any) => 
      Boolean(
        parent.Parent_ID && activeKeys.has(parent.Parent_ID) ||
        parent.National_ID && activeKeys.has(parent.National_ID)
      )
    );
  }, [parents, students, selectedYearId]);

  const filtered = useMemo(() => {
    return parentsWithActiveChildren.filter((p: any) => 
      (p.Name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.National_ID || '').includes(searchTerm) ||
      (p.Mobile || '').includes(searchTerm)
    );
  }, [parentsWithActiveChildren, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleGenerate = () => {
    if (confirm(isRtl ? 'سيتم توليد قائمة الآباء بناءً على بيانات الطلاب المسجلين. هل تريد الاستمرار؟' : 'Parents list will be generated based on enrolled students. Continue?')) {
      generateParents();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700 text-start pb-20">
      
      {/* Tool Header */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button 
            onClick={handleGenerate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all group"
          >
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> 
            {isRtl ? 'توليد قائمة الآباء' : 'Generate Parents'}
          </button>
          
          <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 hidden md:block">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              {isRtl ? `إجمالي السجلات: ${parentsWithActiveChildren.length}` : `Total Records: ${parentsWithActiveChildren.length}`}
            </p>
          </div>
        </div>

        <div className="relative flex-1 max-w-xl w-full">
          <Search className={`absolute inset-y-0 ${isRtl ? 'right-5' : 'left-5'} my-auto text-slate-300`} size={20} />
          <input 
            type="text" 
            placeholder={isRtl ? 'البحث بالاسم، الرقم القومي أو الهاتف...' : 'Search by name, ID or phone...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-transparent rounded-[1.5rem] pr-14 pl-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Parents Table */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto relative flex-1">
          <table className="w-full text-start border-collapse min-w-max">
            <thead className="sticky top-0 z-30 bg-slate-900 text-white">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'كود الأب' : 'Father Code'}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'الاسم' : 'Name'}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'الرقم القومي' : 'National ID'}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'الموبايل' : 'Mobile'}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-start">{isRtl ? 'واتس' : 'WhatsApp'}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center bg-indigo-600">{isRtl ? 'عدد الأبناء' : 'Children'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-bold text-slate-700 text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center opacity-30 italic font-black text-xl">
                    {isRtl ? 'لا توجد بيانات متاحة. اضغط "توليد" لسحب البيانات من الطلاب' : 'No data. Click "Generate" to pull data from students'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((p: any) => (
                  <tr key={p.Parent_ID} className="group hover:bg-slate-50 transition-all cursor-default">
                    <td className="px-8 py-5 font-mono text-[11px] text-indigo-500 uppercase tracking-tighter">#{p.Parent_ID.slice(-8)}</td>
                    <td className="px-8 py-5 text-slate-900 whitespace-nowrap">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                             <User size={16} />
                          </div>
                          {p.Name || '---'}
                       </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-[13px] text-slate-400">{p.National_ID}</td>
                    <td className="px-8 py-5 font-mono text-indigo-600 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-300" />
                          {p.Mobile || '---'}
                       </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-emerald-600 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                          <MessageCircle size={14} className="text-slate-300" />
                          {p.WhatsApp || '---'}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black">
                          {p.childrenCount || 0}
                       </span>
                    </td>
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
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className={`p-3 rounded-xl border transition-all ${currentPage === 1 ? 'bg-white text-slate-200 border-slate-100 cursor-not-allowed' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                >
                  <ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} />
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className={`p-3 rounded-xl border transition-all ${currentPage === totalPages ? 'bg-white text-slate-200 border-slate-100 cursor-not-allowed' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                >
                  <ChevronLeft size={18} className={isRtl ? '' : 'rotate-180'} />
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Warning Box */}
      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-start gap-4">
         <Info className="text-amber-500 shrink-0 mt-1" />
         <div className="text-start">
            <p className="text-xs font-black text-amber-900 uppercase tracking-widest">ملاحظة تقنية</p>
            <p className="text-xs font-bold text-amber-700 leading-relaxed mt-1">
               {isRtl ? 'يتم دمج أولياء الأمور الذين يتشاركون في نفس الرقم القومي في سجل واحد تلقائياً، مع الحفاظ على كافة الأبناء المرتبطين بهم.' : 'Parents sharing the same National ID are merged into a single record automatically, while linking all their children.'}
            </p>
         </div>
      </div>
    </div>
  );
};

export default ParentsListTab;
