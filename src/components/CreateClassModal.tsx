import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateClassModal({ isOpen, onClose, onCreated }: CreateClassModalProps) {
  const [newClassName, setNewClassName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [educationLevel, setEducationLevel] = useState("SMA");
  const [grade, setGrade] = useState("10");
  const [newJoinCode, setNewJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const generateJoinCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewJoinCode(code);
  };

  useEffect(() => {
    if (isOpen) {
        generateJoinCode();
    }
  }, [isOpen]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newSubject || !auth.currentUser) return;

    setIsCreating(true);
    const path = "classes";
    try {
      // Check for uniqueness
      const q = query(collection(db, path), where("joinCode", "==", newJoinCode));
      const checkSnapshot = await getDocs(q);
      
      if (!checkSnapshot.empty) {
        // Collision! Generate a new one and tell the user to click again or just auto-retry
        // For simplicity, we just alert and let them regenerate.
        alert("Kode kelas sudah digunakan, silakan generate ulang.");
        setIsCreating(false);
        return;
      }

      await addDoc(collection(db, path), {
        name: newClassName,
        subject: newSubject,
        educationLevel,
        grade,
        teacherId: auth.currentUser.uid,
        joinCode: newJoinCode,
        studentIds: [],
        createdAt: serverTimestamp()
      });
      setNewClassName("");
      setNewSubject("");
      onClose();
      if (onCreated) onCreated();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[40px] md:rounded-[48px] p-8 md:p-10 w-full max-w-xl relative z-10 shadow-2xl border border-outline-variant/30"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 md:right-8 md:top-8 p-3 hover:bg-surface rounded-full transition-colors"
            >
              <iconify-icon icon="lucide:x" width="24"  className="text-outline" ></iconify-icon>
            </button>
            
            <h3 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Buat Kelas Baru</h3>
            <p className="text-on-surface-variant font-medium mb-8 md:mb-10">Mulai kelola kurikulum dan siswa Anda hari ini.</p>
            
            <form onSubmit={handleCreateClass} className="space-y-6 md:space-y-8">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[10px] md:text-sm font-black text-on-surface-variant uppercase tracking-widest ml-1">Nama Kelas</label>
                <input 
                  autoFocus
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Contoh: XII IPA 1" 
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 md:px-8 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-bold text-lg md:text-xl transition-all"
                />
              </div>
              
              <div className="space-y-3 md:space-y-4">
                <label className="text-[10px] md:text-sm font-black text-on-surface-variant uppercase tracking-widest ml-1">Mata Pelajaran</label>
                <input 
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Contoh: Biologi Modern" 
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 md:px-8 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-bold text-lg md:text-xl transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 md:space-y-4">
                    <label className="text-[10px] md:text-sm font-black text-on-surface-variant uppercase tracking-widest ml-1">Jenjang</label>
                    <select 
                        value={educationLevel}
                        onChange={(e) => {
                            setEducationLevel(e.target.value);
                            if (e.target.value === "SD") setGrade("1");
                            else if (e.target.value === "SMP") setGrade("7");
                            else if (e.target.value === "SMA") setGrade("10");
                            else setGrade("Semester 1");
                        }}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] md:rounded-[24px] font-bold text-sm md:text-base appearance-none"
                    >
                        <option>SD</option>
                        <option>SMP</option>
                        <option>SMA</option>
                        <option>Kuliah</option>
                    </select>
                </div>
                <div className="space-y-3 md:space-y-4">
                    <label className="text-[10px] md:text-sm font-black text-on-surface-variant uppercase tracking-widest ml-1">Kelas/Semester</label>
                    <select 
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] md:rounded-[24px] font-bold text-sm md:text-base appearance-none"
                    >
                        {educationLevel === "SD" && ["1", "2", "3", "4", "5", "6"].map(g => <option key={g}>{g}</option>)}
                        {educationLevel === "SMP" && ["7", "8", "9"].map(g => <option key={g}>{g}</option>)}
                        {educationLevel === "SMA" && ["10", "11", "12"].map(g => <option key={g}>{g}</option>)}
                        {educationLevel === "Kuliah" && ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"].map(g => <option key={g}>{g}</option>)}
                    </select>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <label className="text-[10px] md:text-sm font-black text-on-surface-variant uppercase tracking-widest ml-1">Kode Kelas (Otomatis)</label>
                <div className="flex gap-4">
                  <div className="flex-grow bg-surface-container-high px-6 md:px-8 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-xl md:text-2xl tracking-widest text-primary flex items-center justify-center border-2 border-dashed border-primary/20">
                    {newJoinCode}
                  </div>
                  <button 
                    type="button"
                    onClick={generateJoinCode}
                    className="p-4 md:p-5 bg-surface-container-low rounded-[20px] md:rounded-[24px] hover:bg-surface-container-high transition-colors text-primary"
                  >
                    <iconify-icon icon="lucide:zap" width="24"  ></iconify-icon>
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isCreating}
                className="w-full bg-primary text-white py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-lg md:text-xl flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isCreating ? <iconify-icon icon="lucide:loader2" width="24" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:zap" width="24"  fill="currentColor" ></iconify-icon>}
                KONFIRMASI & TERBITKAN
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
