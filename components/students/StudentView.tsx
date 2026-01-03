import React, { useState } from 'react';
import { 
  Users, 
  ArrowLeftRight, 
  ListChecks, 
  FileInput, 
  Database, 
  ChevronLeft,
  FileBarChart,
  GraduationCap,
  Info,
  CalendarDays
} from 'lucide-react';
import StudentsListTab from './StudentsListTab';
import StudentReportsTab from './StudentReportsTab';
import ParentsListTab from './ParentsListTab';
import StudentPromotion from './StudentPromotion';
import EnrolledStudents from './EnrolledStudents';
import StudentAttendanceScreen from './StudentAttendanceScreen';
import { useStudentAccounts } from '../../hooks/useStudentAccounts';

type StudentSubScreen = 'hub' | 'enrolled' | 'transferred' | 'parents' | 'requests' | 'promotion' | 'reports' | 'attendance';

const StudentView: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const [activeScreen, setActiveScreen] = useState<StudentSubScreen>('hub');

  useStudentAccounts(
    store.allStudents || store.students || [],
    store.workingYearId || store.activeYear?.Year_ID,
    store.classes,
    store.years
  );

  // تعريف البطاقات كما في الصورة
  const hubCards = [
    { id: 'enrolled', label: isRtl ? 'الطلاب المقيدون' : 'Enrolled Students', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'transferred', label: isRtl ? 'الطلاب المحولون' : 'Transferred Students', icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'parents', label: isRtl ? 'قائمة الآباء' : 'Parents List', icon: ListChecks, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'requests', label: isRtl ? 'طلبات الالتحاق' : 'Enrollment Requests', icon: FileInput, color: 'text-sky-500', bg: 'bg-sky-50' },
    { id: 'promotion', label: isRtl ? 'ترحيل الطلاب' : 'Students Promotion', icon: Database, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'reports', label: isRtl ? 'تقارير الطلاب' : 'Student Reports', icon: FileBarChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'attendance', label: isRtl ? 'غياب  الطلاب  ' : 'Attendance', icon: CalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-50' }
  ];

  const renderContent = () => {
    switch (activeScreen) {
      case 'enrolled':
        return <EnrolledStudents store={store} />;
      case 'transferred':
        // تفعيل وضع المحولين لإظهار البيانات المفلترة تلقائياً
        return <StudentsListTab store={store} isTransferredMode={true} />;
      case 'parents':
        return <ParentsListTab store={store} />;
      case 'reports':
        return <StudentReportsTab store={store} />;
      case 'promotion':
        return <StudentPromotion store={store} />;
      case 'attendance':
        return <StudentAttendanceScreen store={store} />;
      case 'hub':
        return (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hubCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setActiveScreen(card.id as StudentSubScreen)}
                className="group bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[12rem]"
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 ${card.bg} rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-3xl`}></div>
                
                <div className={`w-20 h-20 ${card.bg} ${card.color} rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                  <card.icon size={36} />
                </div>
                
                <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {card.label}
                </h3>
              </button>
            ))}
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mb-8">
              <Info size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {hubCards.find(c => c.id === activeScreen)?.label}
            </h3>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {isRtl ? 'هذا القسم قيد التفعيل البرمجي حالياً ضمن تحديثات النظام القادمة' : 'This section is currently being activated in future system updates'}
            </p>
            <button 
              onClick={() => setActiveScreen('hub')}
              className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-colors"
            >
              {isRtl ? 'العودة للمركز الرئيسي' : 'Back to Hub'}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 text-start">
          {activeScreen !== 'hub' && (
            <button 
              onClick={() => setActiveScreen('hub')}
              className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
            >
              <ChevronLeft size={24} className={`${isRtl ? 'rotate-180' : ''} group-hover:-translate-x-1 transition-transform`} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20">
                <GraduationCap size={24} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.students}</h2>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-1 ps-1 flex items-center gap-2">
              {isRtl ? 'الرئيسية' : 'Main'} 
              <span className="text-slate-300">/</span> 
              <span className="text-indigo-600 font-bold">
                {activeScreen === 'hub' ? (isRtl ? 'شؤون الطلاب' : 'Student Affairs') : hubCards.find(c => c.id === activeScreen)?.label}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Info Alert Box as seen in image */}
      {activeScreen === 'hub' && (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[1.5rem] flex items-start gap-4 text-start animate-in slide-in-from-top-2 duration-700">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <Info size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-black text-amber-900 leading-tight">
              {isRtl ? 'هذه القائمة تحتوي على أوامر تخص شئون الطلاب فقط (الطلاب - أولياء الأمور - المحولين - ترحيل الطلاب).' : 'This menu contains commands specific to Student Affairs only (Students - Parents - Transfers - Promotion).'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default StudentView;
