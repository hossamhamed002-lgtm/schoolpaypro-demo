
import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, Edit2, X, Save, Calendar, AlertTriangle, Star } from 'lucide-react';
import { db } from '../services/db';
import { Note } from '../examControl.types';

const COLORS = [
    { label: 'أصفر', class: 'bg-yellow-100 border-yellow-200' },
    { label: 'أزرق', class: 'bg-blue-100 border-blue-200' },
    { label: 'أخضر', class: 'bg-green-100 border-green-200' },
    { label: 'وردي', class: 'bg-pink-100 border-pink-200' },
    { label: 'بنفسجي', class: 'bg-purple-100 border-purple-200' },
    { label: 'رمادي', class: 'bg-gray-100 border-gray-200' },
];

const Notes: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentNote, setCurrentNote] = useState<Partial<Note>>({
        color: COLORS[0].class,
        title: '',
        content: '',
        isImportant: false
    });
    
    // Delete Modal State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

    useEffect(() => {
        setNotes(db.getNotes());
    }, []);

    const saveNotes = (newNotes: Note[]) => {
        setNotes(newNotes);
        db.saveNotes(newNotes);
    };

    const handleOpenModal = (note?: Note) => {
        if (note) {
            setCurrentNote(note);
        } else {
            setCurrentNote({ color: COLORS[0].class, title: '', content: '', isImportant: false });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!currentNote.title || !currentNote.content) {
            alert('يرجى إدخال العنوان والمحتوى');
            return;
        }

        let updatedNotes = [...notes];
        if (currentNote.id) {
            // Edit
            updatedNotes = updatedNotes.map(n => n.id === currentNote.id ? { ...currentNote, id: n.id } as Note : n);
        } else {
            // New
            const newNote: Note = {
                id: `note_${Date.now()}`,
                title: currentNote.title || '',
                content: currentNote.content || '',
                color: currentNote.color || COLORS[0].class,
                createdAt: new Date().toLocaleDateString('ar-EG'),
                isImportant: currentNote.isImportant || false
            };
            updatedNotes = [newNote, ...updatedNotes]; // Add to top
        }

        saveNotes(updatedNotes);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (id: string) => {
        setNoteToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const executeDelete = () => {
        if (noteToDelete) {
            const updatedNotes = notes.filter(n => n.id !== noteToDelete);
            saveNotes(updatedNotes);
            setDeleteConfirmOpen(false);
            setNoteToDelete(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <StickyNote className="text-yellow-500" /> الملاحظات والتذكيرات
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">سجل ملاحظاتك ومهامك اليومية بسهولة</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-md"
                >
                    <Plus size={18} /> ملاحظة جديدة
                </button>
            </div>

            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <StickyNote size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">لا توجد ملاحظات مسجلة</p>
                    <button onClick={() => handleOpenModal()} className="mt-4 text-blue-600 hover:underline">أضف ملاحظتك الأولى</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notes.map(note => (
                        <div 
                            key={note.id} 
                            className={`p-5 rounded-xl shadow-sm border transition-transform hover:-translate-y-1 relative group h-64 flex flex-col ${note.color}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg text-gray-800 line-clamp-1 flex items-center gap-2">
                                    {note.title}
                                    {note.isImportant && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                                </h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(note)} className="p-1.5 bg-white/50 hover:bg-white rounded text-blue-600 shadow-sm" title="تعديل"><Edit2 size={14}/></button>
                                    <button onClick={() => handleDeleteClick(note.id)} className="p-1.5 bg-white/50 hover:bg-white rounded text-red-600 shadow-sm" title="حذف"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                {note.content}
                            </div>
                            <div className="mt-4 pt-3 border-t border-black/5 text-xs text-gray-500 flex items-center gap-1">
                                <Calendar size={12}/> {note.createdAt}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Note Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">{currentNote.id ? 'تعديل ملاحظة' : 'إضافة ملاحظة جديدة'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-500 hover:text-red-500" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الملاحظة</label>
                                <input 
                                    type="text" 
                                    value={currentNote.title} 
                                    onChange={e => setCurrentNote({...currentNote, title: e.target.value})} 
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="مثال: مهام الكنترول اليوم"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">المحتوى</label>
                                <textarea 
                                    value={currentNote.content} 
                                    onChange={e => setCurrentNote({...currentNote, content: e.target.value})} 
                                    className="w-full border p-2 rounded h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="اكتب تفاصيل الملاحظة هنا..."
                                />
                            </div>
                            
                            {/* Importance Toggle */}
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer border border-gray-200 hover:bg-gray-100 transition">
                                <input 
                                    type="checkbox" 
                                    checked={currentNote.isImportant}
                                    onChange={e => setCurrentNote({...currentNote, isImportant: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                    <Star size={18} className={currentNote.isImportant ? "text-yellow-500 fill-yellow-500" : "text-gray-400"} />
                                    <span className="text-sm font-bold text-gray-700">تثبيت في الشاشة الرئيسية (ملاحظة مهمة)</span>
                                </div>
                            </label>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">لون البطاقة</label>
                                <div className="flex gap-2">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c.class}
                                            onClick={() => setCurrentNote({...currentNote, color: c.class})}
                                            className={`w-8 h-8 rounded-full border-2 ${c.class.split(' ')[0]} ${currentNote.color === c.class ? 'ring-2 ring-offset-2 ring-gray-400 border-gray-400' : 'border-transparent'}`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 mt-2 flex items-center justify-center gap-2">
                                <Save size={18}/> حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">حذف الملاحظة</h3>
                        <p className="text-gray-600 mb-6 text-sm">هل أنت متأكد من حذف هذه الملاحظة نهائياً؟</p>
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={() => setDeleteConfirmOpen(false)} 
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                إلغاء
                            </button>
                            <button 
                                onClick={executeDelete} 
                                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
                            >
                                نعم، حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notes;
