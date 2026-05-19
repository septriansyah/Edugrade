import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Dna, FileQuestion, FileText, Save, Zap, Send, Info, Bell, Loader2, ArrowLeft, ArrowRight, Check, MessageSquare, ShieldCheck, User, Plus, GraduationCap } from "lucide-react";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, OperationType, handleFirestoreError } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function AssignmentDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const [digitalAnswer, setDigitalAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [viewMode, setViewMode] = useState<"standard" | "form" | "paper">("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [userRole, setUserRole] = useState<"teacher" | "student">("student");
  const [assignment, setAssignment] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState("pending");
  const [isAIGrading, setIsAIGrading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    score: number;
    feedback: string;
    analysis: { contentScore: number; structureScore: number; relevanceScore: number };
  } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (retryCountdown !== null && retryCountdown > 0) {
      timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
    } else if (retryCountdown === 0) {
      setRetryCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  useEffect(() => {
    const fetchUserRoleAndSubmission = async () => {
      const user = auth.currentUser;
      if (user && id) {
        try {
          // Fetch role
          const userDoc = await getDoc(doc(db, "users", user.uid));
          let role: "teacher" | "student" = "student";
          if (userDoc.exists()) {
            role = userDoc.data().role as "teacher" | "student";
            setUserRole(role);
          }

          // Fetch assignment first to get teacher context if needed
          const assignSnap = await getDoc(doc(db, "assignments", id));
          let fetchedAssignment: any = null;
          if (assignSnap.exists()) {
            fetchedAssignment = assignSnap.data();
            setAssignment(fetchedAssignment);
          }

          // Fetch submission
          const studentId = (role === "teacher" && studentIdParam) ? studentIdParam : user.uid;
          
          if (role === "teacher" && studentIdParam) {
            const studentSnap = await getDoc(doc(db, "users", studentIdParam));
            if (studentSnap.exists()) {
              setStudentData(studentSnap.data());
            }
          }

          const submissionId = `${id}_${studentId}`;
          const subRef = doc(db, "submissions", submissionId);
          const subSnap = await getDoc(subRef);
          
          if (subSnap.exists()) {
            const data = subSnap.data();
            setDigitalAnswer(data.digitalAnswer || "");
            setSelectedOption(data.selectedOption || null);
            setTeacherFeedback(data.teacherFeedback || "");
            if (data.answers) setAnswers(data.answers);
            setSubmissionStatus(data.status || "pending");
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    fetchUserRoleAndSubmission();
  }, [id]);

  const handleSelectOption = (letter: string) => {
    if (userRole === "teacher") return; // Teachers don't answer
    setSelectedOption(letter);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0 && !digitalAnswer && !selectedOption) {
      alert("Harap berikan jawaban sebelum mengumpulkan.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !id) return;

    setIsSubmitting(true);
    const submissionId = `${id}_${user.uid}`;
    const path = `submissions/${submissionId}`;
    try {
        await setDoc(doc(db, "submissions", submissionId), {
            assignmentId: id,
            studentId: user.uid,
            digitalAnswer,
            selectedOption,
            answers,
            status: "submitted",
            updatedAt: serverTimestamp()
        }, { merge: true });
        alert("Tugas berhasil dikumpulkan!");
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!teacherFeedback.trim()) {
        alert("Pesan feedback tidak boleh kosong.");
        return;
    }
    const user = auth.currentUser;
    if (!user || !id) return;

    setIsSavingFeedback(true);
    const studentId = studentIdParam;
    if (!studentId) {
        alert("ID Siswa tidak ditemukan. Tidak dapat menyimpan feedback.");
        setIsSavingFeedback(false);
        return;
    }
    const submissionId = `${id}_${studentId}`;
    const path = `submissions/${submissionId}`;
    try {
        await updateDoc(doc(db, "submissions", submissionId), {
            teacherFeedback,
            status: "graded",
            updatedAt: serverTimestamp()
        });
        alert("Feedback berhasil disimpan dan akan terlihat oleh siswa.");
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
        setIsSavingFeedback(false);
    }
  };

  const handleFinalizeScore = async () => {
    const studentId = studentIdParam;
    if (!studentId || !id || !assignment) return;
    
    setIsSavingFeedback(true);
    const submissionId = `${id}_${studentId}`;
    
    // Calculate MC score
    let correctCount = 0;
    let totalMc = 0;
    assignment.questions?.forEach((q: any, index: number) => {
        if (q.type === "Multiple Choice") {
            totalMc++;
            const correctOpt = q.options?.find((o: any) => o.isCorrect)?.label;
            if (answers[index] === correctOpt) correctCount++;
        }
    });
    
    const mcScore = totalMc > 0 ? Math.round((correctCount / totalMc) * 100) : 0;
    
    try {
        await updateDoc(doc(db, "submissions", submissionId), {
            status: "graded",
            mcScore,
            updatedAt: serverTimestamp()
        });
        setSubmissionStatus("graded");
        alert(`Nilai berhasil difinalisasi! Skor Pilihan Ganda: ${correctCount}/${totalMc} (${mcScore})`);
    } catch (error) {
        console.error(error);
        alert("Gagal memfinalisasi nilai.");
    } finally {
        setIsSavingFeedback(false);
    }
  };

  const handleAIGrade = async () => {
    if (!digitalAnswer.trim()) {
        alert("Siswa belum memberikan jawaban esai untuk dinilai.");
        return;
    }

    setIsAIGrading(true);
    try {
        const response = await fetch("/api/grade-essay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: assignment?.title || "Soal Esai",
                studentAnswer: digitalAnswer
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.retryAfter) {
                setRetryCountdown(errorData.retryAfter);
            }
            throw new Error(errorData.error || "Grading failed");
        }
        const data = await response.json();
        setAiAnalysis(data);
        // Pre-fill teacher feedback with AI feedback for easy overriding
        const aiPart = `\n\n--- PENILAIAN AI ---\nSkor: ${data.score}/100\nUmpan balik: ${data.feedback}`;
        setTeacherFeedback(prev => prev ? prev + aiPart : data.feedback);
    } catch (error) {
        console.error(error);
        alert("Gagal melakukan penilaian AI. Silakan coba lagi.");
    } finally {
        setIsAIGrading(false);
    }
  };

  if (viewMode === "form") {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-12 lg:p-20 flex flex-col items-center">
         <div className="w-full max-w-4xl space-y-12 pb-32">
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-8 rounded-[40px] border border-white sticky top-10 z-50">
               <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode("standard")} className="p-3 hover:bg-on-surface/5 rounded-2xl transition-all">
                     <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">{assignment?.title || "Ujian Unit 4"}</h1>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Mode Form Digital • Fokus Penuh</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-xs font-black text-on-surface-variant/40 uppercase mb-1">Sisa Waktu</p>
                  <p className="text-xl font-black text-error tabular-nums tracking-widest">01:45:20</p>
               </div>
            </div>

            <div className="space-y-10">
               {[1,2,3].map(i => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass p-12 rounded-[56px] border-white/60 shadow-xl"
                  >
                     <div className="flex justify-between items-center mb-8">
                        <span className="px-6 py-2 bg-on-surface text-surface rounded-full text-xs font-black uppercase tracking-widest">Soal {i}</span>
                        <span className="text-xs font-black text-on-surface-variant/20 uppercase tracking-widest">Pilihan Ganda • 5 poin</span>
                     </div>
                     <p className="text-2xl font-bold mb-10 leading-relaxed">
                        Apa fungsi utama mitokondria pada sel eukariotik, dan bagaimana kaitannya dengan produksi ATP?
                     </p>
                     <div className="space-y-4">
                        {['A', 'B', 'C', 'D'].map(opt => (
                           <button 
                             key={opt}
                             onClick={() => setSelectedOption(opt)}
                             className={cn(
                               "w-full text-left p-6 rounded-[28px] border-2 transition-all flex items-center gap-6",
                               selectedOption === opt ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" : "bg-white/40 border-white/60 hover:border-primary/20"
                             )}
                           >
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-xs", selectedOption === opt ? "bg-white text-primary" : "bg-on-surface/5 text-on-surface-variant")}>
                                 {opt}
                              </div>
                              <span className="font-bold">Contoh teks opsi untuk pilihan {opt} pada soal.</span>
                           </button>
                        ))}
                     </div>
                  </motion.div>
               ))}
               
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 className="glass p-12 rounded-[56px] border-white/60 shadow-xl"
               >
                  <p className="text-xl font-bold mb-6">Esai: Jelaskan proses sintesis protein secara rinci.</p>
                  <textarea 
                    className="w-full h-40 p-5 bg-white/40 border-2 border-white/40 focus:border-primary outline-none rounded-2xl font-medium text-base leading-relaxed transition-all shadow-inner"
                    placeholder="Tuliskan jawaban lengkap Anda di sini..."
                    value={digitalAnswer}
                    onChange={(e) => setDigitalAnswer(e.target.value)}
                  />
               </motion.div>
            </div>

            <div className="flex flex-col items-center gap-6 pt-12">
               <div className="w-1/2 h-4 bg-on-surface/5 rounded-full overflow-hidden border border-white">
                  <div className="h-full w-[80%] bg-primary rounded-full" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">80% Selesai</p>
               
               <button 
                onClick={handleSubmit}
                className="bg-primary text-white px-8 py-4 w-full sm:w-auto rounded-xl font-black text-base uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
               >
                  Kumpulkan Jawaban Akhir
               </button>
            </div>
         </div>
      </div>
    );
  }

  if (viewMode === "paper") {
    return (
      <div className="min-h-screen bg-on-surface-variant/5 p-12 print:bg-white print:p-0">
         <div className="max-w-4xl mx-auto bg-white p-20 shadow-2xl rounded-[40px] border border-on-surface/5 print:shadow-none print:border-none print:rounded-none">
            <div className="flex justify-between items-start border-b-2 border-on-surface pb-12 mb-16">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-on-surface text-surface rounded-2xl flex items-center justify-center">
                     <GraduationCap size={32} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Akademi Edugrade</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Repositori Penilaian Resmi</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-widest">
                  <div className="border-b border-on-surface/20 pb-1">Nama: ___________________</div>
                  <div className="border-b border-on-surface/20 pb-1">Kelas: XII-A</div>
                  <div className="border-b border-on-surface/20 pb-1">Tanggal: {new Date().toLocaleDateString()}</div>
                  <div className="border-b border-on-surface/20 pb-1">Nilai: _____ / 100</div>
               </div>
            </div>

            <div className="space-y-12 mb-20 text-on-surface">
               <div>
                  <h2 className="text-xl font-black mb-4">Unit 4: Biologi Sintetis & Rekayasa Protein</h2>
                  <p className="italic text-sm text-on-surface-variant/60">Petunjuk: Bacalah setiap soal dengan cermat. Untuk pilihan ganda, lingkari jawaban yang benar. Untuk esai, tulis jawaban dengan jelas pada ruang yang tersedia.</p>
               </div>

               {[1,2,3].map(i => (
                  <div key={i} className="space-y-6">
                     <p className="font-bold text-lg"><span className="mr-4">S{i}.</span> Jelaskan fungsi asam amino dalam pembentukan protein.</p>
                     <div className="grid grid-cols-1 gap-3 pl-10">
                        {['A', 'B', 'C', 'D'].map(opt => (
                           <div key={opt} className="flex gap-4 items-center">
                              <div className="w-6 h-6 border-2 border-on-surface rounded-full flex items-center justify-center text-[10px] font-black">{opt}</div>
                              <span className="text-sm font-medium">Contoh isi opsi untuk modul penilaian {opt}.</span>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}

               <div className="space-y-6">
                  <p className="font-bold text-lg"><span className="mr-4">S4.</span> Esai: Bandingkan replikasi DNA dan transkripsi.</p>
                  <div className="w-full h-80 border-2 border-on-surface/10 rounded-2xl" />
               </div>
            </div>

            <div className="flex justify-center gap-6 print:hidden">
               <button onClick={() => window.print()} className="bg-on-surface text-surface px-8 py-4 rounded-2xl font-bold flex items-center gap-2">
                  <Plus size={20} />
                  Cetak Sekarang
               </button>
               <button onClick={() => setViewMode("standard")} className="px-8 py-4 bg-on-surface/5 rounded-2xl font-bold">Kembali ke Pratinjau</button>
            </div>
         </div>
      </div>
    )
  }

  const currentQuestion = assignment?.questions?.[currentQuestionIndex];

  return (
    <Layout userType={userRole}>
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12 pb-32">
        {/* Breadcrumb & Navigation */}
        <div className="flex justify-between items-center px-4">
           <Link to={userRole === "student" ? "/student/dashboard" : (assignment?.classId ? `/class/${assignment.classId}?tab=reviews` : "/dashboard")} className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest hover:translate-x-[-10px] transition-all">
              <ArrowLeft size={16} />
              Kembali ke {userRole === "student" ? "Dashboard" : "Kelas"}
           </Link>
           <div className="flex gap-4">
              {userRole === "student" && (
                <div className="flex bg-on-surface/5 p-1 rounded-2xl border border-on-surface/5 overflow-hidden">
                   <button onClick={() => setViewMode("standard")} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === "standard" ? "bg-white shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface")}>Standar</button>
                   <button onClick={() => setViewMode("form")} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === "form" ? "bg-white shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface")}>Mode Form</button>
                   <button onClick={() => setViewMode("paper")} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === "paper" ? "bg-white shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface")}>Mode Kertas</button>
                </div>
              )}
           </div>
        </div>

        {/* Hero Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                 <Dna className="text-primary" size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-1">Biologi Dasar • Kelas 12-A</span>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-0 tracking-tighter text-on-surface leading-tight md:leading-none break-words max-w-2xl">{assignment?.title || "Sintesis Protein"}</h1>
              </div>
            </div>
            {userRole === "teacher" && (
                <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-secondary/10 w-fit rounded-xl border border-secondary/20">
                    <User size={14} className="text-secondary" />
                    <span className="text-xs font-bold text-secondary">
                        {studentIdParam ? `Menilai Tugas: ${studentData?.displayName || "Memuat..."}` : "Mode Pratinjau (Sebagai Pengajar)"}
                    </span>
                </div>
            )}
          </motion.div>
          
          <div className="glass p-6 md:p-8 rounded-[40px] border-white/60 shadow-xl shadow-on-surface/5 flex items-center gap-6 md:gap-8 w-full lg:w-auto min-w-0 md:min-w-[320px]">
             <div className="flex-1">
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Tenggat Waktu</p>
                <p className="text-xl md:text-2xl font-black text-primary tracking-tighter">
                  {assignment?.dueDate?.toDate?.() 
                    ? assignment.dueDate.toDate().toLocaleString() 
                    : assignment?.dueDate 
                      ? new Date(assignment.dueDate).toLocaleString() 
                      : "Tanpa tenggat"}
                </p>
             </div>
             <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <Clock className="text-primary" size={24} />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Question Area */}
          <div className="lg:col-span-8 flex flex-col gap-8 md:gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[40px] md:rounded-[56px] p-8 md:p-12 border-white/60 shadow-2xl relative overflow-hidden min-h-[500px] lg:h-[calc(100vh-320px)] flex flex-col"
            >
              {assignment?.method === 'manual' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                   <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="text-primary" size={48} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black mb-4">Tugas Manual / File</h3>
                      <p className="text-on-surface-variant max-w-md mx-auto">Silakan unduh file di bawah ini dan kumpulkan jawaban Anda dalam bentuk teks.</p>
                   </div>
                   {assignment.fileUrl && (
                     <a 
                       href={assignment.fileUrl} 
                       target="_blank" 
                       rel="noreferrer"
                       className="bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all text-center"
                     >
                       <FileText size={24} />
                       Unduh File Soal
                     </a>
                   )}
                   {!assignment.fileUrl && (
                     <div className="p-8 bg-on-surface/5 rounded-[32px] border border-dashed border-outline-variant/40 max-w-md">
                        <p className="text-sm font-medium text-on-surface-variant italic">"{assignment.description || "Gunakan deskripsi tugas sebagai panduan pengerjaan."}"</p>
                     </div>
                   )}
                </div>
              ) : (
                <>
                  <div className="mb-8 md:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black shrink-0">{currentQuestionIndex + 1}</div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight">{currentQuestion?.taxonomy || "Pertanyaan"}</h3>
                     </div>
                     <div className="flex gap-2">
                        <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{currentQuestion?.type === "Multiple Choice" ? "Pilihan Ganda" : currentQuestion?.type === "Essay" ? "Esai" : "Umum"}</span>
                        <span className="glass border-white/40 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-on-surface-variant/40">10 Poin</span>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 md:pr-6 custom-scrollbar pb-10">
                    <p className="text-xl md:text-3xl font-bold mb-8 md:mb-12 leading-snug tracking-tight text-on-surface">
                      {currentQuestion?.question || "Memuat butir soal..."}
                    </p>

                    {currentQuestion?.type === "Multiple Choice" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options?.map((opt: any) => {
                          const isStudentAnswer = (answers[currentQuestionIndex] || selectedOption) === opt.label;
                          const showFeedback = userRole === "teacher" || submissionStatus === "graded";
                          const isCorrect = showFeedback && opt.isCorrect;
                          const isWrong = showFeedback && isStudentAnswer && !opt.isCorrect;
                          return (
                          <OptionItem 
                            key={opt.label} 
                            letter={opt.label} 
                            text={opt.text} 
                            isActive={isStudentAnswer} 
                            isCorrect={isCorrect}
                            isWrong={isWrong}
                            onClick={() => {
                              setAnswers(prev => ({ ...prev, [currentQuestionIndex]: opt.label }));
                              setSelectedOption(opt.label);
                            }} 
                          />
                          );
                        })}
                      </div>
                    ) : (
                       <textarea 
                         className="w-full h-32 p-5 bg-white/40 border-2 border-white/40 focus:border-primary outline-none rounded-2xl font-medium text-base leading-relaxed shadow-inner"
                         placeholder="Tuliskan jawaban Anda di sini..."
                         value={answers[currentQuestionIndex] || digitalAnswer}
                         onChange={(e) => {
                           setAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }));
                           setDigitalAnswer(e.target.value);
                         }}
                       />
                    )}
                  </div>

                  <div className="mt-auto pt-6 md:pt-10 border-t border-white/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                     <button 
                       onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                       disabled={currentQuestionIndex === 0}
                       className="hidden sm:flex items-center gap-2 text-sm font-black text-on-surface-variant uppercase tracking-widest disabled:opacity-20 transition-all"
                     >
                       Sebelumnya
                     </button>
                     <div className="flex gap-2">
                        {assignment?.questions?.map((_: any, i: number) => (
                            <div key={i} className={cn("w-2 h-2 rounded-full transition-all", i === currentQuestionIndex ? "bg-primary scale-125" : "bg-outline-variant/30")} />
                        ))}
                     </div>
                     <button 
                       onClick={() => setCurrentQuestionIndex(prev => Math.min((assignment?.questions?.length || 1) - 1, prev + 1))}
                       disabled={!assignment?.questions || currentQuestionIndex === assignment.questions.length - 1}
                       className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-black text-primary uppercase tracking-widest bg-primary/5 p-4 sm:p-0 rounded-2xl disabled:opacity-20 transition-all"
                     >
                        Soal Berikutnya
                        <ArrowRight size={16} />
                     </button>
                  </div>
                </>
              )}
            </motion.div>

            {/* Feedback Section (Visible to both but editable by Teacher) */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className={cn(
                   "glass rounded-[48px] p-10 border-white/60 shadow-xl overflow-hidden relative",
                   userRole === "teacher" ? "bg-secondary/5" : "bg-primary/5"
               )}
            >
               <div className="flex justify-between items-center mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                     <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", userRole === "teacher" ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary")}>
                        <MessageSquare size={20} />
                     </div>
                     <h4 className="text-xl font-black tracking-tight">Feedback Pengajar</h4>
                  </div>
                  {userRole === "teacher" && (
                    <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] px-4 py-1.5 bg-secondary/10 rounded-full border border-secondary/20">Mode Pengajar</span>
                  )}
               </div>

               {userRole === "teacher" ? (
                  <div className="space-y-6 relative z-10">
                    {!studentIdParam ? (
                        <div className="p-8 bg-on-surface/5 rounded-[32px] border-2 border-dashed border-outline-variant/20 flex flex-col items-center text-center">
                            <Info className="text-on-surface-variant/40 mb-4" size={32} />
                            <p className="text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
                                Pilih siswa dari menu Review untuk memberikan nilai dan feedback.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-4 mb-4">
                                <button 
                                    onClick={handleAIGrade}
                                    disabled={isAIGrading || retryCountdown !== null}
                                    className="bg-primary/10 text-primary border border-primary/20 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all disabled:opacity-50"
                                >
                                    {isAIGrading ? <Loader2 className="animate-spin" size={14} /> : (retryCountdown !== null ? <span className="text-secondary">{retryCountdown}s</span> : <Zap size={14} fill="currentColor" />)}
                                    {isAIGrading ? "Menilai otomatis..." : (retryCountdown !== null ? "Harap Tunggu" : "Nilai Otomatis dengan AI")}
                                </button>
                            </div>
    
                            {aiAnalysis && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="bg-primary/5 border border-primary/10 p-6 rounded-[32px] space-y-4 mb-6"
                                >
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-sm font-black text-primary uppercase tracking-widest">Hasil Analisis AI</h5>
                                        <span className="text-2xl font-black text-primary">{aiAnalysis.score}/100</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-1">Konten</p>
                                            <p className="text-sm font-bold text-on-surface">{aiAnalysis.analysis.contentScore}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-1">Struktur</p>
                                            <p className="text-sm font-bold text-on-surface">{aiAnalysis.analysis.structureScore}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-1">Relevansi</p>
                                            <p className="text-sm font-bold text-on-surface">{aiAnalysis.analysis.relevanceScore}%</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
    
                            <textarea 
                                className="w-full h-32 p-6 bg-white/40 border-2 border-white/40 focus:border-secondary outline-none rounded-[28px] font-medium text-lg leading-relaxed placeholder:text-on-surface-variant/20 transition-all shadow-inner"
                                placeholder="Berikan masukan konstruktif untuk tugas ini..."
                                value={teacherFeedback}
                                onChange={(e) => setTeacherFeedback(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleSaveFeedback}
                                    disabled={isSavingFeedback}
                                    className="bg-secondary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20 disabled:opacity-50"
                                >
                                    {isSavingFeedback ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isSavingFeedback ? "Menyimpan..." : "Simpan Feedback"}
                                </button>
                            </div>
                        </>
                    )}
                  </div>
               ) : (
                  <div className="relative z-10">
                    {teacherFeedback ? (
                        <div className="bg-white/40 p-8 rounded-[32px] border-2 border-primary/10">
                            <p className="text-lg font-medium text-on-surface leading-relaxed italic">"{teacherFeedback}"</p>
                        </div>
                    ) : (
                        <div className="bg-on-surface/5 p-8 rounded-[32px] border-2 border-dashed border-on-surface/10 flex items-center gap-4">
                            <Info size={20} className="text-on-surface-variant/40" />
                            <p className="text-sm font-bold text-on-surface-variant/40 uppercase tracking-widest">Belum ada feedback dari pengajar.</p>
                        </div>
                    )}
                  </div>
               )}
               <div className={cn("absolute -bottom-12 -right-12 w-48 h-48 opacity-10", userRole === "teacher" ? "text-secondary" : "text-primary")}>
                  <MessageSquare size={192} />
               </div>
            </motion.div>
          </div>

          {/* Submission Panel */}
          <div className="lg:col-span-4 space-y-8 h-full flex flex-col">
            <div className="glass p-10 rounded-[48px] border-white/60 shadow-xl flex flex-col">
               <div className="flex justify-between items-center mb-10">
                  <h4 className="text-xl font-black tracking-tight">{userRole === "teacher" ? "Jawaban Siswa" : "Input Digital"}</h4>
                  <FileText className="text-primary/20" size={24} />
               </div>
               <textarea 
                className={cn(
                    "w-full h-28 p-5 bg-white/40 border-2 border-white/40 focus:border-primary outline-none rounded-2xl font-medium text-sm leading-relaxed placeholder:text-on-surface-variant/20 transition-all mb-8 shadow-inner",
                    userRole === "teacher" && "cursor-not-allowed opacity-80"
                )}
                placeholder={userRole === "teacher" ? "Siswa belum menuliskan jawaban digital." : "Tuliskan catatan atau jawaban esai tambahan..."}
                value={digitalAnswer}
                onChange={(e) => setDigitalAnswer(e.target.value)}
                readOnly={userRole === "teacher"}
              />
              {userRole === "student" && (
                <button 
                  className="btn-glass-primary w-full py-5 rounded-[24px] font-black tracking-widest text-xs uppercase"
                >
                    Simpan Progres
                </button>
              )}
              {userRole === "teacher" && (
                <div className="flex items-center gap-3 px-6 py-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <ShieldCheck className="text-primary" size={18} />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-tight">Jawaban ini telah diverifikasi oleh pemeriksaan integritas AI</span>
                </div>
              )}
            </div>

            {userRole === "student" && (
              <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={cn(
                      "mt-auto w-full glass-submit py-4 rounded-xl font-black text-lg tracking-tight flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl",
                      isSubmitting && "opacity-50 cursor-wait"
                  )}
              >
                  {isSubmitting ? (
                      <>
                          <Loader2 className="animate-spin" size={24} />
                          Mengirim...
                      </>
                  ) : (
                      <>
                          Kumpulkan
                          <Send size={24} />
                      </>
                  )}
              </button>
            )}

            {userRole === "teacher" && (
                <div className="glass p-10 rounded-[48px] border-white/60 shadow-xl bg-secondary/5 mt-auto">
                    <h4 className="text-xl font-black tracking-tight mb-4">Ringkasan Penilaian</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-white/20">
                            <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Pilihan Ganda</span>
                            <span className="font-black text-primary">10/10</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/20">
                            <span className="text-xs font-bold text-on-surface-variant/40 uppercase">Esai</span>
                            <span className="font-black text-on-surface">Menunggu</span>
                        </div>
                        <button 
                            onClick={handleFinalizeScore}
                            disabled={isSavingFeedback}
                            className={cn(
                                "w-full bg-secondary text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest mt-4 transition-all flex items-center justify-center gap-2",
                                isSavingFeedback ? "opacity-50 cursor-wait" : "hover:scale-105 active:scale-95"
                            )}
                        >
                            {isSavingFeedback ? <Loader2 className="animate-spin" size={16} /> : null}
                            Finalisasi Nilai
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const OptionItem: React.FC<{ letter: string, text: string, isActive?: boolean, isCorrect?: boolean, isWrong?: boolean, onClick?: () => void }> = ({ letter, text, isActive, isCorrect, isWrong, onClick }) => {
    return (
        <motion.div 
            whileHover={{ x: 5 }}
            onClick={onClick}
            className={cn(
                "p-3 md:p-4 rounded-xl border-2 flex items-center gap-3 transition-all cursor-pointer group min-h-[60px]",
                isActive && !isCorrect && !isWrong ? "bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]" : "",
                isCorrect ? "bg-green-500 border-green-500 shadow-xl shadow-green-500/20 scale-[1.02]" : "",
                isWrong ? "bg-red-500 border-red-500 shadow-xl shadow-red-500/20 scale-[1.02]" : "",
                !isActive && !isCorrect && !isWrong ? "glass border-white/60 hover:border-primary/40 hover:bg-white/60" : ""
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shrink-0",
                (isActive || isCorrect || isWrong) ? "bg-white" : "bg-white/40 text-on-surface-variant border border-white/60",
                isCorrect ? "text-green-600" : "",
                isWrong ? "text-red-600" : "",
                isActive && !isCorrect && !isWrong ? "text-primary" : ""
            )}>
                {isCorrect ? <Check size={14} strokeWidth={4} /> : 
                 isWrong ? <span className="text-red-600">X</span> :
                 isActive ? <Check size={14} strokeWidth={4} /> : letter}
            </div>
            <span className={cn(
                "text-xs md:text-sm font-bold transition-all line-clamp-2 md:line-clamp-none",
                (isActive || isCorrect || isWrong) ? "text-white" : "text-on-surface-variant group-hover:text-on-surface"
            )}>
                {text}
            </span>
        </motion.div>
    );
};

function Clock({ className, size }: { className?: string, size?: number }) {
    const finalSize = size || 24;
    return (
        <svg className={className} width={finalSize} height={finalSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
