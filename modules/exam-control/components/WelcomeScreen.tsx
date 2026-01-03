
import React from 'react';
import { ShoppingCart, UserCheck, Smile, Phone, MapPin, Lock } from 'lucide-react';
import { db } from '../services/db';

interface WelcomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToSubscription: () => void;
  onStartTrial: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigateToLogin, onNavigateToSubscription, onStartTrial }) => {
  const schoolInfo = db.getSchoolInfo();

  const handleBuyNow = () => {
    // WhatsApp API link for the number 01095473156 (Egypt code +20)
    const phoneNumber = '201095473156';
    const message = encodeURIComponent('السلام عليكم، أود الاستفسار عن الاشتراك في برنامجكم    .');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-[#2ecc71] text-white p-6 shadow-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
          <div className="text-right">
            <h1 className="text-4xl font-black mb-1">School pay pro   System</h1>
            <p className="text-lg opacity-90 font-medium">أقوى برنامج مدرسي</p>
          </div>
          <div className="hidden md:block">
             <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border-2 border-white/30">
                {schoolInfo.logo ? (
                    <img src={schoolInfo.logo} alt="Logo" className="w-16 h-16 object-contain" />
                ) : (
                    // Placeholder for where the Eagle Eye logo would typically go if no school logo
                    <img src="./eagle-icon.svg" alt="Eagle Eye" className="w-16 h-16 object-contain" />
                )}
             </div>
          </div>
        </div>
        {/* Decorative background pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="2"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col items-center">
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-12 text-center">ماذا تريد أن تفعل اليوم ؟</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl mb-8">
            
            {/* Card 1: Try (Yellow) */}
            <div className="flex flex-col group">
                <button 
                    onClick={onStartTrial}
                    className="bg-[#f1c40f] hover:bg-[#f39c12] text-gray-900 h-64 rounded-t-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg relative overflow-hidden"
                >
                    <div className="bg-black/10 p-4 rounded-full">
                        <Smile size={64} strokeWidth={2.5} />
                    </div>
                    <span className="text-3xl font-black">تجربة النظام</span>
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10"></div>
                </button>
                <div className="bg-gray-100 p-6 rounded-b-xl border border-gray-200 text-sm text-gray-600 leading-relaxed text-center h-full">
                    ننصح بتجربة النظام لتتعرف على مدى مناسبته لمدرستك. النسخة التجريبية تعمل بكامل الخصائص لمدة 3 أيام.
                </div>
            </div>

            {/* Card 2: Subscribe (Green) */}
            <div className="flex flex-col group">
                <button 
                    onClick={handleBuyNow}
                    className="bg-[#2ecc71] hover:bg-[#27ae60] text-white h-64 rounded-t-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg relative overflow-hidden"
                >
                    <div className="bg-white/20 p-4 rounded-full">
                        <ShoppingCart size={64} strokeWidth={2.5} />
                    </div>
                    <span className="text-3xl font-black">إشترك الآن</span>
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10"></div>
                </button>
                <div className="bg-gray-100 p-6 rounded-b-xl border border-gray-200 text-sm text-gray-600 leading-relaxed text-center h-full">
                    اختر الباقة المناسبة لمدرستك. يمكنك الاشتراك سنوياً وتجديد الترخيص بسهولة. اتصل بأقرب موزع معتمد لخدمتكم.
                </div>
            </div>

            {/* Card 3: Subscriber (Blue) */}
            <div className="flex flex-col group">
                <button 
                    onClick={onNavigateToSubscription}
                    className="bg-[#3498db] hover:bg-[#2980b9] text-white h-64 rounded-t-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg relative overflow-hidden"
                >
                    <div className="bg-white/20 p-4 rounded-full">
                        <UserCheck size={64} strokeWidth={2.5} />
                    </div>
                    <span className="text-3xl font-black">تفعيل اشتراك</span>
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10"></div>
                </button>
                <div className="bg-gray-100 p-6 rounded-b-xl border border-gray-200 text-sm text-gray-600 leading-relaxed text-center h-full flex items-center justify-center">
                    لتفعيل نسختك لأول مرة باستخدام كود التفعيل الذي حصلت عليه.
                </div>
            </div>

            {/* Card 4: Login (Purple) - NEW */}
            <div className="flex flex-col group">
                <button 
                    onClick={onNavigateToLogin}
                    className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white h-64 rounded-t-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg relative overflow-hidden"
                >
                    <div className="bg-white/20 p-4 rounded-full">
                        <Lock size={64} strokeWidth={2.5} />
                    </div>
                    <span className="text-3xl font-black">دخول مسئول</span>
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10"></div>
                </button>
                <div className="bg-gray-100 p-6 rounded-b-xl border border-gray-200 text-sm text-gray-600 leading-relaxed text-center h-full flex items-center justify-center">
                    الدخول المباشر لإدارة النظام (للمدير، المسؤولين، ومدخلي البيانات).
                </div>
            </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-sm">
              <div className="flex items-center gap-6">
                  <button onClick={handleBuyNow} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer transition"><Phone size={16}/> اتصل بنا</button>
                  <span className="flex items-center gap-2 hover:text-blue-600 cursor-pointer transition"><MapPin size={16}/> خريطة الموقع</span>
              </div>
              <div>
                  &copy; {new Date().getFullYear()} جميع الحقوق محفوظة لـ  school pay pro  
              </div>
          </div>
      </footer>
    </div>
  );
};

export default WelcomeScreen;
