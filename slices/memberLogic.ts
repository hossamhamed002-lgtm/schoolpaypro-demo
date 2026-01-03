
import { UserRole, StudentMaster, StudentStatus } from '../types';

export const getMemberActions = (setDb: any, activeSchool: any, logAction: any, getActiveYearId: () => string) => ({
  addStudent: (s: any) => {
    const id = `STU-${Date.now()}`;
    const yearId = getActiveYearId();
    setDb((prev: any) => ({
      ...prev,
      students: [...(prev.students || []), { ...s, Student_Global_ID: id, School_ID: activeSchool.School_ID, Academic_Year_ID: s.Academic_Year_ID || yearId }]
    }));
    logAction({ Action_Ar: `تسجيل طالب جديد: ${s.Name_Ar}`, Action_Type: 'add', Record_ID: id, Page_Name_Ar: 'شؤون الطلاب' });
  },

  updateStudent: (id: string, data: any) => {
    setDb((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => s.Student_Global_ID === id ? { ...s, ...data } : s)
    }));
    logAction({ Action_Ar: `تعديل بيانات الطالب: ${data.Name_Ar}`, Action_Type: 'edit', Record_ID: id, Page_Name_Ar: 'شؤون الطلاب' });
  },

  // مُحرك الاستيراد الذكي للبيانات الضخمة
  importStudentsBatch: (batch: StudentMaster[]) => {
    const yearId = getActiveYearId();
    const normalizedBatch = batch.map((student) => ({
      ...student,
      School_ID: student.School_ID || activeSchool.School_ID,
      Academic_Year_ID: student.Academic_Year_ID || yearId
    }));
    setDb((prev: any) => ({
      ...prev,
      students: [...(prev.students || []), ...normalizedBatch]
    }));
    logAction({ 
      Action_Ar: `استيراد جماعي لعدد (${batch.length}) طالب عبر الإكسيل`, 
      Action_Type: 'add', 
      Page_Name_Ar: 'شؤون الطلاب',
      Details: JSON.stringify({ count: batch.length })
    });
  },

  deleteStudent: (id: string) => {
    setDb((prev: any) => ({
      ...prev,
      students: prev.students.filter((s: any) => s.Student_Global_ID !== id)
    }));
    logAction({ Action_Ar: `حذف طالب نهائياً: ${id}`, Action_Type: 'delete', Record_ID: id, Page_Name_Ar: 'شؤون الطلاب' });
  },

  // وظيفة الحذف الجماعي المطلوبة
  deleteStudentsBatch: (ids: string[]) => {
    setDb((prev: any) => ({
      ...prev,
      students: prev.students.filter((s: any) => !ids.includes(s.Student_Global_ID))
    }));
    logAction({ 
      Action_Ar: `حذف جماعي لعدد (${ids.length}) طالب من شؤون الطلاب`, 
      Action_Type: 'delete', 
      Page_Name_Ar: 'شؤون الطلاب',
      Details: JSON.stringify({ deletedCount: ids.length })
    });
  },

  // --- توليد قائمة أولياء الأمور من الطلاب ---
  generateParents: () => {
    setDb((prev: any) => {
      const yearId = getActiveYearId();
      const students = (prev.students || []).filter((s: StudentMaster) => s.Academic_Year_ID === yearId);
      const existingParents = prev.parents || [];
      
      // خريطة لتتبع الآباء الفريدين حسب الرقم القومي
      const parentMap = new Map();
      
      // 1. تسجيل الآباء الموجودين مسبقاً (للحفاظ على الإضافات اليدوية)
      existingParents.forEach((p: any) => {
        if (p.National_ID) parentMap.set(p.National_ID, { ...p, childrenCount: 0 });
      });

      // 2. معالجة الطلاب لاستخراج الآباء وربطهم
      students.forEach((s: StudentMaster) => {
        const f = s.Father;
        if (!f || !f.National_ID) return;

        if (parentMap.has(f.National_ID)) {
          // تحديث عدد الأبناء للوالد الموجود
          const existing = parentMap.get(f.National_ID);
          existing.childrenCount = (existing.childrenCount || 0) + 1;
        } else {
          // إنشاء سجل والد جديد
          parentMap.set(f.National_ID, {
            ...f,
            Parent_ID: f.Parent_ID || `PAR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            childrenCount: 1
          });
        }
      });

      const updatedParents = Array.from(parentMap.values());
      
      logAction({ 
        Action_Ar: `توليد/تحديث قائمة أولياء الأمور من الطلاب (${updatedParents.length} والد)`, 
        Action_Type: 'system', 
        Page_Name_Ar: 'شؤون الطلاب' 
      });

      return { ...prev, parents: updatedParents };
    });
  },

  // --- إدارة الموظفين ---
  addEmployee: (data: any) => {
    setDb((prev: any) => {
      const existingIds = new Set((prev.employees || []).map((e: any) => String(e.Emp_ID || '').trim()));
      const genId = () => {
        const uuidLike = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2, 10);
        const schoolPart =
          (activeSchool?.School_Code || activeSchool?.Code || activeSchool?.ID || activeSchool?.id || 'SCHOOL').toString();
        return `EMP-${schoolPart}-${uuidLike}`;
      };
      let empId = String(data.Emp_ID || '').trim() || genId();
      while (existingIds.has(empId)) {
        empId = genId();
      }

      const newEmployees = [...(prev.employees || []), { ...data, Emp_ID: empId, School_ID: activeSchool.School_ID, Is_Active: true }];
      const newUsers = [...(prev.users || [])];
      if (data.Is_System_User) {
        newUsers.push({
          User_ID: `USR-${empId}`,
          Emp_ID: empId,
          Username: data.Username || data.Email?.split('@')[0] || `user_${empId.slice(-4)}`,
          Password_Hash: '123456',
          Role: UserRole.TEACHER,
          Is_Active: true,
          Permissions: ['dashboard']
        });
      }
      logAction({ Action_Ar: `إضافة موظف: ${data.Name_Ar}`, Action_Type: 'add', Record_ID: empId, Page_Name_Ar: 'الموظفين' });
      return { ...prev, employees: newEmployees, users: newUsers };
    });
  },

  updateEmployee: (id: string, data: any) => {
    setDb((prev: any) => {
      const updatedEmployees = (prev.employees || []).map((e: any) =>
        e.Emp_ID === id ? { ...e, ...data, Emp_ID: id } : e
      );

      let newUsers = [...(prev.users || [])];
      const existingUserIndex = newUsers.findIndex((u) => u.Emp_ID === id);
      const shouldBeUser = !!data.Is_System_User;
      const username = data.Username || data.Email?.split('@')[0] || `user_${id.slice(-4)}`;

      if (shouldBeUser) {
        if (existingUserIndex === -1) {
          newUsers.push({
            User_ID: `USR-${id}`,
            Emp_ID: id,
            Username: username,
            Password_Hash: '123456',
            Role: UserRole.TEACHER,
            Is_Active: true,
            Permissions: ['dashboard']
          });
        } else {
          newUsers[existingUserIndex] = { ...newUsers[existingUserIndex], Username: username };
        }
      } else if (!shouldBeUser && existingUserIndex !== -1) {
        newUsers = newUsers.filter((u) => u.Emp_ID !== id);
      }

      return { ...prev, employees: updatedEmployees, users: newUsers };
    });
    logAction({ Action_Ar: `تعديل بيانات الموظف: ${data.Name_Ar}`, Action_Type: 'edit', Record_ID: id, Page_Name_Ar: 'الموظفين' });
  },

  deleteEmployee: (id: string) => {
    setDb((prev: any) => ({
      ...prev,
      employees: prev.employees.filter((e: any) => e.Emp_ID !== id),
      users: prev.users.filter((u: any) => u.Emp_ID !== id)
    }));
    logAction({ Action_Ar: `حذف موظف نهائياً: ${id}`, Action_Type: 'delete', Record_ID: id, Page_Name_Ar: 'الموظفين' });
  },

  updateUserPermissions: (id: string, data: any) => setDb((prev: any) => ({
    ...prev,
    users: prev.users.map((u: any) => u.User_ID === id ? { ...u, ...data } : u)
  })),

  addJobTitle: (data: any) => {
    const id = `JOB-${Date.now()}`;
    setDb((prev: any) => ({
      ...prev,
      jobTitles: [...(prev.jobTitles || []), { ...data, Job_ID: id }]
    }));
    logAction({ Action_Ar: `إضافة مسمى وظيفي: ${data.Title_Ar}`, Action_Type: 'add', Record_ID: id, Page_Name_Ar: 'الأعضاء' });
  },
  updateJobTitle: (id: string, data: any) => setDb((prev: any) => ({
    ...prev,
    jobTitles: prev.jobTitles.map((j: any) => j.Job_ID === id ? { ...j, ...data } : j)
  })),
  deleteJobTitle: (id: string) => setDb((prev: any) => ({
    ...prev,
    jobTitles: prev.jobTitles.filter((j: any) => j.Job_ID !== id)
  }))
});
