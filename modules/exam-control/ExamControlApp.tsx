
import { useState, useEffect } from 'react';
import {
  Menu,
  ZoomIn,
  ZoomOut,
  LayoutDashboard,
  Building2,
  Users,
  Settings as SettingsIcon,
  LockKeyhole,
  UserCheck,
  GraduationCap,
  FileText,
  FileSpreadsheet,
  BarChart3,
  FileStack,
  Repeat,
  StickyNote,
  DatabaseBackup,
  UserCog
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Settings from './components/Settings';
import Control from './components/Control';
import Grading from './components/Grading';
import Reports from './components/Reports';
import Statistics from './components/Statistics';
import SchoolData from './components/SchoolData';
import DataBackup from './components/DataBackup';
import SecondRole from './components/SecondRole';
import UserManagement from './components/UserManagement';
import Notes from './components/Notes';
import Login from './components/Login';
import Observers from './components/Observers';
import OfficialPapers from './components/OfficialPapers';
import { db } from './services/db';
import { Tab, Student, Subject, GradesDatabase, User } from './examControl.types';
import { isModuleActive } from '../../storageGate';

type ExamControlAppProps = {
  externalMode?: boolean;
  externalStudents?: Student[];
  externalYear?: string;
  externalUser?: any;
  externalTeachers?: Array<{ id: string; name: string; subject?: string }>;
  externalSchoolInfo?: Partial<{
    schoolName: string;
    educationalAdministration: string;
    governorate: string;
    academicYear: string;
    logo?: string | null;
  }>;
  externalReportIds?: string[];
  externalSignatureChain?: Array<{
    Step_ID: string;
    Display_Title_Ar: string;
    Display_Title_En: string;
    Alignment?: 'left' | 'center' | 'right';
  }>;
};

function App({ externalMode = false, externalStudents = [], externalYear = '', externalUser, externalTeachers = [], externalSchoolInfo, externalReportIds = [], externalSignatureChain = [] }: ExamControlAppProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentYear, setCurrentYear] = useState<string>(externalYear || db.getSelectedYear());
  const [viewState, setViewState] = useState<'login' | 'app'>('app');

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradesDatabase>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const init = async () => {
          if (externalMode) {
              const normalized = externalUser && typeof externalUser === 'object'
                ? {
                    id: externalUser.User_ID || externalUser.id || 'external-user',
                    username: externalUser.Username || externalUser.username || 'external-user',
                    fullName: externalUser.Name || externalUser.fullName || externalUser.Username || 'External User',
                    role: externalUser.Role === 'viewer' || externalUser.Role === 'data_entry' ? externalUser.Role : 'admin'
                  }
                : {
                    id: 'local-admin',
                    username: 'admin',
                    fullName: 'Local Admin',
                    role: 'admin'
                  };
              setCurrentUser(normalized);
              setViewState('app');
              setLoading(false);
              return;
          }

          const savedUser = sessionStorage.getItem('app_current_user');
          if (savedUser) {
              setCurrentUser(JSON.parse(savedUser));
          }
          setViewState('app');
          setLoading(false);
      };
      init();
  }, [externalMode, externalUser]);

  useEffect(() => {
      if (!externalMode) return;
      if (externalYear && externalYear !== currentYear) {
          setCurrentYear(externalYear);
      }
      if (externalYear) {
          db.setSelectedYear(externalYear);
      }
  }, [externalMode, externalYear, currentYear]);

  useEffect(() => {
      if (!externalMode || !externalSchoolInfo) return;
      db.saveSchoolInfo({
        schoolName: externalSchoolInfo.schoolName || '',
        educationalAdministration: externalSchoolInfo.educationalAdministration || '',
        governorate: externalSchoolInfo.governorate || '',
        academicYear: externalSchoolInfo.academicYear || externalYear || currentYear,
        logo: externalSchoolInfo.logo || null,
        managerName: '',
        agentName: '',
        controlHead: '',
        itSpecialist: '',
        studentAffairsHead: ''
      });
  }, [externalMode, externalSchoolInfo, externalYear, currentYear]);

  useEffect(() => {
      const schoolInfo = db.getSchoolInfo();
      if (schoolInfo.schoolName) {
          document.title = `${schoolInfo.schoolName} - ${currentYear}`;
      }
  }, [currentUser, currentYear]);

  useEffect(() => {
    if (viewState !== 'app' || externalMode) return;
    if (isModuleActive('examControl')) {
      db.refreshSchoolInfoFromBackend();
      db.refreshStudentsFromBackend(currentYear);
    }
  }, [viewState, externalMode, currentYear]);

  useEffect(() => {
    if (externalMode) {
      refreshData();
      return;
    }
    if (currentUser) refreshData();
  }, [currentUser, currentYear, externalMode, externalStudents]);

  const refreshData = () => {
    if (externalMode) {
      const localStudents = db.getStudents();
      const localMap = new Map(localStudents.map((student) => [student.id, student]));
      const merged = externalStudents.map((student) => {
        const local = localMap.get(student.id);
        if (!local) return student;
        return {
          ...student,
          seatingNumber: local.seatingNumber ?? student.seatingNumber,
          secretNumberTerm1: local.secretNumberTerm1 ?? student.secretNumberTerm1,
          secretNumberTerm2: local.secretNumberTerm2 ?? student.secretNumberTerm2,
          secretNumberSecondRole: local.secretNumberSecondRole ?? student.secretNumberSecondRole,
          committeeId: local.committeeId ?? student.committeeId,
          committeeIdSecondRole: local.committeeIdSecondRole ?? student.committeeIdSecondRole,
          enrollmentStatus: local.enrollmentStatus ?? student.enrollmentStatus,
          isIntegration: true
        };
      });
      setStudents(merged);
      setSubjects(db.getSubjects());
      setGrades(db.getGrades());
      return;
    }
    setStudents(db.getStudents());
    setSubjects(db.getSubjects());
    setGrades(db.getGrades());
  };

  const handleYearChange = (year: string) => {
      if (externalMode) return;
      if (year !== currentYear) {
          db.setSelectedYear(year);
          setCurrentYear(year);
      }
  };

  const handleLogin = (user: User) => {
      if (externalMode) return;
      setCurrentUser(user);
      sessionStorage.setItem('app_current_user', JSON.stringify(user));
      setViewState('app');
      setActiveTab(Tab.DASHBOARD);
  };

  const handleLogout = () => {
      if (externalMode) return;
      setCurrentUser(null);
      sessionStorage.removeItem('app_current_user');
      setViewState('login'); 
  };

  const updateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    if (externalMode) {
      const integrationOnly = newStudents.map((student) => ({
        id: student.id,
        seatingNumber: student.seatingNumber ?? null,
        secretNumberTerm1: student.secretNumberTerm1 ?? null,
        secretNumberTerm2: student.secretNumberTerm2 ?? null,
        secretNumberSecondRole: student.secretNumberSecondRole ?? null,
        committeeId: student.committeeId ?? null,
        committeeIdSecondRole: student.committeeIdSecondRole ?? null,
        enrollmentStatus: student.enrollmentStatus ?? null,
        isIntegration: true
      }));
      db.saveStudents(integrationOnly as Student[]);
      return;
    }
    db.saveStudents(newStudents);
  };

  const updateSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    db.saveSubjects(newSubjects);
  };

  const updateGrades = (newGrades: GradesDatabase) => {
    setGrades(newGrades);
    db.saveGrades(newGrades);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100 font-bold text-blue-600">جاري تحميل النظام...</div>;

  if (viewState === 'login') {
      return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD: return <Dashboard students={students} subjects={subjects} grades={grades} currentUser={currentUser} />;
      case Tab.SCHOOL_DATA: return <SchoolData externalMode={externalMode} externalSchoolInfo={externalSchoolInfo} />;
      case Tab.STUDENTS: return (
        <Students
          students={students}
          onUpdate={updateStudents}
          externalMode={externalMode}
          externalStudents={externalStudents}
        />
      );
      case Tab.SETTINGS: return <Settings subjects={subjects} onUpdate={updateSubjects} />;
      case Tab.CONTROL: return <Control students={students} onUpdate={updateStudents} />;
      case Tab.OBSERVERS: return <Observers externalMode={externalMode} externalTeachers={externalTeachers} />;
      case Tab.GRADING: return <Grading students={students} subjects={subjects} grades={grades} onUpdate={updateGrades} />;
      case Tab.REPORTS:
        return (
          <Reports
            students={students}
            subjects={subjects}
            grades={grades}
            allowedReportIds={externalReportIds}
            signatureChain={externalSignatureChain}
            title="الشهادات والتقدير"
            hideSheetTab
            initialReportType="certificates"
          />
        );
      case Tab.SHEETS:
        return (
          <Reports
            students={students}
            subjects={subjects}
            grades={grades}
            allowedReportIds={externalReportIds}
            signatureChain={externalSignatureChain}
            title="الشيت"
            showReportTypeTabs={false}
            lockedReportType="table"
          />
        );
      case Tab.STATISTICS: return <Statistics students={students} subjects={subjects} grades={grades} />;
      case Tab.OFFICIAL_PAPERS: return <OfficialPapers allowedReportIds={externalReportIds} />;
      case Tab.SECOND_ROLE: return <SecondRole students={students} subjects={subjects} grades={grades} onUpdate={updateGrades} onUpdateStudents={updateStudents} />;
      case Tab.NOTES: return <Notes />;
      case Tab.BACKUP: return <DataBackup onRefresh={refreshData} />;
      case Tab.USERS: return <UserManagement currentUser={currentUser} />;
      default: return <Dashboard students={students} subjects={subjects} grades={grades} currentUser={currentUser} />;
    }
  };

  const internalTabs = [
    { id: Tab.DASHBOARD, label: 'الرئيسية', icon: LayoutDashboard, tone: 'text-indigo-600 bg-indigo-50' },
    { id: Tab.STUDENTS, label: 'إدارة الطلاب', icon: Users, tone: 'text-sky-600 bg-sky-50' },
    { id: Tab.SETTINGS, label: 'المواد والدرجات', icon: SettingsIcon, tone: 'text-emerald-600 bg-emerald-50' },
    { id: Tab.CONTROL, label: 'الكنترول وأرقام الجلوس', icon: LockKeyhole, tone: 'text-amber-600 bg-amber-50' },
    { id: Tab.OBSERVERS, label: 'الملاحظين والتصحيح', icon: UserCheck, tone: 'text-teal-600 bg-teal-50' },
    { id: Tab.GRADING, label: 'رصد الدرجات', icon: GraduationCap, tone: 'text-violet-600 bg-violet-50' },
    { id: Tab.SHEETS, label: 'الشيت', icon: FileSpreadsheet, tone: 'text-blue-600 bg-blue-50' },
    { id: Tab.REPORTS, label: 'الشهادات والتقدير', icon: FileText, tone: 'text-rose-600 bg-rose-50' },
    { id: Tab.STATISTICS, label: 'الإحصاءات', icon: BarChart3, tone: 'text-blue-600 bg-blue-50' },
    { id: Tab.OFFICIAL_PAPERS, label: 'ورقيات ومطبوعات', icon: FileStack, tone: 'text-cyan-600 bg-cyan-50' },
    { id: Tab.SECOND_ROLE, label: 'الدور الثاني', icon: Repeat, tone: 'text-orange-600 bg-orange-50' },
    { id: Tab.NOTES, label: 'الملاحظات', icon: StickyNote, tone: 'text-lime-600 bg-lime-50' },
    { id: Tab.BACKUP, label: 'النسخ الاحتياطي', icon: DatabaseBackup, tone: 'text-slate-600 bg-slate-100' },
    { id: Tab.USERS, label: 'المستخدمين', icon: UserCog, tone: 'text-fuchsia-600 bg-fuchsia-50' }
  ].filter((tab) => !(externalMode && (tab.id === Tab.SCHOOL_DATA || tab.id === Tab.DASHBOARD)));

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {!externalMode && currentUser && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          currentYear={currentYear}
          onYearChange={handleYearChange}
          isPinned={isSidebarPinned}
          onTogglePin={() => setIsSidebarPinned(!isSidebarPinned)}
          showYearPicker={!externalMode}
          showLogout={!externalMode}
        />
      )}
      <main className={`flex-1 min-h-screen transition-all duration-300 ease-in-out print:mr-0 print:p-0 ${externalMode ? '' : isSidebarPinned ? 'md:mr-64' : 'md:mr-20'}`}>
        {!externalMode && (
          <div className="sticky top-0 z-20 flex items-center justify-between p-4 md:px-8 bg-gray-50/90 backdrop-blur-sm no-print">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-white rounded-lg border"><Menu size={24} /></button>
              <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
                  <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.7))} className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><ZoomOut size={18} /></button>
                  <span className="text-xs font-bold w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.5))} className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><ZoomIn size={18} /></button>
              </div>
          </div>
        )}
        <div className="p-4 md:p-8 pt-0 transition-transform origin-top-right" style={{ zoom: externalMode ? 1 : zoomLevel }}>
          {externalMode && activeTab === Tab.DASHBOARD && (
            <div className="mb-8 no-print">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                {internalTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="rounded-[2rem] border border-slate-100 bg-white p-5 text-start transition-all hover:shadow-lg shadow-sm"
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tab.tone}`}>
                          <Icon size={24} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-black text-slate-800">{tab.label}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {tab.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {externalMode && activeTab !== Tab.DASHBOARD && (
            <div className="mb-6 flex items-center justify-between no-print">
              <h3 className="text-sm font-black text-slate-700">كنترول الامتحانات</h3>
              <button
                onClick={() => setActiveTab(Tab.DASHBOARD)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                العودة لبطاقات الكنترول
              </button>
            </div>
          )}
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
}
export default App;
