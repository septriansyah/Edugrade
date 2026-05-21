import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ClipboardList, Loader2, Calendar, Sparkles, FileUp, ListChecks } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/src/lib/utils";
import { useNavigate } from "react-router-dom";

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  classId: string;
  subject: string;
  editAssignment?: any;
}

export default function CreateAssignmentModal({ isOpen, onClose, onCreated, classId, subject, editAssignment }: CreateAssignmentModalProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [method, setMethod] = useState<"manual" | "ai">("manual");
  const [viewMode, setViewMode] = useState<"standard" | "form" | "paper">("standard");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (editAssignment) {
      setTitle(editAssignment.title || "");
      setDescription(editAssignment.description || "");
      
      let dateVal = "";
      if (editAssignment.dueDate) {
        const d = editAssignment.dueDate.toDate ? editAssignment.dueDate.toDate() : new Date(editAssignment.dueDate);
        if (!isNaN(d.getTime())) {
          const tzoffset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
          dateVal = localISOTime;
        }
      }
      setDueDate(dateVal);
      setFileUrl(editAssignment.fileUrl || "");
      setMethod(editAssignment.method || "manual");
      setViewMode(editAssignment.viewMode || "standard");
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setFileUrl("");
      setMethod("manual");
      setViewMode("standard");
    }
  }, [editAssignment, isOpen]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !auth.currentUser) return;

    setIsCreating(true);
    
    if (method === "ai" && !editAssignment) {
      // Redirect to generator with class context
      const params = new URLSearchParams({
        classId,
        assignmentTitle: title,
        description,
        viewMode,
      });
      if (dueDate) params.set("dueDate", dueDate);
      navigate(`/generator?${params.toString()}`);
      onClose();
      return;
    }

    const path = "assignments";
    try {
      if (editAssignment) {
        await updateDoc(doc(db, "assignments", editAssignment.id), {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          viewMode,
          fileUrl: method === "manual" ? fileUrl : "",
        });
      } else {
        await addDoc(collection(db, path), {
          title,
          description,
          subject,
          classId,
          teacherId: auth.currentUser.uid,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          status: "active",
          method,
          viewMode,
          fileUrl: method === "manual" ? fileUrl : "",
          createdAt: serverTimestamp(),
        });
      }
      setTitle("");
      setDescription("");
      setDueDate("");
      setFileUrl("");
      onClose();
      if (onCreated) onCreated();
    } catch (error) {
      handleFirestoreError(error, editAssignment ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
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
            className="bg-white rounded-[40px] md:rounded-[48px] p-8 md:p-10 w-full max-w-2xl relative z-10 shadow-2xl border border-outline-variant/30"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 md:right-8 md:top-8 p-3 hover:bg-surface rounded-full transition-colors"
            >
              <X size={24} className="text-outline" />
            </button>
            
            <h3 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
              {editAssignment ? "Ubah Tugas" : "Buat Tugas Baru"}
            </h3>
            <p className="text-on-surface-variant font-medium mb-8">
              {editAssignment ? "Perbarui informasi detail tugas di bawah ini." : "Pilih metode pembuatan tugas yang paling efisien."}
            </p>
            
            <form onSubmit={handleCreateAssignment} className="space-y-6 md:space-y-8">
              {!editAssignment && (
                <div className="flex bg-on-surface/5 p-1.5 rounded-2xl mb-4">
                   <button 
                      type="button" 
                      onClick={() => setMethod("manual")} 
                      className={cn("flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3", method === "manual" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant/40")}
                   >
                      <FileUp size={18} /> Manual / File
                   </button>
                   <button 
                      type="button" 
                      onClick={() => setMethod("ai")} 
                      className={cn("flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3", method === "ai" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant/40")}
                   >
                      <Sparkles size={18} /> Generator AI
                   </button>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Judul Tugas</label>
                <input 
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Analisis Struktur Sel Tumbuhan" 
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] font-bold text-lg transition-all"
                />
              </div>
              
              {(method === "manual" || editAssignment) && (
                <>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Mode Tampilan Siswa</label>
                    <select 
                      value={viewMode}
                      onChange={(e: any) => setViewMode(e.target.value)}
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] font-bold text-lg appearance-none"
                    >
                      <option value="standard">Mode Standar (Digital)</option>
                      <option value="form">Mode Form (Pilihan Ganda Saja)</option>
                      <option value="paper">Mode Kertas (Kertas Kosong)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Instruksi / Deskripsi</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jelaskan apa yang harus dikerjakan siswa..." 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] font-bold text-lg transition-all min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Tenggat Waktu (Opsional)</label>
                    <div className="relative">
                      <input 
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] font-bold text-lg transition-all pr-12"
                      />
                      <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Tautan File (URL)</label>
                    <input 
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="https://link-soal.pdf" 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-6 py-4 rounded-[20px] font-bold text-lg transition-all"
                    />
                  </div>
                </>
              )}

              {(method === "ai" && !editAssignment) && (
                <div className="p-8 bg-primary/5 rounded-[32px] border border-primary/10 flex items-center gap-6">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Sparkles className="text-primary" size={32} />
                   </div>
                   <div>
                      <p className="text-sm font-bold">Lanjutkan dengan AI</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant/60 mt-1">Sistem akan membuka generator dengan konteks judul di atas.</p>
                   </div>
                </div>
              )}
              
              <button 
                type="submit"
                disabled={isCreating && (method === "manual" || !!editAssignment)}
                className={cn(
                  "w-full py-4 md:py-5 rounded-[24px] font-bold shadow-2xl active:scale-95 transition-all text-lg md:text-xl flex items-center justify-center gap-4 disabled:opacity-50",
                  (method === "ai" && !editAssignment) ? "bg-on-surface text-white" : "bg-primary text-white shadow-primary/30"
                )}
              >
                {isCreating ? <Loader2 className="animate-spin" size={24} /> : ((method === "ai" && !editAssignment) ? <Sparkles size={24} /> : <ClipboardList size={24} />)}
                {editAssignment ? "SIMPAN PERUBAHAN" : (method === "ai" ? "LANJUT KE GENERATOR" : "TERBITKAN TUGAS")}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
