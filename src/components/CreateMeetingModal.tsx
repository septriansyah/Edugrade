import React, { useState, useEffect } from "react";
import { X, Calendar, Video, Link as LinkIcon, Loader2, Plus, Sparkles } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/src/lib/utils";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  classId: string;
  editMeeting?: any;
}

export default function CreateMeetingModal({ isOpen, onClose, onCreated, classId, editMeeting }: CreateMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<"zoom" | "gmeet">("gmeet");
  const [link, setLink] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editMeeting) {
      setTitle(editMeeting.title || "");
      setPlatform(editMeeting.platform || "gmeet");
      setLink(editMeeting.link || "");
      
      let dateVal = "";
      if (editMeeting.startTime) {
        const d = editMeeting.startTime.toDate ? editMeeting.startTime.toDate() : new Date(editMeeting.startTime);
        if (!isNaN(d.getTime())) {
          const tzoffset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
          dateVal = localISOTime;
        }
      }
      setStartTime(dateVal);
    } else {
      setTitle("");
      setPlatform("gmeet");
      setLink("");
      setStartTime("");
    }
  }, [editMeeting, isOpen]);

  const generateGMeetLink = () => {
    const randomCode = Math.random().toString(36).substring(2, 5) + "-" + 
                       Math.random().toString(36).substring(2, 6) + "-" + 
                       Math.random().toString(36).substring(2, 5);
    setLink(`https://meet.google.com/${randomCode}`);
    setPlatform("gmeet");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !link.trim() || !classId || !auth.currentUser) return;

    setIsSubmitting(true);
    const path = "meetings";
    try {
      if (editMeeting) {
        await updateDoc(doc(db, "meetings", editMeeting.id), {
          title,
          platform,
          link,
          startTime: startTime ? new Date(startTime).toISOString() : null,
        });
      } else {
        await addDoc(collection(db, path), {
          title,
          platform,
          link,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          classId,
          teacherId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }
      if (onCreated) onCreated();
      onClose();
      // Reset form
      setTitle("");
      setLink("");
      setStartTime("");
    } catch (error) {
      handleFirestoreError(error, editMeeting ? OperationType.UPDATE : OperationType.CREATE, path);
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
             <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Video className="text-secondary" size={20} />
             </div>
             <h3 className="text-2xl font-black italic tracking-tight text-secondary">
               {editMeeting ? "Ubah Meeting" : "Jadwalkan Meeting"}
             </h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-on-surface/5 flex items-center justify-center transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Judul Meeting</label>
            <input 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Sesi Konsultasi Biologi (Sintesis Protein)"
              className="w-full bg-white/50 border-2 border-white/40 focus:border-secondary outline-none px-6 py-4 rounded-2xl font-bold text-lg"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Pilih Platform</label>
            <div className="grid grid-cols-2 gap-4">
               <button 
                  type="button"
                  onClick={() => setPlatform("gmeet")}
                  className={cn(
                      "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all",
                      platform === "gmeet" ? "bg-secondary text-white border-secondary shadow-lg" : "bg-white/40 border-white/40 text-on-surface-variant hover:border-secondary/20"
                  )}
               >
                  <Video size={20} />
                  <span className="font-bold">Google Meet</span>
               </button>
               <button 
                  type="button"
                  onClick={() => setPlatform("zoom")}
                  className={cn(
                      "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all",
                      platform === "zoom" ? "bg-secondary text-white border-secondary shadow-lg" : "bg-white/40 border-white/40 text-on-surface-variant hover:border-secondary/20"
                  )}
               >
                  <Video size={20} />
                  <span className="font-bold">Zoom</span>
               </button>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Link Meeting</label>
                {platform === "gmeet" && (
                    <button 
                        type="button" 
                        onClick={generateGMeetLink}
                        className="text-[10px] font-black text-secondary hover:underline flex items-center gap-2"
                    >
                        <Sparkles size={12} />
                        Buat Link Otomatis
                    </button>
                )}
             </div>
             <div className="relative">
                <input 
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full bg-white/50 border-2 border-white/40 focus:border-secondary outline-none px-6 py-4 rounded-2xl font-bold text-lg pr-12"
                />
                <LinkIcon className="absolute right-6 top-4.5 text-outline/20" size={24} />
             </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Waktu Mulai (Opsional)</label>
            <div className="relative">
              <input 
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white/50 border-2 border-white/40 focus:border-secondary outline-none px-6 py-4 rounded-2xl font-bold text-lg pr-12"
              />
              <Calendar className="absolute right-6 top-4.5 text-outline/20 pointer-events-none" size={24} />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
             <button type="button" onClick={onClose} className="px-8 py-4 font-bold text-on-surface-variant hover:text-on-surface transition-all">Batal</button>
             <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-secondary text-white px-12 py-4 rounded-2xl font-black italic tracking-tight flex items-center gap-3 shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
             >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                {editMeeting ? "Simpan Perubahan" : "Jadwalkan Meeting"}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
