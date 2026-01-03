import React, { useMemo, useState } from 'react';
import { 
  BarChart3, FileBarChart, TrendingUp, 
  Calculator, BookOpen, Layers, 
  ChevronLeft, GraduationCap, Smile, FileSpreadsheet, 
  FilePieChart, Repeat, ClipboardList, LayoutGrid, School, BookMarked,
  Star, FileWarning,
  /* Added AlertTriangle to the imports */
  AlertTriangle,
} from 'lucide-react';
import { Student, Subject, GradesDatabase } from '../examControl.types';
import { exportUtils } from '../services/exportUtils';
import PrintOverlay from './PrintOverlay';

import GeneralStatistics from './GeneralStatistics';
import SubjectPerformanceStats from './SubjectPerformanceStats';
import HighAchievers65Stats from './HighAchievers65Stats';
import SecondRoleNumericalStats from './SecondRoleNumericalStats';
import SpecificGradeSecondRoleStats from './SpecificGradeSecondRoleStats';
import Primary1And2Stats from './Primary1And2Stats';
import PrimaryTermStats from './PrimaryTermStats';
import MiddleTermStats from './MiddleTermStats';
import PrimaryRoundStats from './PrimaryRoundStats';
import MiddleRoundStats from './MiddleRoundStats';
import PrimaryFinalStats from './PrimaryFinalStats';
import MiddleTermOfficialStats from './MiddleTermOfficialStats';
import MiddleSecondRoleOfficialStats from './MiddleSecondRoleOfficialStats';
import PrimarySecondRoleOfficialStats from './PrimarySecondRoleOfficialStats';
import MiddleCombinedRoundsOfficialStats from './MiddleCombinedRoundsOfficialStats';
import PrimaryTermOfficialStats from './PrimaryTermOfficialStats';
import M3OfficialStats from './M3OfficialStats';
import MiddleYearEndOfficialStats from './MiddleYearEndOfficialStats';
import SubjectFailureAnalytical from './SubjectFailureAnalytical';

