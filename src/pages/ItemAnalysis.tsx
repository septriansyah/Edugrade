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
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  MoreVertical,
  Search,
  Loader2,
  FileText,
  X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import * as analysisUtils from "@/src/lib/itemAnalysis";

export default function ItemAnalysis() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState<number | null>(null);
  const [refinedQuestion, setRefinedQuestion] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  const fetchData = async () => {
    if (!id || !auth.currentUser) return;
    setIsLoading(true);
    try {
      const assignmentDoc = await getDoc(doc(db, "assignments", id));
      if (assignmentDoc.exists()) {
        setAssignment({ id: assignmentDoc.id, ...assignmentDoc.data() });
      }

      const subsQuery = query(collection(db, "submissions"), where("assignmentId", "==", id));
      const subsSnap = await getDocs(subsQuery);
      setSubmissions(subsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      // We don't want to throw and crash the entire UI, but maybe show an error state
    } finally {
      setIsLoading(false);
    }
  };

  const analytics = useMemo(() => {
    if (!assignment || !submissions.length) return null;

    const totalStudents = submissions.length;
    const questions = assignment.questions || [];
    const itemResults = questions.map((q: any, qIdx: number) => {
      const answers = submissions.map(s => s.answers?.[qIdx]);
      
      if (q.type === "Multiple Choice") {
        const correctAnswers = answers.filter(a => a?.isCorrect).length;
        const tk = analysisUtils.calculateTK(correctAnswers, totalStudents);
        
        // Sorting for DP calculation
        const sortedSubs = [...submissions].sort((a, b) => {
            const scoreA = a.totalScore || 0;
            const scoreB = b.totalScore || 0;
            return scoreB - scoreA;
        });
        const groupSize = Math.floor(totalStudents * 0.27) || 1;
        const upperGroup = sortedSubs.slice(0, groupSize);
        const lowerGroup = sortedSubs.slice(-groupSize);
        
        const upperCorrect = upperGroup.filter(s => s.answers?.[qIdx]?.isCorrect).length;
        const lowerCorrect = lowerGroup.filter(s => s.answers?.[qIdx]?.isCorrect).length;
        const dp = analysisUtils.calculateDP(upperCorrect, lowerCorrect, groupSize);

        const distractors: { [key: string]: number } = {};
        answers.forEach(a => {
            if (a && !a.isCorrect && a.label) {
                distractors[a.label] = (distractors[a.label] || 0) + 1;
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

        return {
          questionIndex: qIdx,
          snippet: q.question,
          type: "Multiple Choice",
          originalQuestion: q,
          tk,
          dp,
          distractors,
          status,
          recommendation
        };
      } else {
        const scores = answers.map(a => a?.score || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / totalStudents;
        const tk = avgScore / 100; // Assuming max 100

        const sortedSubs = [...submissions].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
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
          recommendation: status === "Revisi" ? "Rubrik penilaian mungkin terlalu subjektif atau soal kurang spesifik." : "Soal esai memberikan sebaran nilai yang baik."
        };
      }
    });

    const scoresList = submissions.map(s => s.totalScore || 0);
    const mean = totalStudents > 0 ? (scoresList.reduce((a, b) => a + b, 0) / totalStudents) : 0;
    const completionRate = totalStudents > 0 ? ((scoresList.filter(s => s >= 70).length / totalStudents) * 100) : 0;

    // Reliability calculation
    let reliability = 0;
    const totalVar = analysisUtils.calculateVariance(scoresList);
    if (questions[0]?.type === "Multiple Choice") {
        const pValues = itemResults.map((r: any) => r.tk || 0);
        reliability = analysisUtils.calculateKR20(questions.length, pValues, totalVar) || 0;
    } else {
        const itemVariances = questions.map((_: any, idx: number) => {
            const itemScores = submissions.map(s => s.answers?.[idx]?.score || 0);
            return analysisUtils.calculateVariance(itemScores);
        });
        reliability = analysisUtils.calculateAlphaCronbach(questions.length, itemVariances, totalVar) || 0;
    }

    return {
      reliability: isNaN(reliability) ? 0 : reliability,
      mean: isNaN(mean) ? 0 : mean,
      completionRate: isNaN(completionRate) ? 0 : completionRate,
      items: itemResults
    };
  }, [assignment, submissions]);

  const chartData = useMemo(() => {
    return analytics?.items?.map((item: any) => ({
      name: `S${item.questionIndex + 1}`,
      value: isNaN(item.tk) || item.tk === null || item.tk === undefined ? 0 : Math.round(item.tk * 100)
    })) || [];
  }, [analytics]);

  const handleExportTxt = () => {
    if (!analytics || !assignment) return;
    
    let content = `HASIL ANALISIS ITEM - ${assignment.title}\n`;
    content += `==========================================\n\n`;
    content += `RINGKASAN:\n`;
    content += `- Rata-rata Nilai: ${analytics.mean.toFixed(2)}\n`;
    content += `- Reliabilitas: ${analytics.reliability.toFixed(2)}\n`;
    content += `- Persentase Ketuntasan: ${analytics.completionRate.toFixed(2)}%\n\n`;
    
    content += `DETAIL PER BUTIR SOAL:\n`;
    analytics.items.forEach((item: any) => {
      content += `Soal No. ${item.questionIndex + 1} (${item.type})\n`;
      content += `- Tingkat Kesukaran (TK): ${item.tk.toFixed(2)} (${analysisUtils.interpretTK(item.tk)})\n`;
      content += `- Daya Beda (DP): ${item.dp.toFixed(2)} (${analysisUtils.interpretDP(item.dp)})\n`;
      if (item.distractors) {
          content += `- Efektivitas Pengecoh: ${JSON.stringify(item.distractors)}\n`;
      }
      content += `- Status: ${item.status}\n`;
      content += `- Rekomendasi: ${item.recommendation}\n`;
      content += `------------------------------------------\n`;
    });

    content += `\nRUMUS YANG DIGUNAKAN:\n`;
    content += `1. Tingkat Kesukaran (TK) = B / N\n`;
    content += `2. Daya Beda (DP) = (BA - BB) / (0.5 * N)\n`;
    content += `3. Reliabilitas (KR-20/Alpha Cronbach) = (k / (k-1)) * (1 - Σpq / σ²)\n`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Item-Analysis-${assignment.title.replace(/\s+/g, '-')}.txt`;
    a.click();
  };

  const handleAiFix = async (item: any) => {
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
           <p className="font-bold text-on-surface-variant">Menghitung analisis data...</p>
        </div>
      </Layout>
    );
  }

  if (!assignment) {
    return (
      <Layout userType="teacher">
        <div className="p-12 text-center">
           <h2 className="text-2xl font-black">Assignment not found</h2>
           <Link to="/dashboard" className="text-primary font-bold mt-4 block">Kembali ke Dashboard</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                 <BarChart3 className="text-primary" size={20} />
              </div>
              <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Analitik Lanjutan</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tighter text-on-surface">Item <span className="text-primary italic">Analysis</span></h1>
            <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
              Analisis performa soal untuk <span className="text-on-surface font-bold">{assignment.title}</span>. Optimasi berdasarkan validitas & reliabilitas.
            </p>
          </motion.div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
                onClick={handleExportTxt}
                className="flex-1 btn-glass px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all hover:scale-105"
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <StatBox 
            label="Reliabilitas" 
            value={analytics?.reliability.toFixed(2) || "0.00"} 
            tag={analytics && analytics.reliability > 0.7 ? "Tinggi" : "Rendah"} 
            tagColor={analytics && analytics.reliability > 0.7 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"} 
          />
          <StatBox 
            label="Ketuntasan" 
            value={`${Math.round(analytics?.completionRate || 0)}%`} 
            progress={isNaN(analytics?.completionRate) ? 0 : analytics?.completionRate} 
          />
          
          <div className="glass p-10 rounded-[48px] border-white/60 md:col-span-2 flex items-center justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-6">Distribusi Indeks Kesukaran</p>
              <div className="flex gap-10">
                <DifficultyInfo label="Mudah" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk >= 0.7).length || 0}`} />
                <DifficultyInfo label="Sedang" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk >= 0.3 && i.tk < 0.7).length || 0}`} />
                <DifficultyInfo label="Sukar" percent={`${analytics?.items?.filter((i:any) => !isNaN(i.tk) && i.tk < 0.3).length || 0}`} />
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
                <h3 className="text-3xl font-black tracking-tight">Performa Butir Soal (TK)</h3>
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
             <div className="glass p-10 rounded-[48px] border-white/60 bg-primary/5 relative overflow-hidden group">
                <Wand2 className="absolute -top-12 -right-12 w-48 h-48 text-primary/5 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                    <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                        <Sparkles className="text-primary" size={28} />
                    </div>
                    <h4 className="text-2xl font-black mb-4 tracking-tight">Rekomendasi AI</h4>
                    <p className="text-on-surface-variant font-medium leading-relaxed mb-8">
                        Ditemukan <span className="text-primary font-black underline underline-offset-4 decoration-primary/20">{analytics?.items?.filter((i:any) => i.status === "Revisi" || i.status === "Buang").length || 0} butir soal</span> yang berpotensi memiliki masalah pada validitas atau daya beda.
                    </p>
                    <button className="w-full bg-primary text-white py-5 rounded-[24px] font-black tracking-widest text-xs uppercase flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-xl shadow-primary/20">
                        <Zap size={18} fill="currentColor" />
                        Optimasi Bank Soal
                    </button>
                </div>
             </div>

             <div className="glass p-10 rounded-[48px] border-white/60 flex-1 flex flex-col">
                <h4 className="text-xl font-black mb-10 tracking-tight text-on-surface-variant/40 uppercase tracking-widest text-[10px]">Ringkasan Status</h4>
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
              <h4 className="text-3xl font-black tracking-tight">Matriks Jawaban Siswa</h4>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /> <span className="text-[10px] font-black uppercase tracking-widest">Benar</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> <span className="text-[10px] font-black uppercase tracking-widest">Salah</span></div>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                       <th className="px-8 py-6">Nama Siswa</th>
                       {assignment.questions?.map((_: any, idx: number) => (
                           <th key={idx} className="px-4 py-6 text-center">Soal {idx + 1}</th>
                       ))}
                       <th className="px-8 py-6 text-right">Skor Total</th>
                    </tr>
                 </thead>
                 <tbody>
                    {submissions.map((sub: any) => (
                        <tr key={sub.id} className="border-t border-white/20 hover:bg-white/40 transition-colors">
                            <td className="px-8 py-4 font-bold text-sm text-on-surface whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-surface border border-white/80 overflow-hidden">
                                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.studentId}`} alt="avatar" />
                                   </div>
                                   {sub.studentId.substring(0, 8)}...
                                </div>
                            </td>
                            {assignment.questions?.map((_: any, qIdx: number) => {
                                const ans = sub.answers?.[qIdx];
                                const isCorrect = ans?.isCorrect || (ans?.score !== undefined && ans.score >= 70);
                                return (
                                    <td key={qIdx} className="px-4 py-4 text-center">
                                       <div className={cn("w-6 h-6 mx-auto rounded-lg flex items-center justify-center", isCorrect ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600")}>
                                          {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                       </div>
                                    </td>
                                );
                            })}
                            <td className="px-8 py-4 text-right font-black text-primary">{Math.round(sub.totalScore || 0)}</td>
                        </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Detailed Table */}
        <div className="glass rounded-[56px] border-white/60 overflow-hidden shadow-2xl">
           <div className="p-10 border-b border-white/40 flex flex-col md:flex-row justify-between items-center gap-6">
              <h4 className="text-3xl font-black tracking-tight">Tabel Analisis Detail</h4>
              <div className="flex gap-4 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors" size={18} />
                    <input className="w-full bg-white/40 border border-white/60 focus:border-primary outline-none pl-14 pr-6 py-4 rounded-2xl font-bold transition-all text-sm" placeholder="Cari butir soal..." />
                 </div>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 border-b border-white/30">
                       <th className="px-12 py-8">No.</th>
                       <th className="px-8 py-8">Cuplikan Soal</th>
                       <th className="px-8 py-8 text-center">Tingkat Kesukaran</th>
                       <th className="px-8 py-8 text-center">Daya Beda</th>
                       <th className="px-8 py-8 text-center">Rekomendasi</th>
                       <th className="px-12 py-8 text-right">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/20">
                    {analytics?.items?.map((item: any) => (
                      <TableRow 
                        key={item.questionIndex}
                        no={(item.questionIndex + 1).toString().padStart(2, '0')} 
                        snippet={item.snippet} 
                        difficulty={`${analysisUtils.interpretTK(item.tk)} (${item.tk.toFixed(2)})`} 
                        diffColor={item.tk >= 0.7 ? "bg-blue-500/10 text-blue-600" : item.tk < 0.3 ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"} 
                        dp={`${analysisUtils.interpretDP(item.dp)} (${item.dp.toFixed(2)})`}
                        dpColor={item.dp >= 0.3 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}
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
      </div>

      <AnimatePresence>
        {refinedQuestion && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefinedQuestion(null)} className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-10 w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-primary" />
                            <h3 className="text-2xl font-black tracking-tight">Perbaikan Soal oleh AI</h3>
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
                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-4">Soal Hasil Perbaikan</p>
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

function TableRow({ no, snippet, difficulty, diffColor, dp, dpColor, recommendation, statusColor, status, isWarn, isDanger, onFix, isFixing, distractorData }: any) {
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

function SearchIconCustom({ className, size }: { className?: string, size?: number }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    )
}
