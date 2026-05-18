import React, { useState } from "react";
import { X, Send, Link as LinkIcon, FileText, Loader2, MessageSquare } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/src/lib/utils";

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  classId: string;
}

export default function CreateMaterialModal({ isOpen, onClose, onCreated, classId }: CreateMaterialModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"file" | "link">("link");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !classId || !auth.currentUser) return;

    setIsSubmitting(true);
    const path = "materials";
    try {
      await addDoc(collection(db, path), {
        title,
        message,
        type,
        url,
        classId,
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      if (onCreated) onCreated();
      onClose();
      // Reset form
      setTitle("");
      setMessage("");
      setUrl("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-on-surface/40 backdrop-blur-xl">
      <div className="w-full max-w-2xl bg-surface rounded-[40px] shadow-3xl overflow-hidden border border-white/20">
        <div className="p-8 border-b border-on-surface/5 flex justify-between items-center bg-white/60">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="text-primary" size={20} />
             </div>
             <h3 className="text-2xl font-black italic tracking-tight text-primary">Kirim Materi</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-on-surface/5 flex items-center justify-center transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Judul Materi</label>
            <input 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Modul Sintesis Protein Bab 4"
              className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold text-lg"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Pesan untuk Siswa</label>
            <div className="relative">
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan petunjuk atau pesan tambahan..."
                className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold text-lg min-h-[120px] pr-12"
              />
              <MessageSquare className="absolute right-6 top-6 text-outline/20" size={24} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
                type="button"
                onClick={() => setType("link")}
                className={cn(
                    "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all",
                    type === "link" ? "bg-primary text-white border-primary shadow-lg" : "bg-white/40 border-white/40 text-on-surface-variant hover:border-primary/20"
                )}
             >
                <LinkIcon size={20} />
                <span className="font-bold">Tautan / URL</span>
             </button>
             <button 
                type="button"
                onClick={() => setType("file")}
                className={cn(
                    "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all",
                    type === "file" ? "bg-primary text-white border-primary shadow-lg" : "bg-white/40 border-white/40 text-on-surface-variant hover:border-primary/20"
                )}
             >
                <FileText size={20} />
                <span className="font-bold">File (Buka URL)</span>
             </button>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">URL Sumber</label>
            <input 
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold text-lg"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
             <button type="button" onClick={onClose} className="px-8 py-4 font-bold text-on-surface-variant hover:text-on-surface transition-all">Batal</button>
             <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-white px-12 py-4 rounded-2xl font-black italic tracking-tight flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
             >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                Kirim Materi
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