interface StatisticsProps {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

type StatView = 
  | 'menu' 
  | 'general' 
  | 'subject_performance' 
  | 'achievers_65' 
  | 'failure_analytical'
  | 'second_role_numerical' 
  | 'specific_grade_second_role' 
  | 'p1_p2_stats'
  | 'primary_term_stats'
  | 'middle_term_stats'
  | 'primary_round_stats'
  | 'middle_round_stats'
  | 'primary_final_official'
  | 'middle_term_official'
  | 'middle_year_end_official' 
  | 'middle_second_role_official'
  | 'primary_second_role_official'
  | 'middle_combined_rounds_official'
  | 'primary_term_official'
  | 'm3_official';

const Statistics: React.FC<StatisticsProps> = ({ students, subjects, grades }) => {
  const [view, setView] = useState<StatView>('menu');
  const [printMargin, setPrintMargin] = useState(5);

  const printStyles = useMemo(
    () => `
      @page { size: A4 portrait; margin: ${printMargin}mm !important; }
      @media print {
        body { background: white !important; }
        .no-print { display: none !important; }
        .print-sheet { width: 100%; min-height: 100%; }
      }
    `,
    [printMargin]
  );

  const renderActiveView = () => {
    const commonProps = { students, subjects, grades, onBack: () => setView('menu') };
    
    switch (view) {
      case 'general': return <GeneralStatistics {...commonProps} />;
      case 'subject_performance': return <SubjectPerformanceStats {...commonProps} />;
      case 'achievers_65': return <HighAchievers65Stats {...commonProps} />;
      case 'failure_analytical': return <SubjectFailureAnalytical {...commonProps} />;
      case 'second_role_numerical': return <SecondRoleNumericalStats {...commonProps} />;
      case 'specific_grade_second_role': return <SpecificGradeSecondRoleStats {...commonProps} />;
      case 'p1_p2_stats': return <Primary1And2Stats {...commonProps} />;
      case 'primary_term_stats': return <PrimaryTermStats {...commonProps} />;
      case 'middle_term_stats': return <MiddleTermStats {...commonProps} />;
      case 'primary_round_stats': return <PrimaryRoundStats {...commonProps} />;
      case 'middle_round_stats': return <MiddleRoundStats {...commonProps} />;
      case 'primary_final_official': return <PrimaryFinalStats {...commonProps} />;
      case 'middle_term_official': return <MiddleTermOfficialStats {...commonProps} />;
      case 'middle_year_end_official': return <MiddleYearEndOfficialStats {...commonProps} />;
      case 'middle_second_role_official': return <MiddleSecondRoleOfficialStats {...commonProps} />;
      case 'primary_second_role_official': return <PrimarySecondRoleOfficialStats {...commonProps} />;
      case 'middle_combined_rounds_official': return <MiddleCombinedRoundsOfficialStats {...commonProps} />;
      case 'primary_term_official': return <PrimaryTermOfficialStats {...commonProps} />;
      case 'm3_official': return <M3OfficialStats {...commonProps} />;
      default: return null;
    }
  };

  if (view !== 'menu') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
        <PrintOverlay
          margin={printMargin}
          onMarginChange={(val) => setPrintMargin(val)}
          onClose={() => setView('menu')}
          onPrint={() => exportUtils.print('stats-print-area', 'portrait', printMargin)}
          onPdf={() => exportUtils.exportToPDF('stats-print-area', 'stats-report', 'portrait', printMargin)}
          title="معاينة التقارير"
        >
          <div className="flex justify-center">
            <div
              id="stats-print-area"
              className="print-sheet bg-white shadow-2xl mx-auto rounded-2xl"
              style={{
                padding: `${printMargin}mm`,
                width: '210mm',
                minHeight: '297mm',
                backgroundColor: '#fff'
              }}
            >
              {renderActiveView()}
            </div>
          </div>
        </PrintOverlay>
      </div>
    );
  }

  const reportGroups = [
    {
      title: 'الإحصاء العام والتحليلي',
      icon: LayoutGrid,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      items: [
        { id: 'general', title: 'الإحصاء العام', desc: 'نسب النجاح والرسوب وتوزيع الجنسين لكل الصفوف', icon: FileBarChart, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'subject_performance', title: 'إحصاء تقديرات المواد', desc: 'تحليل مستوى الطلاب والتقديرات لكل مادة', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'failure_analytical', title: 'إحصاء مواد الرسوب', desc: 'تحليل عددي للطلاب الذين لهم دور ثان في كل مادة حسب الصف', icon: FileWarning, color: 'text-red-600', bg: 'bg-red-50' },
        { id: 'achievers_65', title: 'إحصاء 65 %', desc: 'حصر الطلاب الحاصلين على نسبة 65% فأكثر', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
      ]
    },
    {
      title: 'إحصاءات المرحلة الابتدائية',
      icon: Smile,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      items: [
        { id: 'primary_term_official', title: 'إحصاء نصف العام (رسمي)', desc: 'الإحصاء الرسمي لنتائج الترم الأول للمرحلة الابتدائية (بنين/بنات)', icon: FilePieChart, color: 'text-orange-700', bg: 'bg-orange-50' },
        { id: 'primary_final_official', title: 'إحصاء نتيحة آخر العام', desc: 'الإحصاء الرسمي للمرحلة الابتدائية (بنين/بنات) كما في السجلات', icon: FileSpreadsheet, color: 'text-slate-800', bg: 'bg-slate-100' },
        { id: 'p1_p2_stats', title: 'إحصاء 1 و 2 ابتدائي', desc: 'نتائج التقييمات لصفوف الأول والثاني الابتدائي', icon: Smile, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { id: 'primary_term_stats', title: 'إحصاء الترمين معاً (الابتدائية)', desc: 'مقارنة إحصائية بين الترم الأول والثاني للمرحلة الابتدائية', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'primary_round_stats', title: 'إحصاء الدورين (تحليلي)', desc: 'إحصاء الموقف بين الدور الأول والثاني للمرحلة الابتدائية', icon: Calculator, color: 'text-rose-600', bg: 'bg-rose-50' },
      ]
    },
    {
      title: 'إحصاءات المرحلة الإعدادية',
      icon: GraduationCap,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      items: [
        { id: 'middle_term_official', title: 'إحصاء نصف العام (إعدادي)', desc: 'الإحصاء الرسمي لنتائج الترم الأول للمرحلة الإعدادية بفئاته الثلاث', icon: FilePieChart, color: 'text-indigo-700', bg: 'bg-indigo-50' },
        { id: 'middle_year_end_official', title: 'إحصاء آخر العام (إعدادي)', desc: 'الإحصاء الرسمي لنتائج العام الدراسي للمرحلة الإعدادية (الأول والثاني)', icon: FileSpreadsheet, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        { id: 'middle_term_stats', title: 'إحصاء الترمين معاً (إعدادي)', desc: 'إحصاء ختامي شامل لنتائج العام الدراسي بالكامل (المقيد، الحاضر، الناجح..)', icon: GraduationCap, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { id: 'middle_round_stats', title: 'إحصاء الدورين (إعدادي)', desc: 'إحصاء الموقف بين الدور الأول والثاني للمرحلة الإعدادية', icon: BarChart3, color: 'text-slate-600', bg: 'bg-slate-50' },
        { id: 'm3_official', title: 'إحصاء الصف الثالث الإعدادي', desc: 'إحصاء شامل مخصص للشهادة الإعدادية (الدور الأول/الثاني)', icon: Star, color: 'text-yellow-700', bg: 'bg-yellow-50' },
      ]
    },
    {
      title: 'إحصاءات الدور الثاني والختامي',
      icon: Repeat,
      color: 'text-red-600',
      bg: 'bg-red-50',
      items: [
        { id: 'middle_combined_rounds_official', title: 'إحصاء الدورين معاً (إعدادي)', desc: 'الإحصاء الختامي الرسمي الذي يجمع نتائج الدور الأول والدور الثاني للمرحلة الإعدادية', icon: ClipboardList, color: 'text-blue-800', bg: 'bg-blue-100' },
        { id: 'primary_second_role_official', title: 'إحصاء الدور الثاني (3-6 ابتدائي)', desc: 'الإحصاء الرسمي لنتائج الدور الثاني للصفوف من الثالث للسادس الابتدائي', icon: Repeat, color: 'text-amber-700', bg: 'bg-amber-50' },
        { id: 'middle_second_role_official', title: 'إحصاء الدور الثاني (إعدادي)', desc: 'الإحصاء الرسمي لنتائج الدور الثاني للصفين الأول والثاني الإعدادي', icon: Repeat, color: 'text-red-700', bg: 'bg-red-50' },
        { id: 'second_role_numerical', title: 'إحصاء مواد الدور الثاني', desc: 'إحصاء عددي بأعداد ومواد الدور الثاني (عام)', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        { id: 'specific_grade_second_role', title: 'إحصاء دور ثان (صف محدد)', desc: 'إحصاء عددي مفصل لمواد الدور الثاني لصف معين', icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
      ]
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="text-blue-600" /> مركز الإحصاء والتحليل المتقدم
                </h2>
                <p className="text-gray-500 text-sm mt-1 font-medium">تم تنظيم التقارير في مجموعات لتسهيل الوصول للمطلوب</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 font-bold text-sm border border-blue-100">
                <School size={18}/> {students.length} طالب مسجل
            </div>
        </div>

        {reportGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                    <div className={`p-2 ${group.bg} ${group.color} rounded-lg`}>
                        <group.icon size={20} />
                    </div>
                    <h3 className="text-xl font-black text-gray-700">{group.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {group.items.map((card) => (
                        <div 
                            key={card.id}
                            onClick={() => setView(card.id as StatView)}
                            className="group cursor-pointer bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col items-center text-center space-y-4"
                        >
                            <div className={`w-14 h-14 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-inner`}>
                                <card.icon size={28} />
                            </div>
                            <div>
                                <h3 className="text-md font-bold text-gray-800 mb-1">{card.title}</h3>
                                <p className="text-gray-500 text-[10px] leading-relaxed font-medium px-2 h-10 overflow-hidden">
                                    {card.desc}
                                </p>
                            </div>
                            <div className={`pt-2 ${card.color} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-xs font-black`}>
                                فتح التقرير <ChevronLeft size={14} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}

        <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
            <p className="text-slate-500 text-sm font-bold flex items-center justify-center gap-2">
                <BookMarked size={18}/> يتم تحديث كافة الإحصائيات لحظياً فور تعديل رصد الدرجات أو بيانات الطلاب
            </p>
        </div>
    </div>
  );
};

export default Statistics;
