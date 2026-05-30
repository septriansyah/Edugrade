import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { db, auth } from "@/src/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import * as analysisUtils from "@/src/lib/itemAnalysis";

export default function BlankAnalysisPG() {
  const navigate = useNavigate();
  
  // Setup state
  const [isSetup, setIsSetup] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [qCount, setQCount] = useState(10);
  
  // Data state
  const [assignment, setAssignment] = useState<any>(null);
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [kunjau, setKunjau] = useState<Record<number, string>>({}); // originalIndex -> correct option label (A-E)
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
      question: `Pertanyaan nomor ${idx + 1}`,
      type: "Multiple Choice",
      options: [
        { label: "A", text: "Pilihan A", isCorrect: true },
        { label: "B", text: "Pilihan B", isCorrect: false },
        { label: "C", text: "Pilihan C", isCorrect: false },
        { label: "D", text: "Pilihan D", isCorrect: false },
        { label: "E", text: "Pilihan E", isCorrect: false }
      ]
    }));

    // Initialize default Kunjau to 'A'
    const initialKunjau: Record<number, string> = {};
    for (let i = 0; i < qCount; i++) {
      initialKunjau[i] = "A";
    }
    setKunjau(initialKunjau);

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

  const pgQuestions = useMemo(() => {
    return assignment?.questions?.map((q: any, idx: number) => ({ ...q, originalIndex: idx })) || [];
  }, [assignment]);

  const handleAddRow = () => {
    const newId = `manual_${Math.random().toString(36).substr(2, 9)}`;
    setManualRows(prev => [...prev, { id: newId, name: `Siswa ${prev.length + 1}`, answers: {} }]);
  };

  const handleRemoveRow = (rowId: string) => {
    setManualRows(prev => prev.filter(r => r.id !== rowId));
  };

  const handleCellChange = (rowId: string, qIdx: number, value: string) => {
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

  const handleKunjauChange = (qIdx: number, val: string) => {
    setKunjau(prev => ({
      ...prev,
      [qIdx]: val
    }));
  };

  // Submissions calculation for local preview
  const submissions = useMemo(() => {
    if (!assignment || !manualRows.length) return [];
    
    return manualRows.map((row, idx) => {
      let mcCorrect = 0;
      let mcTotal = 0;
      const rowAnswers: Record<number, any> = {};

      pgQuestions.forEach((q) => {
        mcTotal++;
        const correctOptionLabel = kunjau[q.originalIndex] || "A";
        const val = row.answers[q.originalIndex];
        const letter = (val || "").toString().toUpperCase();
        rowAnswers[q.originalIndex] = {
          label: letter,
          isCorrect: letter === correctOptionLabel
        };
        if (letter === correctOptionLabel) {
          mcCorrect++;
        }
      });

      const mcScore = mcTotal > 0 ? (mcCorrect / mcTotal) * 100 : 0;

      return {
        id: row.id || `sub_${idx}`,
        studentId: row.id,
        studentName: row.name || `Siswa ${idx + 1}`,
        answers: rowAnswers,
        mcScore: Math.round(mcScore),
        totalScore: Math.round(mcScore)
      };
    });
  }, [assignment, manualRows, kunjau, pgQuestions]);

  const analytics = useMemo(() => {
    if (!assignment || !submissions.length || pgQuestions.length === 0) return null;

    const totalStudents = submissions.length;
    const mcScoresList = submissions.map(s => s.mcScore);
    const mean = totalStudents > 0 ? (mcScoresList.reduce((a, b) => a + b, 0) / totalStudents) : 0;
    const completionRate = totalStudents > 0 ? ((mcScoresList.filter(s => s >= 70).length / totalStudents) * 100) : 0;
    const maxScore = mcScoresList.length > 0 ? Math.max(...mcScoresList) : 0;
    const minScore = mcScoresList.length > 0 ? Math.min(...mcScoresList) : 0;
    const stdDev = analysisUtils.calculateStandardDeviation(mcScoresList);

    const itemResults = pgQuestions.map((q: any) => {
      const qIdx = q.originalIndex;
      const answers = submissions.map(s => s.answers?.[qIdx]);
      const correctOptionLabel = kunjau[qIdx] || "A";
      const isAnsCorrect = (a: any) => typeof a === 'string' ? a === correctOptionLabel : a?.isCorrect;
      
      const correctAnswers = answers.filter(a => isAnsCorrect(a)).length;
      const tk = analysisUtils.calculateTK(correctAnswers, totalStudents);
      
      // Sorting for DP calculation
      const sortedSubs = [...submissions].sort((a, b) => b.totalScore - a.totalScore);
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

      let validity = analysisUtils.calculatePearsonCorrelation(answers.map(a => isAnsCorrect(a) ? 100 : 0), mcScoresList);
      if (isNaN(validity)) validity = 0;

      return {
        questionIndex: qIdx,
        snippet: `Butir Soal Nomor ${qIdx + 1}`,
        type: "Multiple Choice",
        tk,
        dp,
        validity,
        distractors,
        status,
        recommendation
      };
    });

    // Reliability KR-20 uses RAW scores variance, not 100-scale variance
    const rawScoresList = submissions.map(s => {
        let correct = 0;
        pgQuestions.forEach(q => {
            const ans = s.answers?.[q.originalIndex];
            const isAnsCorrect = typeof ans === 'string' ? ans === (kunjau[q.originalIndex] || "A") : ans?.isCorrect;
            if (isAnsCorrect) correct++;
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
  }, [assignment, submissions, pgQuestions, kunjau]);

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
      
      const savedQuestions = pgQuestions.map((q) => {
        const correctLabel = kunjau[q.originalIndex] || "A";
        return {
          question: q.question,
          type: "Multiple Choice",
          options: [
            { label: "A", text: "Pilihan A", isCorrect: correctLabel === "A" },
            { label: "B", text: "Pilihan B", isCorrect: correctLabel === "B" },
            { label: "C", text: "Pilihan C", isCorrect: correctLabel === "C" },
            { label: "D", text: "Pilihan D", isCorrect: correctLabel === "D" },
            { label: "E", text: "Pilihan E", isCorrect: correctLabel === "E" }
          ]
        };
      });

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
          mcScore: sub.mcScore,
          totalScore: sub.totalScore,
          status: "graded",
          updatedAt: serverTimestamp()
        });
      }

      alert("Analisis PG Berhasil Disimpan ke Cloud!");
      navigate("/analytics");
    } catch (error) {
      console.error("Error saving manual analysis:", error);
      alert("Gagal menyimpan data ke database: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTxt = () => {
    if (!analytics || !assignment || !submissions.length || pgQuestions.length === 0) return;
    
    const input: analysisUtils.PGReportInput = {
        assignmentTitle: assignment.title,
        questions: pgQuestions.map((q: any) => ({
            id: q.originalIndex,
            correctLabel: kunjau[q.originalIndex] || "A",
            labels: ["A", "B", "C", "D", "E"]
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
    const fileName = `ANABUTIRSOAL_MANDIRI_PG_${assignment.title.replace(/\s+/g, '_').toUpperCase().substring(0, 20)}.txt`;
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
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <iconify-icon icon="lucide:settings" width="28"  ></iconify-icon>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Setup Analisis Mandiri PG</h1>
            <p className="text-sm text-on-surface-variant font-medium">Inisialisasi paket soal pilihan ganda kosong untuk mulai menganalisis dari kertas jawaban.</p>
          </div>

          <form onSubmit={handleStartSetup} className="premium-card p-10 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Judul Analisis / Ujian</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Kuis 1 Bab Reproduksi Sel" 
                className="w-full bg-white/40 border border-white/60 focus:border-primary outline-none px-5 py-4 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Mata Pelajaran / Kelas</label>
              <input 
                type="text" 
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Contoh: Biologi Kelas XI-IPA" 
                className="w-full bg-white/40 border border-white/60 focus:border-primary outline-none px-5 py-4 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Jumlah Butir Soal (Maks 50)</label>
              <input 
                type="number" 
                required
                min="1"
                max="50"
                value={qCount}
                onChange={e => setQCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 0)))}
                className="w-full bg-white/40 border border-white/60 focus:border-primary outline-none px-5 py-4 rounded-2xl font-bold transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 shadow-lg shadow-primary/20 transition-all pt-5"
            >
              Mulai Input Respon Siswa
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
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                 <iconify-icon icon="lucide:bar-chart3" width="20" className="text-primary"  ></iconify-icon>
              </div>
              <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Analisis Mandiri PG</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tighter text-on-surface">{assignment.title}</h1>
            <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
              Mata Pelajaran: <span className="text-on-surface font-bold">{assignment.subject}</span> • Jumlah Soal: <span className="text-on-surface font-bold">{pgQuestions.length}</span>
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
                onClick={handleExportTxt}
                className="flex-1 btn-glass px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all hover:scale-105"
            >
              <iconify-icon icon="lucide:download" width="20"  ></iconify-icon>
              Ekspor TXT
            </button>
            <button 
                onClick={handleSaveToCloud}
                disabled={isSaving || manualRows.length === 0}
                className="flex-1 btn-glass-primary px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-primary/20 transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSaving ? <iconify-icon icon="lucide:loader2" width="20" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:save" width="20"  ></iconify-icon>}
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
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-on-surface-variant hover:bg-on-surface/5"
            )}
          >
            Input Kunjau & Jawaban
          </button>
          <button 
            onClick={() => setActiveTab("analysis")}
            className={cn(
              "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === "analysis" 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-on-surface-variant hover:bg-on-surface/5"
            )}
          >
            Dashboard Analisis
          </button>
        </div>

        {activeTab === "anates" ? (
          /* Spreadsheet Mode */
          <div className="premium-card p-10 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/20">
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">Spreadsheet Respon & Kunci Jawaban</h3>
                <p className="text-sm text-on-surface-variant font-medium">Lengkapi Kunci Jawaban (Kunjau) terlebih dahulu, kemudian masukkan nama siswa beserta pilihan jawabannya.</p>
              </div>
              <button 
                onClick={handleAddRow}
                className="btn-glass px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                + Tambah Siswa
              </button>
            </div>

            {/* Kunci Jawaban Config */}
            <div className="p-8 bg-primary/5 rounded-[32px] border border-primary/10 space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-primary block">Tentukan Kunci Jawaban (Kunjau):</span>
              <div className="flex flex-wrap gap-4">
                {pgQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-primary/10">
                    <span className="text-[10px] font-black text-on-surface-variant">S{idx + 1}:</span>
                    <select
                      value={kunjau[q.originalIndex] || "A"}
                      onChange={e => handleKunjauChange(q.originalIndex, e.target.value)}
                      className="bg-transparent font-black text-primary text-xs outline-none cursor-pointer"
                    >
                      {["A", "B", "C", "D", "E"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Spreadsheet */}
            <div className="overflow-x-auto rounded-[32px] border border-white/40">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                    <th className="px-8 py-5 w-80 min-w-[320px]">Nama Siswa</th>
                    {pgQuestions.map((_, idx) => (
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
                      {pgQuestions.map((q) => (
                        <td key={q.originalIndex} className="px-4 py-4 text-center">
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
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-error hover:bg-error/10 p-2 rounded-xl transition-all"
                          title="Hapus Siswa"
                        >
                          <iconify-icon icon="lucide:x" width="16"  ></iconify-icon>
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
                className="btn-glass-primary px-8 py-4 rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest shadow-primary/20 hover:scale-105 transition-all"
              >
                <iconify-icon icon="lucide:sparkles" width="16"  ></iconify-icon>
                Lihat Hasil Analisis
              </button>
            </div>
          </div>
        ) : (
          /* Analysis Dashboard Mode */
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
              
              <div className="premium-card p-8 col-span-2 md:col-span-4 lg:col-span-2 flex items-center justify-between relative overflow-hidden group">
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
              <div className="lg:col-span-8 premium-card p-10">
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
                 <div className="premium-card p-10 flex-1 flex flex-col">
                    <h4 className="text-xl font-black mb-10 tracking-tight text-on-surface-variant/40 uppercase tracking-widest text-[10px]">Ringkasan Kelayakan</h4>
                    <div className="space-y-8 flex-1">
                       <SummaryItem icon={<iconify-icon icon="lucide:check-circle2" className="text-green-600" ></iconify-icon>} label="Sangat Layak" count={`${analytics?.items?.filter((i:any) => i.status === "Sangat Layak").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Sangat Layak").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-green-500/10" />
                       <SummaryItem icon={<iconify-icon icon="lucide:alert-triangle" className="text-yellow-600" ></iconify-icon>} label="Perlu Revisi" count={`${analytics?.items?.filter((i:any) => i.status === "Revisi" || i.status === "Layak").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Revisi" || i.status === "Layak").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-yellow-500/10" />
                       <SummaryItem icon={<iconify-icon icon="lucide:x-circle" className="text-error" ></iconify-icon>} label="Buang" count={`${analytics?.items?.filter((i:any) => i.status === "Buang").length || 0} Soal`} percent={`${Math.round((analytics?.items?.filter((i:any) => i.status === "Buang").length || 0) / (analytics?.items?.length || 1) * 100)}%`} color="bg-error/10" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Response Matrix */}
            <div className="premium-card overflow-hidden">
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
                                    {sub.studentName}
                                </td>
                                {pgQuestions.map((q: any, qIdx: number) => {
                                    const ans = sub.answers?.[q.originalIndex];
                                    const isCorrect = ans?.isCorrect;
                                    const displayLabel = ans?.label || "-";
                                    
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
                                <td className="px-8 py-4 text-right font-black text-primary">{Math.round(sub.mcScore)}</td>
                            </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Detailed Table */}
            <div className="premium-card overflow-hidden">
               <div className="p-10 border-b border-white/40 flex flex-col md:flex-row justify-between items-center gap-6">
                  <h4 className="text-3xl font-black tracking-tight">Analisis Butir Detail</h4>
                  <div className="flex gap-4 w-full md:w-auto">
                     <div className="relative flex-1 md:w-64 group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                            <iconify-icon icon="lucide:search" width="16"  ></iconify-icon>
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
        <motion.div className="premium-card-interactive p-10">
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

function TableRow({ no, snippet, difficulty, diffColor, dp, dpColor, validity, validityColor, recommendation, statusColor, status, distractorData }: any) {
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
                    {distractorData && (
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
                    <button className="p-3 bg-white/40 rounded-xl hover:text-primary transition-all backdrop-blur-md border border-white/60 shadow-sm"><iconify-icon icon="lucide:eye" width="18"  ></iconify-icon></button>
                    <button className="p-3 bg-white/40 rounded-xl hover:text-on-surface transition-all backdrop-blur-md border border-white/60 shadow-sm"><iconify-icon icon="lucide:more-vertical" width="18"  ></iconify-icon></button>
                </div>
            </td>
        </tr>
    );
}
