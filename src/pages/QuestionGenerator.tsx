import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { auth, db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";

interface Question {
  id?: string;
  question: string;
  taxonomy: string;
  type: "Multiple Choice" | "Essay";
  options?: { label: string; text: string; isCorrect: boolean }[];
  explanation?: string;
}

interface QuestionConfig {
  level: string;
  type: string;
}

export default function QuestionGenerator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get("classId");
  const initialTitle = searchParams.get("assignmentTitle") || "";
  const initialDesc = searchParams.get("description") || "";
  const initialDueDate = searchParams.get("dueDate") || "";
  const initialViewMode = searchParams.get("viewMode") || "standard";
  const typeParam = searchParams.get("type") || "assignment";
  
  const [publishViewMode, setPublishViewMode] = useState(initialViewMode);
  const [activeTab, setActiveTab] = useState<"generate" | "bank" >("generate");
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([
    { level: "C1", type: "Multiple Choice" },
    { level: "C2", type: "Multiple Choice" },
    { level: "C3", type: "Multiple Choice" },
    { level: "C4", type: "Multiple Choice" },
    { level: "C5", type: "Multiple Choice" },
  ]);
  const [topic, setTopic] = useState(initialTitle);
  const [assignmentDescription, setAssignmentDescription] = useState(initialDesc);
  const [assignmentSubject, setAssignmentSubject] = useState("");
  const [educationLevel, setEducationLevel] = useState("SMA");
  const [grade, setGrade] = useState("10");
  const [count, setCount] = useState(5);
  const [optionCount, setOptionCount] = useState(4);
  const [referenceMaterial, setReferenceMaterial] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (classId) {
      const fetchClassDetails = async () => {
        try {
          const docSnap = await getDoc(doc(db, "classes", classId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (!initialTitle) setTopic(data.subject || "");
            setAssignmentSubject(data.subject || "");
            if (data.educationLevel) setEducationLevel(data.educationLevel);
            if (data.grade) setGrade(data.grade);
          }
        } catch (error) {
          console.error("Error fetching class for generator:", error);
        }
      };
      fetchClassDetails();
    }
  }, [classId, initialTitle]);

  useEffect(() => {
    const validCount = isNaN(count) ? 0 : Math.max(0, Math.min(20, count));
    setQuestionConfigs(prev => {
      if (prev.length === validCount) return prev;
      if (prev.length < validCount) {
        const extra = Array(validCount - prev.length).fill(null).map(() => ({ 
            level: "C1", 
            type: "Multiple Choice"
        }));
        return [...prev, ...extra];
      } else {
        return prev.slice(0, validCount);
      }
    });
  }, [count]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState<Record<number, boolean>>({});
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSavingBank, setIsSavingBank] = useState<Record<number, boolean>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{index: number, type: "generated" | "bank"} | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (retryCountdown !== null && retryCountdown > 0) {
      timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
    } else if (retryCountdown === 0) {
      setRetryCountdown(null);
      setGenerationError(null);
    }
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  useEffect(() => {
    if (activeTab === "bank") {
      fetchBankQuestions();
    }
  }, [activeTab]);

  const fetchBankQuestions = async () => {
    if (!auth.currentUser) return;
    setIsLoadingBank(true);
    const path = "questionBank";
    try {
      const q = query(collection(db, path), where("authorId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];
      setBankQuestions(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setIsLoadingBank(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setReferenceMaterial(text);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!topic && !referenceMaterial) return;
    
    if (userProfile && (userProfile.aiTokens || 0) <= 0) {
      if (confirm("Token AI Generator Anda habis. Beralih ke Premium untuk mendapatkan 1000 Token AI Generator?")) {
          navigate("/pricing");
      }
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || fileName || "Materi Pembelajaran",
          educationLevel,
          grade,
          count,
          optionCount,
          questionConfigs,
          referenceMaterial
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.retryAfter) {
          setRetryCountdown(errorData.retryAfter);
        }
        throw new Error(errorData.error || "Failed to generate");
      }
      const data = await response.json();
      setQuestions(data);
      
      if (auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, {
              aiTokens: Math.max(0, (userProfile?.aiTokens || 0) - 1)
          });
          setUserProfile((prev: any) => ({ ...prev, aiTokens: Math.max(0, (prev?.aiTokens || 0) - 1) }));
      }
    } catch (error: any) {
      console.error(error);
      setGenerationError(error.message);
      // Removed fallback to ensure user sees the real error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFollowup = async (index: number) => {
    const q = questions[index];
    setIsGeneratingFollowup(prev => ({ ...prev, [index]: true }));
    try {
      const response = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          originalQuestion: q,
          topic: topic || "Materi Pembelajaran",
          educationLevel,
          grade,
          optionCount
        }),
      });
      if (!response.ok) throw new Error("Failed to generate follow-up");
      const followUp = await response.json();
      
      setQuestions(prev => {
        const next = [...prev];
        next.splice(index + 1, 0, followUp);
        return next;
      });
    } catch (error) {
      console.error("Follow-up generation error:", error);
      alert("Gagal membuat soal lanjutan.");
    } finally {
      setIsGeneratingFollowup(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSaveToBank = async (q: Question, index?: number) => {
    if (!auth.currentUser) return;
    if (index !== undefined) setIsSavingBank(prev => ({ ...prev, [index]: true }));
    const path = "questionBank";
    try {
      await addDoc(collection(db, path), {
        ...q,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        source: "Dibuat AI"
      });
      // Optionally remove from the live list if saved individually
      if (index !== undefined) {
         setQuestions(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      if (index !== undefined) setIsSavingBank(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSaveAllToBank = async () => {
    if (questions.length === 0) return;
    const confirmSave = confirm(`Simpan ${questions.length} soal ke Bank Soal?`);
    if (!confirmSave) return;

    for (const q of questions) {
      await handleSaveToBank(q);
    }
    setQuestions([]);
    setActiveTab("bank");
  };

  const handlePublishAssignment = async () => {
    if (!classId || questions.length === 0 || !auth.currentUser) return;
    
    setIsPublishing(true);
    const path = "assignments";
    try {
      await addDoc(collection(db, path), {
        title: initialTitle || topic || (typeParam === "exam" ? "Ujian dari Generator AI" : "Tugas dari Generator AI"),
        description: assignmentDescription,
        subject: assignmentSubject || topic || "Umum",
        dueDate: initialDueDate ? new Date(initialDueDate).toISOString() : null,
        classId,
        teacherId: auth.currentUser.uid,
        status: "active",
        method: "ai",
        viewMode: typeParam === "exam" ? "paper" : publishViewMode,
        type: typeParam,
        questions: questions.map(({ id, ...q }) => q), // Save question data directly in assignment
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert(typeParam === "exam" ? "Ujian berhasil diterbitkan ke kelas!" : "Tugas berhasil diterbitkan ke kelas!");
      navigate(`/class/${classId}?tab=${typeParam === "exam" ? "exams" : "assignments"}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUpdateQuestion = async (updatedQ: Question) => {
    if (!editingQuestion) return;

    if (editingQuestion.type === "generated") {
      const newQuestions = [...questions];
      newQuestions[editingQuestion.index] = updatedQ;
      setQuestions(newQuestions);
    } else {
      if (!updatedQ.id) return;
      const path = "questionBank";
      try {
        await updateDoc(doc(db, path, updatedQ.id), {
          ...updatedQ,
          updatedAt: serverTimestamp()
        });
        const newBank = [...bankQuestions];
        newBank[editingQuestion.index] = updatedQ;
        setBankQuestions(newBank);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
    setEditingQuestion(null);
  };

  const handleDeleteFromBank = async (id: string, index: number) => {
    if (!confirm("Hapus soal ini dari Bank Soal?")) return;
    const path = "questionBank";
    try {
      await deleteDoc(doc(db, path, id));
      const newBank = [...bankQuestions];
      newBank.splice(index, 1);
      setBankQuestions(newBank);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Navigation Tabs */}
        <div className="flex gap-4 bg-white/40 p-2 rounded-[32px] w-fit shadow-lg backdrop-blur-md">
            <button 
                onClick={() => setActiveTab("generate")}
                className={cn(
                    "px-8 py-4 rounded-[28px] font-black italic tracking-tight transition-all flex items-center gap-3",
                    activeTab === "generate" ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" : "text-on-surface-variant hover:bg-white/60"
                )}
            >
                <iconify-icon icon="lucide:sparkles" width="20"  ></iconify-icon>
                Generator AI
            </button>
            <button 
                onClick={() => setActiveTab("bank")}
                className={cn(
                    "px-8 py-4 rounded-[28px] font-black italic tracking-tight transition-all flex items-center gap-3",
                    activeTab === "bank" ? "bg-secondary text-white shadow-xl shadow-secondary/20 scale-105" : "text-on-surface-variant hover:bg-white/60"
                )}
            >
                <iconify-icon icon="lucide:database" width="20"  ></iconify-icon>
                Bank Soal
            </button>
        </div>

        {activeTab === "generate" ? (
          <>
            {/* Generator Controls */}
            <section className="premium-card p-12 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                      <iconify-icon icon="lucide:sparkles" width="28" className="text-primary"  ></iconify-icon>
                   </div>
                   <h1 className="text-5xl font-black tracking-tight text-primary italic">{typeParam === "exam" ? "AI Exam Generator" : "AI Generator"}</h1>
                </div>
                
                <p className="text-2xl text-on-surface-variant/80 font-medium max-w-3xl mb-12 leading-relaxed">
                  {typeParam === "exam"
                    ? "Konfigurasi parameter atau unggah materi untuk menghasilkan paket ujian yang seimbang sesuai standar Taksonomi Bloom."
                    : "Konfigurasi parameter atau unggah materi untuk menghasilkan paket soal yang seimbang sesuai standar Taksonomi Bloom."}
                  {userProfile && (
                    <span className="block mt-4 text-sm font-bold text-primary bg-primary/10 w-fit px-4 py-2 rounded-full">
                      Sisa Token AI: {userProfile.aiTokens || 0}
                    </span>
                  )}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-outline uppercase tracking-[0.2em] ml-1">Topik Utama atau Unggah Materi</label>
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <input 
                            placeholder="Contoh: Pembelahan Sel Meiosis"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-8 py-5 rounded-[28px] font-bold text-xl transition-all shadow-inner"
                          />
                          <iconify-icon icon="lucide:book-open" width="24" className="absolute right-8 top-5.5 text-outline/40"  ></iconify-icon>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".txt,.md,.pdf" // Note: PDF parsing might need service side help, sticking to text/md for now effectively
                            className="hidden" 
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-3 p-5 rounded-[24px] border-2 border-dashed transition-all font-bold",
                              fileName ? "border-primary bg-primary/5 text-primary" : "border-outline/20 hover:border-primary/40 text-on-surface-variant"
                            )}
                          >
                            {fileName ? <iconify-icon icon="lucide:file-text" width="20"  ></iconify-icon> : <iconify-icon icon="lucide:upload-cloud" width="20"  ></iconify-icon>}
                            {fileName ? `${fileName}` : "Unggah File Materi (.txt)"}
                            {fileName && <iconify-icon icon="lucide:x" width="16" className="ml-2 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setFileName(""); setReferenceMaterial(""); }}></iconify-icon>}
                          </button>
                        </div>
                        {referenceMaterial && (
                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Materi Terdeteksi</p>
                            <p className="text-xs text-on-surface-variant line-clamp-2">{referenceMaterial}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <label className="text-xs font-black text-outline uppercase tracking-[0.2em] ml-1">Jenjang</label>
                        <select 
                          value={educationLevel}
                          onChange={(e) => {
                            setEducationLevel(e.target.value);
                            // Reset grade based on level
                            if (e.target.value === "SD") setGrade("1");
                            else if (e.target.value === "SMP") setGrade("7");
                            else if (e.target.value === "SMA") setGrade("10");
                            else setGrade("Semester 1");
                          }}
                          className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold text-lg appearance-none"
                        >
                          <option>SD</option>
                          <option>SMP</option>
                          <option>SMA</option>
                          <option>Kuliah</option>
                        </select>
                      </div>
                      <div className="space-y-4">
                        <label className="text-xs font-black text-outline uppercase tracking-[0.2em] ml-1">Kelas</label>
                        <select 
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold text-lg appearance-none"
                        >
                          {educationLevel === "SD" && ["1", "2", "3", "4", "5", "6"].map(g => <option key={g}>{g}</option>)}
                          {educationLevel === "SMP" && ["7", "8", "9"].map(g => <option key={g}>{g}</option>)}
                          {educationLevel === "SMA" && ["10", "11", "12"].map(g => <option key={g}>{g}</option>)}
                          {educationLevel === "Kuliah" && ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"].map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-4">
                        <label className="text-xs font-black text-outline uppercase tracking-[0.2em] ml-1">Jumlah</label>
                        <input 
                          type="number" 
                          value={isNaN(count) ? "" : count}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setCount(isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold text-lg text-center" 
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black text-outline uppercase tracking-[0.2em] ml-1">Jumlah Opsi (Pilihan Ganda)</label>
                      <div className="flex gap-4">
                        {[2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            onClick={() => setOptionCount(val)}
                            className={cn(
                              "flex-1 py-4 rounded-2xl font-black transition-all border-2",
                              optionCount === val ? "bg-primary text-white border-primary shadow-lg scale-105" : "bg-white/50 border-white/40 text-on-surface-variant hover:border-primary/40"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-primary/5 rounded-[40px] p-10 border border-primary/10">
                    <div className="flex justify-between items-center mb-8">
                       <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em]">Konfigurasi Butir Soal</h4>
                       <div className="text-[10px] font-bold text-on-surface-variant/40 italic">Setiap nomor dapat memiliki tipe & level berbeda</div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {questionConfigs.map((config, idx) => (
                        <div key={idx} className="bg-white/60 p-5 rounded-3xl border border-primary/10 space-y-4 transition-all hover:bg-white/80 group">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Nomor {idx + 1}</span>
                            <div className="flex gap-2">
                               {["Multiple Choice", "Essay"].map((t) => (
                                 <button
                                   key={t}
                                   onClick={() => {
                                     const next = [...questionConfigs];
                                     next[idx] = { ...config, type: t };
                                     setQuestionConfigs(next);
                                   }}
                                   className={cn(
                                     "px-3 py-1 rounded-lg text-[9px] font-black transition-all border",
                                     config.type === t ? "bg-secondary text-white border-secondary shadow-sm" : "text-secondary/40 border-secondary/10 hover:bg-secondary/5"
                                   )}
                                 >
                                   {t === "Multiple Choice" ? "Pilihan Ganda" : "Essay"}
                                 </button>
                               ))}
                            </div>
                          </div>

                          <div className="flex bg-primary/5 p-1 rounded-xl w-full justify-between gap-1">
                            {["C1", "C2", "C3", "C4", "C5", "C6"].map((l) => (
                              <button
                                key={l}
                                onClick={() => {
                                  const next = [...questionConfigs];
                                  next[idx] = { ...config, level: l };
                                  setQuestionConfigs(next);
                                }}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                  config.level === l ? "bg-primary text-white shadow-sm" : "text-primary/40 hover:text-primary hover:bg-primary/5"
                                )}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col items-center md:flex-row justify-end gap-4 md:gap-6 pt-10 border-t border-white/30">
                   {generationError && (
                     <div className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4 text-red-600 mb-4 md:mb-0">
                        <iconify-icon icon="lucide:x" width="20" className="shrink-0"  ></iconify-icon>
                        <p className="text-sm font-bold">{generationError}</p>
                     </div>
                   )}
                   <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full md:w-auto">
                    <button onClick={() => { setTopic(""); setQuestions([]); setGenerationError(null); }} className="btn-glass w-full sm:w-auto px-10 py-5 sm:py-3 text-on-surface-variant font-bold text-center">Reset</button>
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || retryCountdown !== null || (!topic && !referenceMaterial)}
                      className="btn-glass-primary w-full sm:w-auto px-12 py-5 rounded-[24px] text-xl flex items-center gap-4 sm:min-w-[280px] justify-center transition-all disabled:opacity-50"
                    >
                      {isGenerating ? <iconify-icon icon="lucide:loader2" width="28" className="animate-spin"  ></iconify-icon> : (retryCountdown !== null ? <span className="text-secondary">{retryCountdown}s</span> : <iconify-icon icon="lucide:sparkles" width="28"  ></iconify-icon>)}
                      {isGenerating ? "Menganalisis..." : (retryCountdown !== null ? "Harap Tunggu..." : "Buat dengan AI")}
                    </button>
                   </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] -mr-48 -mt-48" />
            </section>

            {/* Results Section */}
            <section className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div>
                  <h2 className="text-4xl font-black tracking-tight mb-2">Pratinjau Hasil</h2>
                  <p className="text-on-surface-variant font-medium">Lakukan pengeditan jika diperlukan sebelum disimpan ke Bank Soal.</p>
                </div>
                {questions.length > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                     {classId && (
                       <div className="flex flex-col md:flex-row gap-3 w-full">
                         {typeParam === "exam" ? (
                           <div className="bg-white/50 border-2 border-white/60 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm text-on-surface-variant flex items-center justify-center">
                             Mode Kertas (Paper Mode)
                           </div>
                         ) : (
                           <select
                             value={publishViewMode}
                             onChange={(e) => setPublishViewMode(e.target.value)}
                             className="bg-white/50 border-2 border-white/60 focus:border-on-surface outline-none px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest appearance-none shadow-sm"
                           >
                             <option value="standard">Mode Standar</option>
                             <option value="form">Mode Form</option>
                             <option value="paper">Mode Kertas</option>
                           </select>
                         )}
                         <button 
                           onClick={handlePublishAssignment} 
                           disabled={isPublishing}
                           className="flex-1 bg-on-surface text-white px-8 py-3 rounded-2xl font-black italic tracking-tight flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all disabled:opacity-50 whitespace-nowrap"
                         >
                            {isPublishing ? <iconify-icon icon="lucide:loader2" width="18" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:send" width="18"  ></iconify-icon>}
                            {typeParam === "exam" ? "Terbitkan Ujian" : "Terbitkan ke Kelas"}
                         </button>
                       </div>
                     )}
                     <button onClick={handleSaveAllToBank} className="w-full md:w-auto btn-glass-primary px-8 py-3 font-bold flex items-center justify-center gap-2 whitespace-nowrap">
                        <iconify-icon icon="lucide:save" width="18"  ></iconify-icon>
                        Simpan Semua ke Bank
                     </button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {isGenerating && (
                    <div className="space-y-8">
                        {[1, 2].map(i => (
                            <div key={i} className="premium-card h-64 animate-pulse" />
                        ))}
                    </div>
                )}

                {!isGenerating && questions.length === 0 && (
                    <div className="premium-card py-32 flex flex-col items-center text-center px-10">
                        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                            <iconify-icon icon="lucide:sparkles" width="48" className="text-primary/10"  ></iconify-icon>
                        </div>
                        <h3 className="text-3xl font-black mb-4">Mulai Membuat Soal</h3>
                        <p className="text-on-surface-variant max-w-sm text-lg font-medium">Gunakan panel di atas untuk menghasilkan soal berkualitas tinggi secara instan.</p>
                    </div>
                )}

                {!isGenerating && questions.map((q, idx) => (
                  <QuestionItem 
                    key={idx}
                    question={q}
                    onEdit={() => setEditingQuestion({ index: idx, type: "generated" })}
                    onPreview={() => setPreviewQuestion(q)}
                    onSave={() => handleSaveToBank(q, idx)}
                    isSaving={isSavingBank[idx]}
                    onGenerateFollowup={() => handleGenerateFollowup(idx)}
                    isGeneratingFollowup={isGeneratingFollowup[idx]}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-10">
             <div className="px-4">
                <h2 className="text-4xl font-black tracking-tight mb-2">Bank Soal Saya</h2>
                <p className="text-on-surface-variant font-medium">Manisipasi dan kelola koleksi soal yang telah Anda buat.</p>
             </div>

             <div className="space-y-8">
                {isLoadingBank ? (
                    <div className="flex justify-center py-20">
                        <iconify-icon icon="lucide:loader2" width="48" className="animate-spin text-primary"  ></iconify-icon>
                    </div>
                ) : bankQuestions.length === 0 ? (
                    <div className="premium-card py-32 flex flex-col items-center text-center px-10">
                        <div className="w-24 h-24 bg-secondary/5 rounded-full flex items-center justify-center mb-8">
                            <iconify-icon icon="lucide:database" width="48" className="text-secondary/10"  ></iconify-icon>
                        </div>
                        <h3 className="text-3xl font-black mb-4">Bank Soal Kosong</h3>
                        <p className="text-on-surface-variant max-w-sm text-lg font-medium">Hasilkan soal menggunakan AI atau buat secara manual untuk mengisi bank soal Anda.</p>
                    </div>
                ) : (
                    bankQuestions.map((q, idx) => (
                        <QuestionItem 
                            key={q.id || idx}
                            question={q}
                            onEdit={() => setEditingQuestion({ index: idx, type: "bank" })}
                            onPreview={() => setPreviewQuestion(q)}
                            onDelete={() => handleDeleteFromBank(q.id!, idx)}
                        />
                    ))
                )}
             </div>
          </section>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingQuestion && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setEditingQuestion(null)}
                    className="absolute inset-0 bg-on-surface/40 backdrop-blur-xl"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-4xl premium-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-8 border-b border-white/20 flex justify-between items-center bg-white/40">
                        <h3 className="text-3xl font-black italic tracking-tight text-primary">Edit Soal</h3>
                        <button onClick={() => setEditingQuestion(null)} className="w-12 h-12 rounded-full hover:bg-white/60 flex items-center justify-center transition-all">
                            <iconify-icon icon="lucide:x" width="24"  ></iconify-icon>
                        </button>
                    </div>
                    
                    <div className="p-10 space-y-10 overflow-y-auto flex-1">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Teks Pertanyaan</label>
                            <textarea 
                                value={editingQuestion.type === "generated" ? questions[editingQuestion.index].question : bankQuestions[editingQuestion.index].question}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (editingQuestion.type === "generated") {
                                        const next = [...questions];
                                        next[editingQuestion.index].question = val;
                                        setQuestions(next);
                                    } else {
                                        const next = [...bankQuestions];
                                        next[editingQuestion.index].question = val;
                                        setBankQuestions(next);
                                    }
                                }}
                                className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none p-8 rounded-[28px] font-bold text-xl min-h-[160px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Taksonomi Bloom</label>
                                <select 
                                    value={editingQuestion.type === "generated" ? questions[editingQuestion.index].taxonomy : bankQuestions[editingQuestion.index].taxonomy}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (editingQuestion.type === "generated") {
                                            const next = [...questions];
                                            next[editingQuestion.index].taxonomy = val;
                                            setQuestions(next);
                                        } else {
                                            const next = [...bankQuestions];
                                            next[editingQuestion.index].taxonomy = val;
                                            setBankQuestions(next);
                                        }
                                    }}
                                    className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold"
                                >
                                    {["C1", "C2", "C3", "C4", "C5", "C6"].map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Tipe</label>
                                <select 
                                    value={editingQuestion.type === "generated" ? questions[editingQuestion.index].type : bankQuestions[editingQuestion.index].type}
                                    className="w-full bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold appearance-none"
                                    disabled
                                >
                                    <option>Multiple Choice</option>
                                    <option>Essay</option>
                                </select>
                            </div>
                        </div>

                        {(editingQuestion.type === "generated" ? questions[editingQuestion.index].options : bankQuestions[editingQuestion.index].options) && (
                            <div className="space-y-6">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Opsi Jawaban</label>
                                <div className="space-y-4">
                                    {(editingQuestion.type === "generated" ? questions[editingQuestion.index].options! : bankQuestions[editingQuestion.index].options!).map((opt, oIdx) => (
                                        <div key={oIdx} className="flex gap-4 items-center">
                                            <button 
                                                onClick={() => {
                                                    const q = editingQuestion.type === "generated" ? questions[editingQuestion.index] : bankQuestions[editingQuestion.index];
                                                    const newOpts = q.options!.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                                                    handleUpdateQuestion({ ...q, options: newOpts });
                                                    setEditingQuestion(editingQuestion); // keep modal open
                                                }}
                                                className={cn(
                                                    "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black transition-all border-2",
                                                    opt.isCorrect ? "bg-primary border-primary text-white shadow-lg" : "border-outline/20 text-on-surface-variant hover:border-primary/40"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                            <input 
                                                value={opt.text}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const q = editingQuestion.type === "generated" ? questions[editingQuestion.index] : bankQuestions[editingQuestion.index];
                                                    const newOpts = [...q.options!];
                                                    newOpts[oIdx].text = val;
                                                    if (editingQuestion.type === "generated") {
                                                        const next = [...questions];
                                                        next[editingQuestion.index] = { ...q, options: newOpts };
                                                        setQuestions(next);
                                                    } else {
                                                        const next = [...bankQuestions];
                                                        next[editingQuestion.index] = { ...q, options: newOpts };
                                                        setBankQuestions(next);
                                                    }
                                                }}
                                                className="flex-1 bg-white/50 border-2 border-white/40 focus:border-primary outline-none px-6 py-4 rounded-2xl font-bold"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 border-t border-white/20 bg-white/40 flex justify-end gap-6">
                        <button onClick={() => setEditingQuestion(null)} className="btn-glass px-10 font-bold">Batal</button>
                        <button 
                            onClick={() => handleUpdateQuestion(editingQuestion.type === "generated" ? questions[editingQuestion.index] : bankQuestions[editingQuestion.index])}
                            className="btn-glass-primary px-12 py-4 rounded-[20px] font-black flex items-center gap-3 text-lg"
                        >
                            <iconify-icon icon="lucide:save" width="20"  ></iconify-icon>
                            Simpan Perubahan
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewQuestion && (
          <PreviewModal 
            question={previewQuestion} 
            onClose={() => setPreviewQuestion(null)} 
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function PreviewModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 md:p-12">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/60 backdrop-blur-2xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="relative w-full max-w-3xl bg-[#F8FAFC] rounded-[48px] shadow-4xl overflow-hidden flex flex-col max-h-[90vh] border border-white"
      >
        <div className="p-8 border-b border-on-surface/5 flex justify-between items-center bg-white/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <iconify-icon icon="lucide:eye" width="20" className="text-primary"  ></iconify-icon>
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest text-on-surface-variant/40">Pratinjau Tampilan Siswa</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-on-surface/5 flex items-center justify-center transition-all">
            <iconify-icon icon="lucide:x" width="20"  ></iconify-icon>
          </button>
        </div>

        <div className="p-10 md:p-14 overflow-y-auto flex-1 space-y-12">
          <div className="space-y-6">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Pertanyaan</p>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-on-surface">{question.question}</h2>
          </div>

          {question.type === "Multiple Choice" && question.options && (
            <div className="space-y-4">
              {question.options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedOption(opt.label)}
                  className={cn(
                    "w-full p-6 rounded-3xl border-2 flex items-center gap-6 transition-all text-left",
                    selectedOption === opt.label 
                      ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]" 
                      : "bg-white border-on-surface/5 hover:border-primary/40 hover:bg-primary/[0.02]"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all",
                    selectedOption === opt.label ? "bg-white/20 text-white" : "bg-on-surface/5 text-on-surface-variant/60"
                  )}>
                    {opt.label}
                  </div>
                  <span className="text-lg font-bold">{opt.text}</span>
                </button>
              ))}
            </div>
          )}

          {question.type === "Essay" && (
            <div className="space-y-4">
              <textarea 
                placeholder="Tuliskan jawaban Anda di sini..."
                className="w-full bg-white border-2 border-on-surface/5 rounded-3xl p-8 min-h-[200px] outline-none focus:border-primary transition-all font-medium text-lg"
              />
            </div>
          )}
        </div>

        <div className="p-8 border-t border-on-surface/5 bg-white/80 flex justify-between items-center">
          <button 
            onClick={() => setShowAnswer(!showAnswer)}
            className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 transition-all"
          >
            {showAnswer ? "Sembunyikan Jawaban" : "Lihat Kunci Jawaban"}
          </button>
          <div className="flex items-center gap-4">
            {showAnswer && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-green-500/10 text-green-600 px-6 py-4 rounded-2xl"
              >
                <iconify-icon icon="lucide:check" width="18"   ></iconify-icon>
                <span className="font-black text-xs uppercase tracking-widest">
                  {question.type === "Multiple Choice" 
                    ? `Jawaban Benar: ${question.options?.find(o => o.isCorrect)?.label}` 
                    : "Jawaban Esai (Review Manual)"}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const QuestionItem: React.FC<{ 
    question: Question, 
    onEdit: () => void, 
    onPreview?: () => void, 
    onSave?: () => void, 
    onDelete?: () => void,
    onGenerateFollowup?: () => void,
    isSaving?: boolean,
    isGeneratingFollowup?: boolean
}> = ({ question, onEdit, onPreview, onSave, onDelete, onGenerateFollowup, isSaving, isGeneratingFollowup }) => {
  const isBloomHigh = question.taxonomy.includes('C4') || question.taxonomy.includes('C5') || question.taxonomy.includes('C6');
  const tagColor = isBloomHigh ? "bg-primary/20 text-primary border-primary/20" : "bg-green-500/10 text-green-600 border-green-500/20";
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card-interactive p-10 group relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <iconify-icon icon="lucide:file-text" width="24" className="text-primary"  ></iconify-icon>
            </div>
            <div>
                <h4 className="text-lg font-black tracking-tight text-on-surface italic">Butir Soal</h4>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{question.taxonomy} • {question.type === "Multiple Choice" ? "Pilihan Ganda" : "Essay"}</p>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
           {onPreview && <button onClick={onPreview} className="p-3 bg-white/40 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all shadow-sm" title="Pratinjau"><iconify-icon icon="lucide:eye" width="18"  ></iconify-icon></button>}
           <button onClick={onEdit} className="p-3 bg-white/40 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all shadow-sm" title="Edit"><iconify-icon icon="lucide:edit2" width="18"  ></iconify-icon></button>
           {onDelete && <button onClick={onDelete} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Hapus"><iconify-icon icon="lucide:trash2" width="18"  ></iconify-icon></button>}
           {onGenerateFollowup && (
             <button 
               onClick={onGenerateFollowup} 
               disabled={isGeneratingFollowup}
               className="flex items-center gap-3 px-6 py-3 bg-secondary text-white rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-secondary/20 disabled:opacity-50"
               title="Buat Soal Lanjutan"
             >
               {isGeneratingFollowup ? <iconify-icon icon="lucide:loader2" width="18" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:plus" width="18"  ></iconify-icon>}
               <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Soal Lanjutan</span>
             </button>
           )}
           {onSave && (
             <button 
               onClick={onSave} 
               disabled={isSaving}
               className="flex items-center gap-3 px-6 py-3 bg-primary text-white rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
               title="Simpan ke Bank"
             >
               {isSaving ? <iconify-icon icon="lucide:loader2" width="18" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:save" width="18"  ></iconify-icon>}
               <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Simpan ke Bank</span>
             </button>
           )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 mb-10">
        <div className="flex-1 space-y-8">
            <div className="space-y-3">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Pertanyaan</p>
                <p className="text-2xl font-black leading-snug tracking-tight text-on-surface">{question.question}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10">
                    <div className="flex items-center gap-2 mb-4 text-primary">
                        <iconify-icon icon="lucide:graduation-cap" width="16"  ></iconify-icon>
                        <span className="text-[10px] font-black uppercase tracking-widest">Spesifikasi Akademik</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border", tagColor)}>{question.taxonomy}</span>
                        <span className="px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border bg-on-surface/5 text-on-surface-variant border-transparent">{question.type === "Multiple Choice" ? "Pilihan Ganda" : "Essay"}</span>
                    </div>
                </div>

            </div>
        </div>
      </div>

      {question.type === "Multiple Choice" && question.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.options.map((opt, i) => (
            <div key={i} className={cn("p-6 rounded-[32px] border-2 flex items-center gap-6 transition-all", opt.isCorrect ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-white/40 border-white/60")}>
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-sm", opt.isCorrect ? "bg-white/20 text-white" : "bg-on-surface/5 text-on-surface-variant/60")}>{opt.label}</div>
                <span className={cn("text-lg font-bold transition-all", opt.isCorrect ? "text-white" : "text-on-surface")}>{opt.text}</span>
                {opt.isCorrect && <iconify-icon icon="lucide:check" width="20"  className="ml-auto text-white"  ></iconify-icon>}
            </div>
            ))}
        </div>
      )}
      {question.type === "Essay" && (
          <div className="p-8 bg-on-surface/5 rounded-[40px] border-2 border-dashed border-white/60 text-on-surface-variant font-medium text-lg leading-relaxed text-center italic">
              [ Tipe Essay - Siswa akan menjawab secara deskriptif ]
          </div>
      )}
    </motion.div>
  );
}
