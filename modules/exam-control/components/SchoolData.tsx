
import React, { useMemo, useState, useEffect } from 'react';
import { Building2, UserCircle, Monitor, UserCheck, Image as ImageIcon, X, CheckCircle2, Loader2, Info } from 'lucide-react';
import { SchoolInfo } from '../examControl.types';
import { db } from '../services/db';

type SchoolDataProps = {
  externalMode?: boolean;
  externalSchoolInfo?: Partial<Pick<SchoolInfo, 'schoolName' | 'educationalAdministration' | 'governorate' | 'academicYear' | 'logo'>>;
};

const SchoolData: React.FC<SchoolDataProps> = ({ externalMode = false, externalSchoolInfo }) => {
  const localInfo = useMemo(() => db.getSchoolInfo(), []);
  const mergedInfo: SchoolInfo = useMemo(() => ({
    schoolName: externalSchoolInfo?.schoolName ?? localInfo.schoolName,
    educationalAdministration: externalSchoolInfo?.educationalAdministration ?? localInfo.educationalAdministration,
    governorate: externalSchoolInfo?.governorate ?? localInfo.governorate,
    academicYear: externalSchoolInfo?.academicYear ?? localInfo.academicYear,
    logo: externalSchoolInfo?.logo ?? localInfo.logo,
    managerName: localInfo.managerName,
    agentName: localInfo.agentName,
    controlHead: localInfo.controlHead,
    itSpecialist: localInfo.itSpecialist,
    studentAffairsHead: localInfo.studentAffairsHead
  }), [externalSchoolInfo, localInfo]);

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(mergedInfo);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Auto-save effect with debounce
  useEffect(() => {
    if (externalMode) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      db.saveSchoolInfo(schoolInfo);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }, 1000); // Wait 1 second after last change to save

    return () => clearTimeout(timer);
  }, [schoolInfo]);

  useEffect(() => {
    setSchoolInfo(mergedInfo);
  }, [mergedInfo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (externalMode) return;
    const file = e.target.files?.[0];
    if (file) {
      // Validation: Check file size (Limit to ~500KB to avoid LocalStorage Quota Exceeded)
      if (file.size > 500 * 1024) {
        alert("حجم الصورة كبير جداً (أكبر من 500 كيلوبايت).\nيرجى اختيار صورة أصغر لضمان حفظ البيانات بنجاح في المتصفح.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolInfo(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    if (externalMode) return;
    if (confirm("هل تريد حذف الشعار؟")) {
      setSchoolInfo(prev => ({ ...prev, logo: null }));
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-blue-600" /> بيانات المدرسة
        </h2>
        
        {/* Save Status Indicator */}
        {!externalMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 transition-all duration-300">
            {saveStatus === 'saving' ? (
                <>
                    <Loader2 size={16} className="text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-600 font-medium">جارٍ الحفظ...</span>
                </>
            ) : (
                <>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm text-gray-500 font-medium">
                        تم الحفظ تلقائياً {lastSavedTime && `(${lastSavedTime})`}
                    </span>
                </>
            )}
        </div>
        )}
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex flex-col md:flex-row gap-8">
                 {/* Logo Section */}
                 <div className="md:w-1/4 flex flex-col items-center space-y-4">
                    <div className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-colors">
                        {schoolInfo.logo ? (
                            <>
                                <img src={schoolInfo.logo} alt="School Logo" className="w-full h-full object-contain p-2" />
                                <button 
                                    onClick={removeLogo}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"
                                    title="حذف الشعار"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 p-4 pointer-events-none">
                                <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">لا يوجد شعار</p>
                            </div>
                        )}
                    </div>
                    {!externalMode && (
                      <>
                        <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition text-sm font-bold w-full text-center shadow-sm">
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            رفع شعار المدرسة
                        </label>
                        <p className="text-xs text-gray-400 text-center">يفضل صورة صغيرة (أقل من 500KB)</p>
                      </>
                    )}
                 </div>

                 {/* Info Sections */}
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <Building2 size={20} className="text-blue-600" /> المعلومات الأساسية
                        </h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدرسة</label>
                            <input 
                                type="text" 
                                value={schoolInfo.schoolName}
                                onChange={(e) => setSchoolInfo({...schoolInfo, schoolName: e.target.value})}
                                readOnly={externalMode}
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder=":  اسم المدرسة"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الإدارة التعليمية</label>
                                <input 
                                    type="text" 
                                    value={schoolInfo.educationalAdministration}
                                    onChange={(e) => setSchoolInfo({...schoolInfo, educationalAdministration: e.target.value})}
                                    readOnly={externalMode}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المحافظة</label>
                                <input 
                                    type="text" 
                                    value={schoolInfo.governorate}
                                    onChange={(e) => setSchoolInfo({...schoolInfo, governorate: e.target.value})}
                                    readOnly={externalMode}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-sm flex items-start gap-2">
                            <Info size={18} className="mt-0.5 shrink-0" />
                            <p>
                                العام الدراسي الحالي هو: <strong>{schoolInfo.academicYear}</strong>. 
                                <br />
                                لتغيير السنة الدراسية، استخدم القائمة المنسدلة في القائمة الجانبية (Sidebar).
                            </p>
                        </div>
                    </div>

                    {/* Staff Info */}
                    {!externalMode && (
                    <div className="space-y-6">
                        <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <UserCheck size={20} className="text-emerald-600" /> الهيكل الإداري والكنترول
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">مدير المدرسة</label>
                                <div className="relative">
                                    <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={schoolInfo.managerName}
                                        onChange={(e) => setSchoolInfo({...schoolInfo, managerName: e.target.value})}
                                        className="w-full p-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">وكيل المدرسة</label>
                                <input 
                                    type="text" 
                                    value={schoolInfo.agentName}
                                    onChange={(e) => setSchoolInfo({...schoolInfo, agentName: e.target.value})}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رئيس الكنترول</label>
                                <input 
                                    type="text" 
                                    value={schoolInfo.controlHead}
                                    onChange={(e) => setSchoolInfo({...schoolInfo, controlHead: e.target.value})}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">شئون الطلاب</label>
                                <input 
                                    type="text" 
                                    value={schoolInfo.studentAffairsHead}
                                    onChange={(e) => setSchoolInfo({...schoolInfo, studentAffairsHead: e.target.value})}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">مسئول الحاسب</label>
                                <div className="relative">
                                    <Monitor className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={schoolInfo.itSpecialist}
                                        onChange={(e) => setSchoolInfo({...schoolInfo, itSpecialist: e.target.value})}
                                        className="w-full p-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                 </div>
             </div>
        </div>
    </div>
  );
};

export default SchoolData;
