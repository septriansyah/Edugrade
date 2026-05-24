import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wand2, 
  Eye, 
  Sparkles, 
  Zap, 
  MoreVertical,
  Search,
  Loader2,
  FileText,
  X,
  Save,
  ArrowLeft
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import * as analysisUtils from "@/src/lib/itemAnalysis";

export default function ItemAnalysisPG() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState<number | null>(null);
  const [refinedQuestion, setRefinedQuestion] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [userProfile, setUserProfile] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"analysis" | "anates">("analysis");
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [isSavingManual, setIsSavingManual] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [id]);

  const pgQuestions = useMemo(() => {
    return assignment?.questions?.map((q: any, idx: number) => ({ ...q, originalIndex: idx }))
      .filter((q: any) => q.type === "Multiple Choice") || [];
  }, [assignment]);

  const fetchData = async () => {
    if (!id || !auth.currentUser) return;
    setIsLoading(true);
    try {
      const assignmentDoc = await getDoc(doc(db, "assignments", id));
      let fetchedAssignment: any = null;
      if (assignmentDoc.exists()) {
        fetchedAssignment = { id: assignmentDoc.id, ...assignmentDoc.data() };
        setAssignment(fetchedAssignment);
      }

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
          setUserProfile(userDoc.data());
      }

      const subsQuery = query(collection(db, "submissions"), where("assignmentId", "==", id));
      const subsSnap = await getDocs(subsQuery);
      const subsData = subsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const studentIds = [...new Set(subsData.map((s: any) => s.studentId))];
      const usersMap: Record<string, any> = {};
      
      if (studentIds.length > 0) {
          const userPromises = studentIds.map(sid => getDoc(doc(db, "users", sid)));
          const userDocs = await Promise.all(userPromises);
          userDocs.forEach(d => {
              if (d.exists()) {
                  usersMap[d.id] = d.data();
              }
          });
      }

      const submissionsWithUser = subsData.map((sub: any) => ({
          ...sub,
          studentName: sub.studentName || usersMap[sub.studentId]?.displayName || usersMap[sub.studentId]?.email || sub.studentId.substring(0, 8),
          studentPhoto: usersMap[sub.studentId]?.photoURL
      }));

      setSubmissions(submissionsWithUser);

      // Populate manualRows
      if (subsData.length > 0) {
          const rows = subsData.map((sub: any) => {
              const rowAnswers: Record<number, any> = {};
              fetchedAssignment?.questions?.forEach((q: any, idx: number) => {
                  const ans = sub.answers?.[idx];
                  if (q.type === "Multiple Choice") {
                      rowAnswers[idx] = typeof ans === 'string' ? ans : (ans?.label || "");
                  }
              });
              return {
                  id: sub.studentId,
                  name: sub.studentName || usersMap[sub.studentId]?.displayName || usersMap[sub.studentId]?.email || sub.studentId.substring(0, 8),
                  answers: rowAnswers
              };
          });
          setManualRows(rows);
      } else {
          setManualRows([
              { id: "manual_1", name: "Siswa 1", answers: {} },
              { id: "manual_2", name: "Siswa 2", answers: {} },
              { id: "manual_3", name: "Siswa 3", answers: {} }
          ]);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualRow = () => {
    const newId = `manual_${Math.random().toString(36).substr(2, 9)}`;
    setManualRows(prev => [...prev, { id: newId, name: `Siswa ${prev.length + 1}`, answers: {} }]);
  };

  const handleRemoveManualRow = (rowId: string) => {
    setManualRows(prev => prev.filter(r => r.id !== rowId));
    if (!rowId.startsWith("manual_")) {
      setDeletedRowIds(prev => [...prev, rowId]);
    }
  };

  const handleCellChange = (rowId: string, qIdx: number, value: string | number) => {
    setManualRows(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          answers: {
            ...r.answers,
            [qIdx]: value
          }
        };
      }
      return r;
    }));
  };

  const handleSaveManual = async () => {
    if (!id || !assignment) return;
    setIsSavingManual(true);
    try {
      const questions = assignment.questions || [];
      
      // 1. Delete rows marked for deletion
      for (const delId of deletedRowIds) {
        if (!delId.startsWith("manual_")) {
          const submissionId = `${id}_${delId}`;
          await deleteDoc(doc(db, "submissions", submissionId));
        }
      }
      setDeletedRowIds([]);

      // 2. Save active rows
      for (const row of manualRows) {
        if (!row.name.trim()) continue;
        
        const studentId = row.id;
        const submissionId = `${id}_${studentId}`;
        
        let mcCorrect = 0;
        let mcTotal = 0;
        let essayScoreSum = 0;
        let essayTotal = 0;
        
        // Load existing answers to merge non-PG answers safely
        const subDoc = await getDoc(doc(db, "submissions", submissionId));
        const existingAnswers = subDoc.exists() ? (subDoc.data()?.answers || {}) : {};
        const rowAnswers = { ...existingAnswers };
        
        questions.forEach((q: any, idx: number) => {
          if (q.type === "Multiple Choice") {
            mcTotal++;
            const correctOptionLabel = q.options?.find((opt: any) => opt.isCorrect)?.label;
            const val = row.answers[idx];
            const letter = (val || "").toString().toUpperCase();
            rowAnswers[idx] = {
              label: letter,
              isCorrect: letter === correctOptionLabel
            };
            if (letter === correctOptionLabel) {
              mcCorrect++;
            }
          } else {
            essayTotal++;
            const existingEssay = existingAnswers[idx];
            const scoreNum = existingEssay?.score !== undefined ? existingEssay.score : 0;
            essayScoreSum += scoreNum;
          }
        });
        
        const calculatedMcScore = mcTotal > 0 ? (mcCorrect / mcTotal) * 100 : 0;
        const calculatedEssayScore = essayTotal > 0 ? (essayScoreSum / essayTotal) : 0;
        
        let calculatedTotalScore = 0;
        if (mcTotal > 0 && essayTotal > 0) {
          calculatedTotalScore = (calculatedMcScore + calculatedEssayScore) / 2;
        } else if (mcTotal > 0) {
          calculatedTotalScore = calculatedMcScore;
        } else {
          calculatedTotalScore = calculatedEssayScore;
        }
        
        const subRef = doc(db, "submissions", submissionId);
        await setDoc(subRef, {
          assignmentId: id,
          studentId: studentId,
          studentName: row.name,
          answers: rowAnswers,
          mcScore: Math.round(calculatedMcScore),
          totalScore: Math.round(calculatedTotalScore),
          status: "graded",
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      alert("Matriks jawaban PG berhasil disimpan!");
      await fetchData();
      setActiveTab("analysis");
    } catch (error) {
      console.error("Error saving manual submissions:", error);
      alert("Gagal menyimpan data: " + error);
    } finally {
      setIsSavingManual(false);
    }
  };

  const analytics = useMemo(() => {
    if (!assignment || !submissions.length || pgQuestions.length === 0) return null;

    const totalStudents = submissions.length;
    const mcScoresList = submissions.map(s => s.mcScore !== undefined ? s.mcScore : (s.totalScore || 0));
    const mean = totalStudents > 0 ? (mcScoresList.reduce((a, b) => a + b, 0) / totalStudents) : 0;
    const completionRate = totalStudents > 0 ? ((mcScoresList.filter(s => s >= 70).length / totalStudents) * 100) : 0;
    const maxScore = mcScoresList.length > 0 ? Math.max(...mcScoresList) : 0;
    const minScore = mcScoresList.length > 0 ? Math.min(...mcScoresList) : 0;
    const stdDev = analysisUtils.calculateStandardDeviation(mcScoresList);

    const itemResults = pgQuestions.map((q: any) => {
      const qIdx = q.originalIndex;
      const answers = submissions.map(s => s.answers?.[qIdx]);
      
      const correctOptionLabel = q.options?.find((opt: any) => opt.isCorrect)?.label;
      const isAnsCorrect = (a: any) => typeof a === 'string' ? a === correctOptionLabel : a?.isCorrect;
      
      const correctAnswers = answers.filter(a => isAnsCorrect(a)).length;
      const tk = analysisUtils.calculateTK(correctAnswers, totalStudents);
      
      // Sorting for DP calculation
      const sortedSubs = [...submissions].sort((a, b) => {
          const scoreA = a.mcScore !== undefined ? a.mcScore : (a.totalScore || 0);
          const scoreB = b.mcScore !== undefined ? b.mcScore : (b.totalScore || 0);
          return scoreB - scoreA;
      });
      const groupSize = Math.floor(totalStudents * 0.27) || 1;
      const upperGroup = sortedSubs.slice(0, groupSize);
      const lowerGroup = sortedSubs.slice(-groupSize);
      
      const upperCorrect = upperGroup.filter(s => isAnsCorrect(s.answers?.[qIdx])).length;
      const lowerCorrect = lowerGroup.filter(s => isAnsCorrect(s.answers?.[qIdx])).length;
      const dp = analysisUtils.calculateDP(upperCorrect, lowerCorrect, groupSize);

      const distractors: { [key: string]: number } = {};
      answers.forEach(a => {
          let label = typeof a === 'string' ? a : a?.label;
          if (label && !isAnsCorrect(a)) {
              distractors[label] = (distractors[label] || 0) + 1;
          }
      });

      let status: any = "Layak";
      let recommendation = "Soal berkualitas baik, pertahankan.";
      
      if (dp < 0.2) {
          status = "Buang";
          recommendation = "Daya beda terlalu rendah. Soal gagal membedakan siswa kelompok atas dan bawah.";
      } else if (dp < 0.3) {
          status = "Revisi";
          recommendation = "Daya beda cukup, namun perlu perbaikan pada distraktor atau redaksi soal.";
      } else if (tk < 0.2) {
          status = "Revisi";
          recommendation = "Soal terlalu sukar (TK < 0.2). Pertimbangkan untuk menyederhanakan bahasa atau konsep.";
      } else if (tk > 0.8) {
          status = "Revisi";
          recommendation = "Soal terlalu mudah (TK > 0.8). Ganti pengecoh dengan pilihan yang lebih menantang.";
      } else if (dp >= 0.4) {
          status = "Sangat Layak";
          recommendation = "Soal memiliki daya beda yang sangat baik dan tingkat kesulitan ideal.";
      }

      // Distractor analysis logic
      const nonFunctional = (q.options || []).filter((o: any) => 
          !o.isCorrect && (distractors[o.label] || 0) === 0
      ).map((o: any) => o.label);
      
      if (nonFunctional.length > 0 && status !== "Buang") {
          recommendation += ` Pengecoh (${nonFunctional.join(", ")}) tidak efektif karena tidak ada siswa yang memilih. Disarankan untuk menggantinya dengan pilihan yang lebih homogen atau masuk akal.`;
      }

      let validity = analysisUtils.calculatePearsonCorrelation(answers.map(a => isAnsCorrect(a) ? 100 : 0), mcScoresList);
      if (isNaN(validity)) validity = 0;

      return {
        questionIndex: qIdx,
        snippet: q.question,
        type: "Multiple Choice",
        originalQuestion: q,
        tk,
        dp,
        validity,
        distractors,
        status,
        recommendation
      };
    });

    // Reliability KR-20 for PG uses RAW scores variance, not 100-scale variance
    const rawScoresList = submissions.map(s => {
        let correct = 0;
        pgQuestions.forEach((q:any) => {
            const ans = s.answers?.[q.originalIndex || q.id];
            if (typeof ans === 'string' && ans === q.correctLabel) correct++;
            else if (ans?.isCorrect) correct++;
        });
        return correct;
    });
    const rawVar = analysisUtils.calculateVariance(rawScoresList);
    const pValues = itemResults.map((r: any) => r.tk || 0);
    const reliability = analysisUtils.calculateKR20(pgQuestions.length, pValues, rawVar) || 0;

    return {
      reliability: isNaN(reliability) ? 0 : reliability,
      mean: isNaN(mean) ? 0 : mean,
      maxScore,
      minScore,
      stdDev,
      completionRate: isNaN(completionRate) ? 0 : completionRate,
      items: itemResults
    };
  }, [assignment, submissions, pgQuestions]);

  const chartData = useMemo(() => {
    return analytics?.items?.map((item: any, idx: number) => ({
      name: `S${idx + 1}`,
      value: isNaN(item.tk) || item.tk === null || item.tk === undefined ? 0 : Math.round(item.tk * 100)
    })) || [];
  }, [analytics]);

  const handleExportTxt = () => {
    if (!analytics || !assignment || !submissions.length || pgQuestions.length === 0) return;
    
    const input: analysisUtils.PGReportInput = {
        assignmentTitle: assignment.title,
        questions: pgQuestions.map((q: any) => ({
            id: q.originalIndex,
            correctLabel: q.options?.find((opt: any) => opt.isCorrect)?.label || "A",
            labels: q.options?.map((opt: any) => opt.label) || ["A", "B", "C", "D", "E"]
        })),
        submissions: submissions.map((sub: any) => {
            const answers: Record<number, string> = {};
            pgQuestions.forEach((q: any) => {
                const ans = sub.answers?.[q.originalIndex];
                answers[q.originalIndex] = typeof ans === 'string' ? ans : (ans?.label || "-");
            });
            return {
                studentName: sub.studentName || sub.studentId.substring(0, 8),
                answers
            };
        })
    };

    const blob = analysisUtils.generatePGTextReport(input);
    const fileName = `ANABUTIRSOAL_PG_${assignment.title.replace(/\s+/g, '_').toUpperCase().substring(0, 20)}.txt`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  const handleAiFix = async (item: any) => {
    if (!userProfile?.isPremium) {
      if (confirm("Fitur AI Fix hanya tersedia untuk akun Premium Pro. Beralih ke Premium sekarang seharga Rp 500K?")) {
          window.location.href = "/pricing";
      }
      return;
    }
    
    setIsFixing(item.questionIndex);
    try {
      const response = await fetch("/api/refine-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: item.originalQuestion,
          analysis: {
            tk: item.tk,
            dp: item.dp,
            status: item.status
          },
          distractorData: item.distractors
        })
      });
      const data = await response.json();
      setRefinedQuestion({ index: item.questionIndex, ...data });
    } catch (error) {
      console.error("Refinement error:", error);
    } finally {
      setIsFixing(null);
    }
  };

  const applyFix = async () => {
    if (!refinedQuestion || !assignment) return;
    const newQuestions = [...assignment.questions];
    newQuestions[refinedQuestion.index] = {
        ...refinedQuestion,
        index: undefined // remove the helper index
    };

    try {
      await updateDoc(doc(db, "assignments", assignment.id), {
        questions: newQuestions
      });
      setAssignment({ ...assignment, questions: newQuestions });
      setRefinedQuestion(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "assignments");
    }
  };

  if (isLoading) {
    return (
      <Layout userType="teacher">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-bold text-on-surface-variant">Menghitung analisis data PG...</p>
        </div>
      </Layout>
    );
  }

  if (!assignment) {
    return (
      <Layout userType="teacher">
        <div className="p-12 text-center">
           <h2 className="text-2xl font-black">Assignment not found</h2>
           <Link to="/analytics" className="text-primary font-bold mt-4 block">Kembali ke Analisis</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Back Button & Header */}
        <div className="space-y-4">
          <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
            <ArrowLeft size={16} /> Kembali ke Daftar
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                   <BarChart3 className="text-primary" size={20} />
                </div>
                <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Analisis Soal PG</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tighter text-on-surface">Pilihan <span className="text-primary italic">Ganda</span></h1>
              <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
                Analisis validitas, daya beda, dan indeks distraktor soal PG untuk <span className="text-on-surface font-bold">{assignment.title}</span>.
              </p>
            </motion.div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                  onClick={handleExportTxt}
                  disabled={pgQuestions.length === 0}
                  className="flex-1 btn-glass px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all hover:scale-105 disabled:opacity-50"
              >
                <Download size={20} />
                Ekspor .TXT
              </button>
              <button 
                  onClick={fetchData}
                  className="flex-1 btn-glass-primary px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-primary/20 transition-all hover:scale-105"
              >
                <RefreshCw size={20} />
                Recalculate
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/20 pb-4">
          <button 
            onClick={() => setActiveTab("analysis")}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === "analysis" 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-on-surface-variant hover:bg-on-surface/5"
            )}
          >
            Analisis Otomatis
          </button>
          <button 
            onClick={() => setActiveTab("anates")}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === "anates" 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-on-surface-variant hover:bg-on-surface/5"
            )}
          >
            Input Manual (PG)
          </button>
        </div>

        {activeTab === "analysis" ? (
          pgQuestions.length === 0 ? (
            <div className="glass rounded-[48px] p-16 text-center max-w-2xl mx-auto space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={40} className="text-primary" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Tidak Ada Soal PG</h3>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                Tugas ini tidak memiliki pertanyaan Pilihan Ganda (PG).
              </p>
            </div>
          ) : !submissions.length ? (
            <div className="glass rounded-[48px] p-16 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 size={40} className="text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-2">Belum Ada Data Jawaban</h3>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                  Siswa belum mengumpulkan jawaban PG secara digital. Gunakan mode Input Manual untuk menginput opsi jawaban siswa dan menganalisis secara instan.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("anates")}
                className="btn-glass-primary px-8 py-4 rounded-2xl flex items-center gap-3 font-bold"
              >
                <Sparkles size={20} />
                Buka Mode Input Manual (Anates)
              </button>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <div className="col-span-2 md:col-span-4 lg:col-span-2">
                  <StatBox 
                    label="Reliabilitas Tes (KR-20)" 
                    value={analytics?.reliability.toFixed(2) || "0.00"} 
                    tag={analytics && analytics.reliability > 0.7 ? "Tinggi" : "Rendah"} 
                    tagColor={analytics && analytics.reliability > 0.7 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"} 
                  />
                </div>
                <div className="col-span-2 md:col-span-2 lg:col-span-2">
                  <StatBox 
                    label="Rata-rata Skor PG" 
                    value={`${Math.round(analytics?.mean || 0)}`} 
                    progress={isNaN(analytics?.mean) ? 0 : analytics?.mean} 
                  />
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-1">
                  <StatBox 
                    label="Tertinggi" 
                    value={`${Math.round(analytics?.maxScore || 0)}`} 
                  />
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-1">
                  <StatBox 
                    label="Terendah" 
                    value={`${Math.round(analytics?.minScore || 0)}`} 
                  />
                </div>
                <div className="col-span-2 md:col-span-2 lg:col-span-2">
                  <StatBox 
                    label="Ketuntasan PG" 
                    value={`${Math.round(analytics?.completionRate || 0)}%`} 
                    progress={isNaN(analytics?.completionRate) ? 0 : analytics?.completionRate} 
                  />
                </div>
                <div className="col-span-2 md:col-span-2 lg:col-span-2">
                  <StatBox 
                    label="Simpangan Baku (SD)" 
                    value={`${(analytics?.stdDev || 0).toFixed(2)}`} 
                  />
                </div>
                
                <div className="glass p-8 rounded-[48px] border-white/60 col-span-2 md:col-span-4 lg:col-span-2 flex items-center justify-between relative overflow-hidden group">
                  <div className="relative z-10 w-full">
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-4">Distribusi Tingkat Kesukaran</p>
                    <div className="flex justify-between items-center w-full gap-4">
                      <DifficultyInfo label="Mudah" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk >= 0.7).length || 0}`} />
                      <DifficultyInfo label="Sedang" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk >= 0.3 && i.tk < 0.7).length || 0}`} />
                      <DifficultyInfo label="Sukar" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk < 0.3).length || 0}`} />
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 h-24 w-40 flex items-end gap-2 group-hover:scale-105 transition-transform duration-500 opacity-20 pointer-events-none">
                    {[40, 90, 30].map((h, idx) => (
                      <div key={idx} className={cn("w-full rounded-t-2xl transition-all duration-1000", idx === 1 ? "bg-primary" : "bg-primary/20")} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Charts & Advanced Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Chart */}
                <div className="lg:col-span-8 glass p-10 rounded-[56px] border-white/60 shadow-2xl shadow-on-surface/5">
                   <div className="flex justify-between items-center mb-12">
                      <h3 className="text-3xl font-black tracking-tight">Index Kesukaran Soal (TK)</h3>
                      <div className="flex items-center gap-6">
                          <LegendItem color="bg-primary" label="Difficulty Index" />
                      </div>
                   </div>
                   <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} dy={10} />
                              <YAxis hide domain={[0, 100]} />
                              <Tooltip 
                                  cursor={{ fill: 'rgba(128, 49, 244, 0.05)', radius: 16 }} 
                                  contentStyle={{ borderRadius: '24px', border: 'none', background: 'white', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                              />
                              <Bar dataKey="value" radius={[12, 12, 12, 12]}>
                                  {chartData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={entry.value > 70 ? '#22c55e' : entry.value < 30 ? '#ef4444' : '#8031f4'} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Side AI Recap */}
                <div className="lg:col-span-4 flex flex-col gap-8">
                   <div className="glass p-10 rounded-[48px] border-white/60 flex-1 flex flex-col">
                      <h4 className="text-xl font-black mb-10 tracking-tight text-on-surface-variant/40 uppercase tracking-widest text-[10px]">Ringkasan Kelayakan</h4>
                      <div className="space-y-8 flex-1">
                         <SummaryItem icon={<CheckCircle2 className="text-green-600" />} label="Sangat Layak" count={`${analytics?.items?.filter((i:any) => i.status === "Sangat Layak").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Sangat Layak").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-green-500/10" />
                         <SummaryItem icon={<AlertTriangle className="text-yellow-600" />} label="Perlu Revisi" count={`${analytics?.items?.filter((i:any) => i.status === "Revisi" || i.status === "Layak").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Revisi" || i.status === "Layak").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-yellow-500/10" />
                         <SummaryItem icon={<XCircle className="text-error" />} label="Buang" count={`${analytics?.items?.filter((i:any) => i.status === "Buang").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Buang").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-error/10" />
                      </div>
                   </div>
                </div>
              </div>

              {/* Response Matrix */}
              <div className="glass rounded-[56px] border-white/60 overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-white/40 flex justify-between items-center">
                    <h4 className="text-3xl font-black tracking-tight">Matriks Pilihan Jawaban</h4>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /> <span className="text-[10px] font-black uppercase tracking-widest">Benar</span></div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> <span className="text-[10px] font-black uppercase tracking-widest">Salah</span></div>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                             <th className="px-8 py-6 w-80 min-w-[320px]">Nama Siswa</th>
                             {pgQuestions.map((_: any, idx: number) => (
                                 <th key={idx} className="px-4 py-6 text-center">S{idx + 1}</th>
                             ))}
                             <th className="px-8 py-6 text-right">Skor PG</th>
                          </tr>
                       </thead>
                       <tbody>
                          {submissions.map((sub: any) => (
                              <tr key={sub.id} className="border-t border-white/20 hover:bg-white/40 transition-colors">
                                  <td className="px-8 py-4 font-bold text-sm text-on-surface whitespace-nowrap">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-lg bg-surface border border-white/80 overflow-hidden flex items-center justify-center">
                                            {sub.studentPhoto ? (
                                                <img src={sub.studentPhoto} alt="avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-primary bg-primary/10 w-full h-full flex items-center justify-center">{sub.studentName?.charAt(0) || "U"}</span>
                                            )}
                                         </div>
                                         {sub.studentName || sub.studentId.substring(0, 8)}
                                      </div>
                                  </td>
                                  {pgQuestions.map((q: any, qIdx: number) => {
                                      const ans = sub.answers?.[q.originalIndex];
                                      const correctOptionLabel = q.options?.find((opt: any) => opt.isCorrect)?.label;
                                      const isCorrect = typeof ans === 'string' ? ans === correctOptionLabel : ans?.isCorrect;
                                      const displayLabel = typeof ans === 'string' ? ans : (ans?.label || "-");
                                      
                                      return (
                                          <td key={qIdx} className="px-4 py-4 text-center">
                                             <span className={cn(
                                               "px-2.5 py-1 rounded-md text-xs font-black",
                                               isCorrect ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                                             )}>
                                               {displayLabel}
                                             </span>
                                          </td>
                                      );
                                  })}
                                  <td className="px-8 py-4 text-right font-black text-primary">{Math.round(sub.mcScore !== undefined ? sub.mcScore : (sub.totalScore || 0))}</td>
                              </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Detailed Table */}
              <div className="glass rounded-[56px] border-white/60 overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-white/40 flex flex-col md:flex-row justify-between items-center gap-6">
                    <h4 className="text-3xl font-black tracking-tight">Analisis Butir Detail</h4>
                    <div className="flex gap-4 w-full md:w-auto">
                       <div className="relative flex-1 md:w-64 group">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                              <Search size={16} />
                          </span>
                          <input 
                              type="text" 
                              value={filterStatus === "all" ? "" : filterStatus}
                              onChange={(e) => setFilterStatus(e.target.value || "all")}
                              placeholder="Cari status soal..." 
                              className="w-full bg-white/40 border border-white/60 focus:border-primary/40 focus:bg-white outline-none pl-14 pr-6 py-4 rounded-2xl text-xs font-bold transition-all shadow-inner" 
                          />
                       </div>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                             <th className="px-12 py-8 text-on-surface-variant/40">No</th>
                             <th className="px-8 py-8">Pertanyaan</th>
                             <th className="px-8 py-8 text-center">Kesukaran (TK)</th>
                             <th className="px-8 py-8 text-center">Daya Beda (DP)</th>
                             <th className="px-8 py-8 text-center">Validitas (rXY)</th>
                             <th className="px-8 py-8">Evaluasi & Distraktor</th>
                             <th className="px-12 py-8 text-right">Aksi</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/20">
                          {analytics?.items?.filter((item: any) => filterStatus === "all" || item.status.toLowerCase().includes(filterStatus.toLowerCase()))?.map((item: any, idx: number) => (
                            <TableRow 
                              key={item.questionIndex}
                              no={(idx + 1).toString().padStart(2, '0')} 
                              snippet={item.snippet} 
                              difficulty={`${analysisUtils.interpretTK(item.tk)} (${item.tk.toFixed(2)})`} 
                              diffColor={item.tk >= 0.7 ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : item.tk < 0.3 ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"} 
                              dp={`${analysisUtils.interpretDP(item.dp)} (${item.dp.toFixed(2)})`}
                              dpColor={item.dp >= 0.3 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}
                              validity={`${item.validity >= 0.3 ? "Valid" : "Tidak Valid"} (${item.validity.toFixed(3)})`}
                              validityColor={item.validity >= 0.3 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}
                              recommendation={item.recommendation}
                              status={item.status}
                              statusColor={item.status === "Sangat Layak" ? "bg-green-500/10 text-green-600" : item.status === "Buang" ? "bg-error/10 text-error" : "bg-yellow-500/10 text-yellow-600"}
                              isWarn={item.status === "Revisi"}
                              isDanger={item.status === "Buang"}
                              distractorData={item.distractors}
                              isFixing={isFixing === item.questionIndex}
                              onFix={() => handleAiFix(item)}
                            />
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            </>
          )
        ) : (
          /* Render Manual Grid */
          <div className="glass rounded-[56px] border-white/60 shadow-2xl p-10 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/20">
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">Input Jawaban Manual PG (Mode Anates)</h3>
                <p className="text-sm text-on-surface-variant font-medium">Masukkan nama siswa beserta pilihan jawaban (A, B, C, D, E) untuk butir soal Pilihan Ganda.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleAddManualRow}
                  className="btn-glass px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
                >
                  + Tambah Siswa
                </button>
                <button 
                  onClick={handleSaveManual}
                  disabled={isSavingManual}
                  className="btn-glass-primary px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                >
                  {isSavingManual ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Simpan & Hitung
                </button>
              </div>
            </div>

            {/* Kunci Jawaban Info */}
            <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 flex flex-wrap items-center gap-x-10 gap-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-primary">Kunci Jawaban PG:</span>
              <div className="flex flex-wrap gap-4">
                {pgQuestions.map((q: any, idx: number) => {
                  const key = q.options?.find((o: any) => o.isCorrect)?.label || "-";
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-primary/10">
                      <span className="text-[10px] font-black text-on-surface-variant">S{idx + 1}:</span>
                      <span className="text-xs font-black text-primary">{key}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Spreadsheet */}
            <div className="overflow-x-auto rounded-[32px] border border-white/40">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                    <th className="px-8 py-5 w-80 min-w-[320px]">Nama Siswa</th>
                    {pgQuestions.map((_: any, idx: number) => (
                      <th key={idx} className="px-4 py-5 text-center">
                        <span className="block text-[10px] font-black">Soal {idx + 1}</span>
                      </th>
                    ))}
                    <th className="px-8 py-5 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row) => (
                    <tr key={row.id} className="border-t border-white/20 hover:bg-white/40 transition-colors">
                      <td className="px-8 py-4">
                        <input 
                          type="text" 
                          value={row.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualRows(prev => prev.map(r => r.id === row.id ? { ...r, name: val } : r));
                          }}
                          placeholder="Nama Siswa"
                          className="w-full bg-white/50 border border-outline/20 focus:border-primary outline-none px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        />
                      </td>
                      {pgQuestions.map((q: any, qIdx: number) => (
                        <td key={qIdx} className="px-4 py-4 text-center">
                          <select
                            value={row.answers[q.originalIndex] || ""}
                            onChange={(e) => handleCellChange(row.id, q.originalIndex, e.target.value)}
                            className="bg-white/50 border border-outline/20 focus:border-primary outline-none px-3 py-2 rounded-xl text-xs font-black text-center"
                          >
                            <option value="">-</option>
                            {["A", "B", "C", "D", "E"].map(letter => (
                              <option key={letter} value={letter}>{letter}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                      <td className="px-8 py-4 text-center">
                        <button 
                          onClick={() => handleRemoveManualRow(row.id)}
                          className="text-error hover:bg-error/10 p-2 rounded-xl transition-all"
                          title="Hapus Siswa"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {refinedQuestion && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefinedQuestion(null)} className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-10 w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-primary" />
                            <h3 className="text-2xl font-black tracking-tight">Perbaikan Soal PG oleh AI</h3>
                        </div>
                        <button onClick={() => setRefinedQuestion(null)}><X /></button>
                    </div>

                    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                        {refinedQuestion.revisionNotes && (
                            <div className="bg-primary/5 p-6 rounded-[24px] border border-primary/10">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles size={12} /> Analisis Revisi AI
                                </p>
                                <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                                    {refinedQuestion.revisionNotes}
                                </p>
                            </div>
                        )}

                        <div>
                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-4">Soal PG Hasil Perbaikan</p>
                            <p className="text-lg font-bold text-on-surface leading-snug">{refinedQuestion.question}</p>
                        </div>

                        {refinedQuestion.options && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {refinedQuestion.options?.map((opt: any) => (
                                    <div key={opt.label} className={cn("p-4 rounded-2xl border-2 flex items-center justify-between", opt.isCorrect ? "bg-green-500/10 border-green-500/20 text-green-700" : "bg-on-surface/5 border-transparent")}>
                                        <span className="font-bold">{opt.label}. {opt.text}</span>
                                        {opt.isCorrect && <CheckCircle2 size={16} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-8 mt-4 border-t border-on-surface/5">
                        <button onClick={() => setRefinedQuestion(null)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest border-2 border-on-surface/10 rounded-2xl hover:bg-on-surface/5 transition-colors">Batal</button>
                        <button onClick={applyFix} className="flex-1 py-4 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all">Terapkan Perbaikan</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function StatBox({ label, value, tag, tagColor, progress }: any) {
    return (
        <motion.div whileHover={{ y: -5 }} className="glass p-10 rounded-[48px] border-white/60 shadow-xl shadow-on-surface/5">
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-4">{label}</p>
            <h3 className="text-6xl font-black tracking-tighter mb-4 text-on-surface">{value}</h3>
            {tag && <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", tagColor)}>{tag}</span>}
            {progress !== undefined && !isNaN(progress) && (
                <div className="w-full bg-on-surface/5 h-2.5 rounded-full overflow-hidden border border-white/60 mt-4">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${isNaN(progress) ? 0 : progress}%` }} className="h-full bg-primary" />
                </div>
            )}
        </motion.div>
    );
}

function DifficultyInfo({ label, percent }: any) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black text-on-surface">{percent}</p>
        </div>
    );
}

function LegendItem({ color, label }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", color)} />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</span>
        </div>
    );
}

function SummaryItem({ icon, label, count, percent, color }: any) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-white/40", color)}>
                    {icon}
                </div>
                <div>
                   <p className="font-black text-on-surface tracking-tight leading-tight">{label}</p>
                   <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{count}</p>
                </div>
            </div>
            <p className="text-2xl font-black text-on-surface">{percent}</p>
        </div>
    );
}

function TableRow({ no, snippet, difficulty, diffColor, dp, dpColor, validity, validityColor, recommendation, statusColor, status, isWarn, isDanger, onFix, isFixing, distractorData }: any) {
    return (
        <tr className="hover:bg-white/30 transition-all group">
            <td className="px-12 py-8 font-black text-on-surface/20 group-hover:text-primary/40 transition-colors">{no}</td>
            <td className="px-8 py-8">
               <div className="flex flex-col">
                  <p className="font-bold text-on-surface group-hover:text-primary transition-colors max-w-[300px] truncate">{snippet}</p>
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Pratinjau Soal</p>
               </div>
            </td>
            <td className="px-8 py-8 text-center">
                <span className={cn("whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm", diffColor)}>{difficulty}</span>
            </td>
            <td className="px-8 py-8 text-center">
                <span className={cn("whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm", dpColor)}>{dp}</span>
            </td>
            <td className="px-8 py-8 text-center">
                <span className={cn("whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm", validityColor)}>{validity}</span>
            </td>
            <td className="px-8 py-8">
                <div className="flex flex-col gap-3 min-w-[200px]">
                    <span className={cn("whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm inline-block w-fit", statusColor)}>{status}</span>
                    <p className="text-xs font-medium text-on-surface-variant leading-relaxed italic border-l-2 border-primary/20 pl-3">
                        "{recommendation}"
                    </p>
                    {(isWarn || isDanger) && distractorData && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(distractorData).map(([label, count]: [string, any]) => (
                                <span key={label} className="text-[9px] font-black bg-on-surface/5 text-on-surface-variant/60 px-2 py-0.5 rounded-md border border-white/60">
                                    {label}: {count}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-12 py-8 text-right">
                <div className="flex gap-2 justify-end">
                    {isWarn || isDanger ? (
                        <button 
                            disabled={isFixing}
                            onClick={onFix}
                            className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isFixing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />} AI FIX
                        </button>
                    ) : (
                        <button className="p-3 bg-white/40 rounded-xl hover:text-primary transition-all backdrop-blur-md border border-white/60 shadow-sm"><Eye size={18} /></button>
                    )}
                    <button className="p-3 bg-white/40 rounded-xl hover:text-on-surface transition-all backdrop-blur-md border border-white/60 shadow-sm"><MoreVertical size={18} /></button>
                </div>
            </td>
        </tr>
    );
}
