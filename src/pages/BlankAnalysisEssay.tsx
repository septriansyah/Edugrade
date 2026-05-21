import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  Download, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  MoreVertical,
  Search,
  Loader2,
  FileText,
  X,
  Save,
  ArrowLeft,
  Settings
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { db, auth } from "@/src/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import * as analysisUtils from "@/src/lib/itemAnalysis";

export default function BlankAnalysisEssay() {
  const navigate = useNavigate();
  
  // Setup state
  const [isSetup, setIsSetup] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [qCount, setQCount] = useState(5);
  
  // Data state
  const [assignment, setAssignment] = useState<any>(null);
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"anates" | "analysis">("anates");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const handleStartSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || qCount <= 0) {
      alert("Harap isi seluruh formulir inisialisasi.");
      return;
    }

    // Initialize mock questions
    const mockQuestions = Array.from({ length: qCount }).map((_, idx) => ({
      question: `Pertanyaan Esai nomor ${idx + 1}`,
      type: "Essay"
    }));

    setAssignment({
      title,
      subject,
      questions: mockQuestions
    });

    setManualRows([
      { id: "manual_1", name: "Siswa 1", answers: {} },
      { id: "manual_2", name: "Siswa 2", answers: {} },
      { id: "manual_3", name: "Siswa 3", answers: {} }
    ]);

    setIsSetup(false);
  };

  const essayQuestions = useMemo(() => {
    return assignment?.questions?.map((q: any, idx: number) => ({ ...q, originalIndex: idx })) || [];
  }, [assignment]);

  const handleAddRow = () => {
    const newId = `manual_${Math.random().toString(36).substr(2, 9)}`;
    setManualRows(prev => [...prev, { id: newId, name: `Siswa ${prev.length + 1}`, answers: {} }]);
  };

  const handleRemoveRow = (rowId: string) => {
    setManualRows(prev => prev.filter(r => r.id !== rowId));
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

  // Submissions calculation for local preview
  const submissions = useMemo(() => {
    if (!assignment || !manualRows.length) return [];
    
    return manualRows.map((row, idx) => {
      let essayScoreSum = 0;
      let essayTotal = 0;
      const rowAnswers: Record<number, any> = {};

      essayQuestions.forEach((q) => {
        essayTotal++;
        const val = row.answers[q.originalIndex];
        const scoreNum = parseFloat(val as string) || 0;
        rowAnswers[q.originalIndex] = {
          score: scoreNum,
          isCorrect: scoreNum >= 70
        };
        essayScoreSum += scoreNum;
      });

      const essayScore = essayTotal > 0 ? (essayScoreSum / essayTotal) : 0;

      return {
        id: row.id || `sub_${idx}`,
        studentId: row.id,
        studentName: row.name || `Siswa ${idx + 1}`,
        answers: rowAnswers,
        essayScore: Math.round(essayScore),
        totalScore: Math.round(essayScore)
      };
    });
  }, [assignment, manualRows, essayQuestions]);

  const analytics = useMemo(() => {
    if (!assignment || !submissions.length || essayQuestions.length === 0) return null;

    const totalStudents = submissions.length;
    const itemResults = essayQuestions.map((q: any) => {
      const qIdx = q.originalIndex;
      const scores = submissions.map(s => s.answers?.[qIdx]?.score || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / totalStudents;
      const tk = avgScore / 100;

      // Group sorting for DP calculation
      const sortedSubs = [...submissions].sort((a, b) => b.totalScore - a.totalScore);
      const groupSize = Math.floor(totalStudents * 0.27) || 1;
      const upperAvg = sortedSubs.slice(0, groupSize).reduce((acc, s) => acc + (s.answers?.[qIdx]?.score || 0), 0) / groupSize;
      const lowerAvg = sortedSubs.slice(-groupSize).reduce((acc, s) => acc + (s.answers?.[qIdx]?.score || 0), 0) / groupSize;
      const dp = (upperAvg - lowerAvg) / 100;

      let status: any = "Layak";
      if (dp < 0.2) status = "Revisi";
      else if (dp >= 0.3) status = "Sangat Layak";

      return {
        questionIndex: qIdx,
        snippet: `Butir Pertanyaan Esai Nomor ${qIdx + 1}`,
        type: "Essay",
        tk,
        dp,
        status,
        recommendation: status === "Revisi" 
          ? "Rubrik penilaian mungkin terlalu subjektif atau soal kurang spesifik. Pertimbangkan menyusun panduan penilaian (answer key) yang lebih rinci." 
          : "Soal esai memberikan sebaran nilai yang baik dan mengukur pemahaman secara efektif."
      };
    });

    const essayScoresList = submissions.map(s => s.essayScore);
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

  const handleSaveToCloud = async () => {
    if (!auth.currentUser || !assignment) return;
    setIsSaving(true);
    try {
      // 1. Save Assignment
      const assignmentsRef = collection(db, "assignments");
      const newAssignmentRef = doc(assignmentsRef);
      
      const savedQuestions = essayQuestions.map((q) => ({
        question: q.question,
        type: "Essay"
      }));

      await setDoc(newAssignmentRef, {
        title: assignment.title,
        subject: assignment.subject,
        teacherId: auth.currentUser.uid,
        questions: savedQuestions,
        isBlankAnalysis: true,
        createdAt: serverTimestamp()
      });

      // 2. Save Submissions
      for (const sub of submissions) {
        const subId = `${newAssignmentRef.id}_${sub.studentId}`;
        const subRef = doc(db, "submissions", subId);
        await setDoc(subRef, {
          assignmentId: newAssignmentRef.id,
          studentId: sub.studentId,
          studentName: sub.studentName,
          answers: sub.answers,
          essayScore: sub.essayScore,
          totalScore: sub.totalScore,
          status: "graded",
          updatedAt: serverTimestamp()
        });
      }

      alert("Analisis Esai Berhasil Disimpan ke Cloud!");
      navigate("/analytics");
    } catch (error) {
      console.error("Error saving manual essay analysis:", error);
      alert("Gagal menyimpan data ke database: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTxt = () => {
    if (!analytics || !assignment || !submissions.length || essayQuestions.length === 0) return;
    
    const totalStudents = submissions.length;
    const totalItems = essayQuestions.length;
    const fileName = `ANABUTIRSOAL_MANDIRI_ESAI_${assignment.title.replace(/\s+/g, '_').toUpperCase().substring(0, 20)}.txt`;

    let content = `ANALISIS BUTIR SOAL (ESAI MANDIRI)\n==================================\n\n`;
    content += `Jumlah Subyek   = ${totalStudents}\n`;
    content += `Jumlah butir    = ${totalItems}\n\n`;
    
    content += ` No       Kode/Nama  Rerata Skor   Kategori Kelulusan \n`;
    submissions.forEach((s, idx) => {
        content += ` ${(idx+1).toString().padStart(3)} ${s.studentName.padStart(15).substring(0,15)} ${s.essayScore.toFixed(2).padStart(11)} ${s.essayScore >= 70 ? "   LULUS" : "   REMIDI"} \n`;
    });

    content += `\nReliabilitas Alpha Cronbach: ${analytics.reliability.toFixed(2)}\n`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  if (isSetup) {
    return (
      <Layout userType="teacher">
        <div className="p-8 lg:p-12 max-w-xl mx-auto space-y-10 min-h-[85vh] flex flex-col justify-center">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto text-secondary">
              <Settings size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Setup Analisis Mandiri Esai</h1>
            <p className="text-sm text-on-surface-variant font-medium">Inisialisasi paket soal esai kosong untuk mulai menganalisis dari kertas jawaban.</p>
          </div>

          <form onSubmit={handleStartSetup} className="glass p-10 rounded-[44px] border-white/60 shadow-xl space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Judul Analisis / Ujian</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Penilaian Esai Harian" 
                className="w-full bg-white/40 border border-white/60 focus:border-secondary outline-none px-5 py-4 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Mata Pelajaran / Kelas</label>
              <input 
                type="text" 
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Contoh: Matematika Kelas X-MIPA" 
                className="w-full bg-white/40 border border-white/60 focus:border-secondary outline-none px-5 py-4 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Jumlah Pertanyaan Esai (Maks 30)</label>
              <input 
                type="number" 
                required
                min="1"
                max="30"
                value={qCount}
                onChange={e => setQCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 0)))}
                className="w-full bg-white/40 border border-white/60 focus:border-secondary outline-none px-5 py-4 rounded-2xl font-bold transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-secondary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 shadow-lg shadow-secondary/20 transition-all pt-5"
            >
              Mulai Input Nilai Siswa
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                 <BarChart3 className="text-secondary" size={20} />
              </div>
              <span className="text-sm font-black text-secondary uppercase tracking-[0.2em]">Analisis Mandiri Esai</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tighter text-on-surface">{assignment.title}</h1>
            <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
              Mata Pelajaran: <span className="text-on-surface font-bold">{assignment.subject}</span> • Jumlah Soal: <span className="text-on-surface font-bold">{essayQuestions.length}</span>
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
                onClick={handleExportTxt}
                className="flex-1 btn-glass px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all hover:scale-105"
            >
              <Download size={20} />
              Ekspor TXT
            </button>
            <button 
                onClick={handleSaveToCloud}
                disabled={isSaving || manualRows.length === 0}
                className="flex-1 btn-glass-primary px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-secondary/20 bg-secondary text-white transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Simpan Permanen
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/20 pb-4">
          <button 
            onClick={() => setActiveTab("anates")}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === "anates" 
                ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
                : "text-on-surface-variant hover:bg-on-surface/5"
            )}
          >
            Input Skor Jawaban
          </button>
          <button 
            onClick={() => setActiveTab("analysis")}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === "analysis" 
                ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
                : "text-on-surface-variant hover:bg-on-surface/5"
            )}
          >
            Dashboard Analisis
          </button>
        </div>

        {activeTab === "anates" ? (
          /* Spreadsheet Mode */
          <div className="glass rounded-[56px] border-white/60 shadow-2xl p-10 space-y-10 bg-white/40">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/20">
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">Spreadsheet Skor Esai Mandiri</h3>
                <p className="text-sm text-on-surface-variant font-medium">Input nama siswa beserta nilai (skala 0 - 100) untuk setiap butir pertanyaan esai.</p>
              </div>
              <button 
                onClick={handleAddRow}
                className="btn-glass px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                + Tambah Siswa
              </button>
            </div>

            {/* Table Spreadsheet */}
            <div className="overflow-x-auto rounded-[32px] border border-white/40">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                    <th className="px-8 py-5 w-80 min-w-[320px]">Nama Siswa</th>
                    {essayQuestions.map((_, idx) => (
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
                          className="w-full bg-white/50 border border-outline/20 focus:border-secondary outline-none px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        />
                      </td>
                      {essayQuestions.map((q) => (
                        <td key={q.originalIndex} className="px-4 py-4 text-center">
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
                            className="w-20 bg-white/50 border border-outline/20 focus:border-secondary outline-none px-3 py-2 rounded-xl text-xs font-bold text-center"
                          />
                        </td>
                      ))}
                      <td className="px-8 py-4 text-center">
                        <button 
                          onClick={() => handleRemoveRow(row.id)}
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

            <div className="flex justify-end">
              <button 
                onClick={() => setActiveTab("analysis")}
                className="btn-glass-primary bg-secondary text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest shadow-secondary/20 hover:scale-105 transition-all border-none"
              >
                <FileText size={16} />
                Lihat Hasil Analisis
              </button>
            </div>
          </div>
        ) : (
          /* Analysis Dashboard Mode */
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
                                    {sub.studentName}
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
                                <td className="px-8 py-4 text-right font-black text-secondary">{Math.round(sub.essayScore)}</td>
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
