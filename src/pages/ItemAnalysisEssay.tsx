import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
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
import { db, auth } from "@/src/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import * as analysisUtils from "@/src/lib/itemAnalysis";

export default function ItemAnalysisEssay() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  const essayQuestions = useMemo(() => {
    return assignment?.questions?.map((q: any, idx: number) => ({ ...q, originalIndex: idx }))
      .filter((q: any) => q.type === "Essay") || [];
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
                  if (q.type === "Essay") {
                      rowAnswers[idx] = ans?.score !== undefined ? ans.score : "";
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
        
        // Load existing answers to merge non-Essay answers safely
        const subDoc = await getDoc(doc(db, "submissions", submissionId));
        const existingAnswers = subDoc.exists() ? (subDoc.data()?.answers || {}) : {};
        const rowAnswers = { ...existingAnswers };
        
        questions.forEach((q: any, idx: number) => {
          if (q.type === "Essay") {
            essayTotal++;
            const val = row.answers[idx];
            const scoreNum = parseFloat(val as string) || 0;
            rowAnswers[idx] = {
              score: scoreNum,
              isCorrect: scoreNum >= 70
            };
            essayScoreSum += scoreNum;
          } else {
            mcTotal++;
            const existingMc = existingAnswers[idx];
            if (existingMc?.isCorrect) {
              mcCorrect++;
            }
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
          essayScore: Math.round(calculatedEssayScore),
          totalScore: Math.round(calculatedTotalScore),
          status: "graded",
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      alert("Matriks jawaban Esai berhasil disimpan!");
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
    if (!assignment || !submissions.length || essayQuestions.length === 0) return null;

    const totalStudents = submissions.length;
    const itemResults = essayQuestions.map((q: any) => {
      const qIdx = q.originalIndex;
      const scores = submissions.map(s => s.answers?.[qIdx]?.score || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / totalStudents;
      const tk = avgScore / 100;

      // Group sorting for DP calculation
      const sortedSubs = [...submissions].sort((a, b) => {
        const scoreA = a.essayScore !== undefined ? a.essayScore : (a.totalScore || 0);
        const scoreB = b.essayScore !== undefined ? b.essayScore : (b.totalScore || 0);
        return scoreB - scoreA;
      });
      const groupSize = Math.floor(totalStudents * 0.27) || 1;
      const upperAvg = sortedSubs.slice(0, groupSize).reduce((acc, s) => acc + (s.answers?.[qIdx]?.score || 0), 0) / groupSize;
      const lowerAvg = sortedSubs.slice(-groupSize).reduce((acc, s) => acc + (s.answers?.[qIdx]?.score || 0), 0) / groupSize;
      const dp = (upperAvg - lowerAvg) / 100;

      let status: any = "Layak";
      if (dp < 0.2) status = "Revisi";
      else if (dp >= 0.3) status = "Sangat Layak";

      return {
        questionIndex: qIdx,
        snippet: q.question,
        type: "Essay",
        originalQuestion: q,
        tk,
        dp,
        status,
        recommendation: status === "Revisi" 
          ? "Rubrik penilaian mungkin terlalu subjektif atau soal kurang spesifik. Pertimbangkan menyusun panduan penilaian (answer key) yang lebih rinci." 
          : "Soal esai memberikan sebaran nilai yang baik dan mengukur pemahaman secara efektif."
      };
    });

    const essayScoresList = submissions.map(s => s.essayScore !== undefined ? s.essayScore : (s.totalScore || 0));
    const mean = totalStudents > 0 ? (essayScoresList.reduce((a, b) => a + b, 0) / totalStudents) : 0;
    const completionRate = totalStudents > 0 ? ((essayScoresList.filter(s => s >= 70).length / totalStudents) * 100) : 0;

    // Reliability Alpha Cronbach for Essays
    const totalVar = analysisUtils.calculateVariance(essayScoresList);
    const itemVariances = essayQuestions.map((q: any) => {
        const itemScores = submissions.map(s => s.answers?.[q.originalIndex]?.score || 0);
        return analysisUtils.calculateVariance(itemScores);
    });
    const reliability = analysisUtils.calculateAlphaCronbach(essayQuestions.length, itemVariances, totalVar) || 0;

    return {
      reliability: isNaN(reliability) ? 0 : reliability,
      mean: isNaN(mean) ? 0 : mean,
      completionRate: isNaN(completionRate) ? 0 : completionRate,
      items: itemResults
    };
  }, [assignment, submissions, essayQuestions]);

  const chartData = useMemo(() => {
    return analytics?.items?.map((item: any, idx: number) => ({
      name: `S${idx + 1}`,
      value: isNaN(item.tk) || item.tk === null || item.tk === undefined ? 0 : Math.round(item.tk * 100)
    })) || [];
  }, [analytics]);

  const handleExportTxt = () => {
    if (!analytics || !assignment || !submissions.length || essayQuestions.length === 0) return;
    
    const totalStudents = submissions.length;
    const totalItems = essayQuestions.length;
    const fileNameText = `ANABUTIRSOAL_ESAI_${assignment.title.replace(/\s+/g, '_').toUpperCase().substring(0, 20)}.ANA`;
    const fileName = `ANABUTIRSOAL_ESAI_${assignment.title.replace(/\s+/g, '_').toUpperCase().substring(0, 20)}.txt`;

    // 1. Calculate Scores per Student
    const studentScores = submissions.map((sub: any, idx: number) => {
        let correctCount = 0;
        let wrongCount = 0;
        let scoreSum = 0;
        const answersList: string[] = [];
        
        essayQuestions.forEach((q: any) => {
            const ans = sub.answers?.[q.originalIndex];
            const scoreVal = ans?.score !== undefined ? ans.score : 0;
            scoreSum += scoreVal;
            answersList.push(scoreVal.toString());
            if (scoreVal >= 70) correctCount++;
            else wrongCount++;
        });
        
        return {
            noUrut: idx + 1,
            name: sub.studentName || sub.studentId.substring(0, 8),
            correct: correctCount,
            wrong: wrongCount,
            score: scoreSum / totalItems,
            answersList
        };
    });

    const scoresList = studentScores.map(s => s.score);
    const mean = scoresList.reduce((a, b) => a + b, 0) / totalStudents;
    const stdDev = Math.sqrt(analysisUtils.calculateVariance(scoresList) || 0);

    let content = `ANALISIS BUTIR SOAL (ESAI)\n===========================\n\n`;
    content += `Jumlah Subyek   = ${totalStudents}\n`;
    content += `Jumlah butir    = ${totalItems}\n`;
    content += `Nama berkas: ${fileNameText}\n\n`;
    
    content += ` No       Kode/Nama  Rerata Skor   Kategori Kelulusan \n`;
    studentScores.forEach(s => {
        content += ` ${s.noUrut.toString().padStart(3)} ${s.name.padStart(15).substring(0,15)} ${s.score.toFixed(2).padStart(11)} ${s.score >= 70 ? "   LULUS" : "   REMIDI"} \n`;
    });

    content += `\n\nRELIABILITAS ALPHA CRONBACH\n============================\n\n`;
    content += `Rata2 total = ${mean.toFixed(2).replace('.', ',')}\n`;
    content += `Simpang Baku = ${stdDev.toFixed(2).replace('.', ',')}\n`;
    content += `Reliabilitas Tes = ${analytics.reliability.toFixed(2).replace('.', ',')}\n\n`;
    
    content += ` No Butir   Rata-rata Skor Soal   Tafsir Kesukaran \n`;
    essayQuestions.forEach((q: any, i: number) => {
        const itemScores = submissions.map(s => s.answers?.[q.originalIndex]?.score || 0);
        const avg = itemScores.reduce((a,b)=>a+b,0) / totalStudents;
        let kesukaran = "Sedang";
        if (avg >= 75) kesukaran = "Mudah";
        if (avg <= 25) kesukaran = "Sukar";
        content += ` Soal ${(i+1).toString().padStart(2)} ${avg.toFixed(2).padStart(20)} ${kesukaran.padStart(18)} \n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  if (isLoading) {
    return (
      <Layout userType="teacher">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-bold text-on-surface-variant">Menghitung analisis data Esai...</p>
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
                <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Analisis Soal Esai</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tighter text-on-surface">Analisis <span className="text-primary italic">Esai</span></h1>
              <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
                Analisis validitas, sebaran nilai, dan indeks reliabilitas instrumen soal esai untuk <span className="text-on-surface font-bold">{assignment.title}</span>.
              </p>
            </motion.div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                  onClick={handleExportTxt}
                  disabled={essayQuestions.length === 0}
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
            Input Manual (Esai)
          </button>
        </div>

        {activeTab === "analysis" ? (
          essayQuestions.length === 0 ? (
            <div className="glass rounded-[48px] p-16 text-center max-w-2xl mx-auto space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={40} className="text-primary" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Tidak Ada Soal Esai</h3>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                Tugas ini tidak memiliki pertanyaan Esai.
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
                  Siswa belum mengumpulkan jawaban Esai secara digital. Gunakan mode Input Manual untuk menginput skor esai siswa dan menganalisis secara instan.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("anates")}
                className="btn-glass-primary px-8 py-4 rounded-2xl flex items-center gap-3 font-bold"
              >
                Buka Mode Input Manual
              </button>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <StatBox 
                  label="Reliabilitas Instrumen (Cronbach Alpha)" 
                  value={analytics?.reliability.toFixed(2) || "0.00"} 
                  tag={analytics && analytics.reliability > 0.6 ? "Baik" : "Kurang"} 
                  tagColor={analytics && analytics.reliability > 0.6 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"} 
                />
                <StatBox 
                  label="Rata-rata Skor Esai" 
                  value={`${Math.round(analytics?.mean || 0)}/100`} 
                  progress={isNaN(analytics?.mean) ? 0 : analytics?.mean} 
                />
                
                <div className="glass p-10 rounded-[48px] border-white/60 md:col-span-2 flex items-center justify-between relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-6">Tingkat Kesulitan Soal Esai</p>
                    <div className="flex gap-10">
                      <DifficultyInfo label="Mudah (TK >= 0.7)" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk >= 0.7).length || 0}`} />
                      <DifficultyInfo label="Sedang" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk >= 0.3 && i.tk < 0.7).length || 0}`} />
                      <DifficultyInfo label="Sukar (TK < 0.3)" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk < 0.3).length || 0}`} />
                    </div>
                  </div>
                  <div className="h-24 w-40 flex items-end gap-2 group-hover:scale-105 transition-transform duration-500">
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
                      <h3 className="text-3xl font-black tracking-tight">Rerata Skor Esai per Nomor Soal</h3>
                      <div className="flex items-center gap-6">
                          <LegendItem color="bg-primary" label="Score Index (%)" />
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

                {/* Summary Info */}
                <div className="lg:col-span-4 flex flex-col gap-8">
                   <div className="glass p-10 rounded-[48px] border-white/60 bg-primary/5 flex flex-col justify-center">
                      <h4 className="text-2xl font-black mb-4 tracking-tight">Karakteristik Analisis Esai</h4>
                      <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                        Analisis soal esai diukur berdasarkan performa sebaran nilai rata-rata siswa. Uji reliabilitas Alpha Cronbach digunakan untuk mendeteksi konsistensi internal instrumen penilaian esai ini.
                      </p>
                   </div>

                   <div className="glass p-10 rounded-[48px] border-white/60 flex-1 flex flex-col">
                      <h4 className="text-xl font-black mb-10 tracking-tight text-on-surface-variant/40 uppercase tracking-widest text-[10px]">Ringkasan Daya Pembeda</h4>
                      <div className="space-y-8 flex-1">
                         <SummaryItem icon={<CheckCircle2 className="text-green-600" />} label="Daya Beda Baik" count={`${analytics?.items?.filter((i:any) => i.status === "Sangat Layak").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Sangat Layak").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-green-500/10" />
                         <SummaryItem icon={<AlertTriangle className="text-yellow-600" />} label="Perlu Evaluasi Rubrik" count={`${analytics?.items?.filter((i:any) => i.status === "Revisi").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Revisi").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-yellow-500/10" />
                      </div>
                   </div>
                </div>
              </div>

              {/* Response Matrix */}
              <div className="glass rounded-[56px] border-white/60 overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-white/40 flex justify-between items-center">
                    <h4 className="text-3xl font-black tracking-tight">Matriks Nilai Esai Siswa</h4>
                    <div className="flex gap-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Skor Rentang 0 - 100</span>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                             <th className="px-8 py-6 w-80 min-w-[320px]">Nama Siswa</th>
                             {essayQuestions.map((_: any, idx: number) => (
                                 <th key={idx} className="px-4 py-6 text-center">S{idx + 1}</th>
                             ))}
                             <th className="px-8 py-6 text-right">Rata-rata Nilai</th>
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
                                  {essayQuestions.map((q: any, qIdx: number) => {
                                      const ans = sub.answers?.[q.originalIndex];
                                      const scoreVal = ans?.score !== undefined ? ans.score : 0;
                                      
                                      return (
                                          <td key={qIdx} className="px-4 py-4 text-center font-bold text-on-surface">
                                             {scoreVal}
                                          </td>
                                      );
                                  })}
                                  <td className="px-8 py-4 text-right font-black text-secondary">{Math.round(sub.essayScore !== undefined ? sub.essayScore : (sub.totalScore || 0))}</td>
                              </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Detailed Table */}
              <div className="glass rounded-[56px] border-white/60 overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-white/40 flex flex-col md:flex-row justify-between items-center gap-6">
                    <h4 className="text-3xl font-black tracking-tight">Analisis Butir Detail (Esai)</h4>
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
                             <th className="px-12 py-8">No</th>
                             <th className="px-8 py-8">Pertanyaan Esai</th>
                             <th className="px-8 py-8 text-center">Kesukaran (TK)</th>
                             <th className="px-8 py-8 text-center">Daya Beda (DP)</th>
                             <th className="px-8 py-8">Rekomendasi Rubrik</th>
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
                              diffColor={item.tk >= 0.7 ? "bg-blue-500/10 text-blue-600" : item.tk < 0.3 ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"} 
                              dp={`${analysisUtils.interpretDP(item.dp)} (${item.dp.toFixed(2)})`}
                              dpColor={item.dp >= 0.3 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}
                              recommendation={item.recommendation}
                              status={item.status}
                              statusColor={item.status === "Sangat Layak" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}
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
                <h3 className="text-2xl font-black tracking-tight mb-1">Input Skor Manual Esai</h3>
                <p className="text-sm text-on-surface-variant font-medium">Input nama siswa beserta nilai esai (skala 0 - 100) untuk setiap butir pertanyaan esai.</p>
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

            {/* Table Spreadsheet */}
            <div className="overflow-x-auto rounded-[32px] border border-white/40">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                    <th className="px-8 py-5 w-80 min-w-[320px]">Nama Siswa</th>
                    {essayQuestions.map((_: any, idx: number) => (
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
                      {essayQuestions.map((q: any, qIdx: number) => (
                        <td key={qIdx} className="px-4 py-4 text-center">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            placeholder="0-100"
                            value={row.answers[q.originalIndex] !== undefined ? row.answers[q.originalIndex] : ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              handleCellChange(row.id, q.originalIndex, val);
                            }}
                            className="w-20 bg-white/50 border border-outline/20 focus:border-primary outline-none px-3 py-2 rounded-xl text-xs font-bold text-center"
                          />
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

function TableRow({ no, snippet, difficulty, diffColor, dp, dpColor, recommendation, statusColor, status }: any) {
    return (
        <tr className="hover:bg-white/30 transition-all group">
            <td className="px-12 py-8 font-black text-on-surface/20 group-hover:text-primary/40 transition-colors">{no}</td>
            <td className="px-8 py-8">
               <div className="flex flex-col">
                  <p className="font-bold text-on-surface group-hover:text-primary transition-colors max-w-[400px] truncate">{snippet}</p>
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Pratinjau Soal Esai</p>
               </div>
            </td>
            <td className="px-8 py-8 text-center">
                <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm", diffColor)}>{difficulty}</span>
            </td>
            <td className="px-8 py-8 text-center">
                <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm", dpColor)}>{dp}</span>
            </td>
            <td className="px-8 py-8">
                <div className="flex flex-col gap-3 min-w-[200px]">
                    <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/40 shadow-sm inline-block w-fit", statusColor)}>{status}</span>
                    <p className="text-xs font-medium text-on-surface-variant leading-relaxed italic border-l-2 border-primary/20 pl-3">
                        "{recommendation}"
                    </p>
                </div>
            </td>
            <td className="px-12 py-8 text-right">
                <div className="flex gap-2 justify-end">
                    <button className="p-3 bg-white/40 rounded-xl hover:text-primary transition-all backdrop-blur-md border border-white/60 shadow-sm"><Eye size={18} /></button>
                    <button className="p-3 bg-white/40 rounded-xl hover:text-on-surface transition-all backdrop-blur-md border border-white/60 shadow-sm"><MoreVertical size={18} /></button>
                </div>
            </td>
        </tr>
    );
}
