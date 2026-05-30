import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

import Layout from "@/src/components/Layout";
import { db, auth } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ItemAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAssignment();
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [id]);

  const fetchAssignment = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, "assignments", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const questions = data.questions || [];
        const hasPG = questions.some((q: any) => q.type === "Multiple Choice");
        const hasEssay = questions.some((q: any) => q.type === "Essay");

        if (hasPG && !hasEssay) {
          navigate(`/analytics/pg/${id}`, { replace: true });
        } else if (!hasPG && hasEssay) {
          navigate(`/analytics/essay/${id}`, { replace: true });
        } else {
          setAssignment({ id: docSnap.id, ...data });
        }
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout userType="teacher">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
           <iconify-icon icon="lucide:loader2" width="48" className="animate-spin text-primary"  ></iconify-icon>
           <p className="font-bold text-on-surface-variant">Memuat data analisis...</p>
        </div>
      </Layout>
    );
  }

  if (!assignment) {
    return (
      <Layout userType="teacher">
        <div className="p-12 text-center">
           <h2 className="text-2xl font-black">Tugas tidak ditemukan</h2>
           <Link to="/analytics" className="text-primary font-bold mt-4 block">Kembali ke Daftar</Link>
        </div>
      </Layout>
    );
  }

  const questions = assignment.questions || [];
  const pgCount = questions.filter((q: any) => q.type === "Multiple Choice").length;
  const essayCount = questions.filter((q: any) => q.type === "Essay").length;

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12 min-h-[80vh] flex flex-col justify-center">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-3xl mb-4 text-primary">
            <iconify-icon icon="lucide:layers" width="32"  ></iconify-icon>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-on-surface">
            Pilih Tipe <span className="text-primary italic">Analisis</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl mx-auto font-medium leading-relaxed">
            Tugas <span className="font-bold text-on-surface">"{assignment.title}"</span> memiliki tipe soal campuran. Silakan pilih jenis analisis yang ingin Anda lihat.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto w-full">
          {/* PG Card */}
          <motion.div 
            whileHover={{ y: -8 }}
            className="glass group block rounded-[44px] border-white/60 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden bg-white/40 cursor-pointer"
            onClick={() => navigate(`/analytics/pg/${id}`)}
          >
            <div className="p-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <iconify-icon icon="lucide:bar-chart3" width="28" className="text-primary"  ></iconify-icon>
                </div>
                <h3 className="text-2xl font-black mb-2 tracking-tight group-hover:text-primary transition-colors leading-tight">Analisis Pilihan Ganda</h3>
                <p className="text-sm font-bold text-on-surface-variant/60 mb-8">{pgCount} Butir Soal PG</p>
                <p className="text-xs font-medium text-on-surface-variant/80 leading-relaxed">
                  Lihat indeks kesukaran, daya beda kelompok unggul-asor, efektivitas pengecoh jawaban, serta hitung reliabilitas KR-20.
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-8">
                 <span className="text-xs font-black text-primary uppercase tracking-widest">Buka Analisis PG</span>
                 <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <iconify-icon icon="lucide:chevron-right" width="20"  ></iconify-icon>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* Essay Card */}
          <motion.div 
            whileHover={{ y: -8 }}
            className="glass group block rounded-[44px] border-white/60 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden bg-white/40 cursor-pointer"
            onClick={() => navigate(`/analytics/essay/${id}`)}
          >
            <div className="p-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-14 h-14 bg-secondary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <iconify-icon icon="lucide:clipboard-list" width="28" className="text-secondary"  ></iconify-icon>
                </div>
                <h3 className="text-2xl font-black mb-2 tracking-tight group-hover:text-secondary transition-colors leading-tight">Analisis Esai</h3>
                <p className="text-sm font-bold text-on-surface-variant/60 mb-8">{essayCount} Butir Soal Esai</p>
                <p className="text-xs font-medium text-on-surface-variant/80 leading-relaxed">
                  Pantau rata-rata skor per butir soal, daya pembeda essay, sebaran nilai siswa, dan reliabilitas tes menggunakan formula Cronbach Alpha.
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-8">
                 <span className="text-xs font-black text-secondary uppercase tracking-widest">Buka Analisis Esai</span>
                 <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all">
                    <iconify-icon icon="lucide:chevron-right" width="20"  ></iconify-icon>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-black text-on-surface-variant hover:text-primary transition-colors">
            <iconify-icon icon="lucide:arrow-left" width="16"  ></iconify-icon> Kembali ke Daftar Tugas
          </Link>
        </div>
      </div>
    </Layout>
  );
}
