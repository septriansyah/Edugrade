import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export default function JoinClassModal({ isOpen, onClose, onJoined }: JoinClassModalProps) {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !auth.currentUser) return;

    setIsJoining(true);
    const path = "classes";
    try {
      const q = query(collection(db, path), where("joinCode", "==", joinCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert("Kode kelas tidak valid.");
        return;
      }

      const classDoc = querySnapshot.docs[0];
      const classData = classDoc.data();
      const studentIds = classData.studentIds || [];
      
      if (studentIds.includes(auth.currentUser.uid)) {
        alert("Anda sudah terdaftar di kelas ini.");
        onClose();
        return;
      }

      await updateDoc(doc(db, path, classDoc.id), {
        studentIds: arrayUnion(auth.currentUser.uid)
      });

      alert(`Berhasil bergabung dengan kelas: ${classData.name}`);
      setJoinCode("");
      onClose();
      if (onJoined) onJoined();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsJoining(false);
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
            className="bg-white rounded-[40px] p-8 md:p-10 w-full max-w-lg relative z-10 shadow-2xl border border-outline-variant/30"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 p-2 hover:bg-surface rounded-full transition-colors"
            >
              <iconify-icon icon="lucide:x" width="20"  className="text-outline" ></iconify-icon>
            </button>
            
            <h3 className="text-3xl font-black mb-2 tracking-tight">Gabung Kelas</h3>
            <p className="text-on-surface-variant font-medium mb-8">Masukkan kode kelas yang diberikan oleh guru Anda.</p>
            
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Kode Kelas</label>
                <div className="relative group">
                  <input 
                    autoFocus
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="CONTOH: X7Y2Z9" 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary outline-none px-8 py-5 rounded-[24px] font-black text-2xl tracking-widest uppercase transition-all"
                  />
                  <iconify-icon icon="lucide:key" width="24" className="absolute right-6 top-1/2 -translate-y-1/2 text-outline/30"  ></iconify-icon>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isJoining || !joinCode}
                className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-xl flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isJoining ? <iconify-icon icon="lucide:loader2" width="24" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:plus" width="24"  ></iconify-icon>}
                GABUNG SEKARANG
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
