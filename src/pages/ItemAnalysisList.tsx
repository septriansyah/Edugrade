import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { 
  BarChart3, 
  Search, 
  ChevronRight, 
  ClipboardList, 
  Users, 
  Clock,
  Loader2,
  FileText
} from "lucide-react";
import Layout from "@/src/components/Layout";
import { db, auth } from "@/src/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { cn } from "@/src/lib/utils";

export default function ItemAnalysisList() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAssignments();
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAssignments = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "assignments"), 
        where("teacherId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                 <BarChart3 className="text-primary" size={20} />
              </div>
              <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Data & Insight</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tighter text-on-surface">Analisis <span className="text-primary italic">Butir Soal</span></h1>
            <p className="text-xl text-on-surface-variant max-w-2xl font-medium leading-relaxed">
              Pilih paket soal untuk melihat analisis Tingkat Kesukaran (TK), Daya Beda (DP), dan efektivitas pengecoh.
            </p>
          </motion.div>

          <div className="flex gap-4 w-full md:w-auto relative shrink-0">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="btn-glass-primary bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-primary/20 hover:scale-105 transition-all w-full md:w-auto"
            >
              <span>+ Analisis Mandiri</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white/90 backdrop-blur-md border border-white/60 shadow-2xl rounded-3xl p-4 z-50 flex flex-col gap-2">
                <Link 
                  to="/analytics/blank/pg"
                  className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-2xl transition-all group/item"
                >
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover/item:bg-primary group-hover/item:text-white transition-all">
                    <BarChart3 size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-on-surface">Pilihan Ganda (PG)</p>
                    <p className="text-[10px] text-on-surface-variant/60 font-semibold">Gunakan kunci jawaban & opsi</p>
                  </div>
                </Link>
                <Link 
                  to="/analytics/blank/essay"
                  className="flex items-center gap-3 p-3 hover:bg-secondary/5 rounded-2xl transition-all group/item"
                >
                  <div className="w-8 h-8 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center group-hover/item:bg-secondary group-hover/item:text-white transition-all">
                    <ClipboardList size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-on-surface">Soal Esai</p>
                    <p className="text-[10px] text-on-surface-variant/60 font-semibold">Analisis berdasarkan skor esai</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Search & Stats */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
           <div className="relative flex-1 group w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors" size={20} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/40 border border-white focus:border-primary outline-none pl-14 pr-6 py-5 rounded-[24px] font-bold transition-all text-lg shadow-xl shadow-on-surface/5" 
                placeholder="Cari judul tugas atau mata pelajaran..." 
              />
           </div>
           <div className="glass px-10 py-5 rounded-[24px] border-white/60 flex items-center gap-4 shrink-0 shadow-xl shadow-on-surface/5">
              <div className="text-right">
                 <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none">Total Paket</p>
                 <p className="text-2xl font-black text-on-surface">{assignments.length}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <ClipboardList size={20} className="text-primary" />
              </div>
           </div>
        </div>

        {/* List Section */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
             <Loader2 className="animate-spin text-primary" size={48} />
             <p className="font-bold text-on-surface-variant">Memuat daftar tugas...</p>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAssignments.map((a, idx) => (
              <motion.div 
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="glass group block rounded-[44px] border-white/60 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden bg-white/30">
                  <div className="p-10">
                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                      <FileText className="text-primary" size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2 tracking-tight group-hover:text-primary transition-colors leading-tight">{a.title}</h3>
                    <p className="text-sm font-bold text-on-surface-variant/60 mb-6">{a.subject}</p>
                    
                    {/* Question counts */}
                    <div className="flex gap-2 mb-8 flex-wrap">
                      {(() => {
                        const qs = a.questions || [];
                        const pg = qs.filter((q: any) => q.type === "Multiple Choice").length;
                        const essay = qs.filter((q: any) => q.type === "Essay").length;
                        return (
                          <>
                            {pg > 0 && (
                              <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                                {pg} PG
                              </span>
                            )}
                            {essay > 0 && (
                              <span className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-wider">
                                {essay} ESAI
                              </span>
                            )}
                            {pg === 0 && essay === 0 && (
                              <span className="text-xs text-on-surface-variant/60 font-bold">Belum ada soal</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Direct Links */}
                    <div className="flex flex-col gap-3 pt-6 border-t border-on-surface/5">
                      {(() => {
                        const qs = a.questions || [];
                        const pg = qs.filter((q: any) => q.type === "Multiple Choice").length;
                        const essay = qs.filter((q: any) => q.type === "Essay").length;
                        return (
                          <>
                            {pg > 0 && (
                              <Link 
                                to={`/analytics/pg/${a.id}`}
                                className="w-full bg-primary text-white py-3 px-5 rounded-xl font-black tracking-wider text-[10px] uppercase flex items-center justify-between hover:brightness-110 transition-all shadow-md shadow-primary/10"
                              >
                                <span>Analisis PG</span>
                                <ChevronRight size={14} />
                              </Link>
                            )}
                            {essay > 0 && (
                              <Link 
                                to={`/analytics/essay/${a.id}`}
                                className="w-full bg-secondary text-white py-3 px-5 rounded-xl font-black tracking-wider text-[10px] uppercase flex items-center justify-between hover:brightness-110 transition-all shadow-md shadow-secondary/10"
                              >
                                <span>Analisis Esai</span>
                                <ChevronRight size={14} />
                              </Link>
                            )}
                            {pg > 0 && essay > 0 && (
                              <Link 
                                to={`/analytics/${a.id}`}
                                className="text-center text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 hover:text-primary transition-colors py-1"
                              >
                                Lihat Opsi Gateway
                              </Link>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-150 transition-transform">
                    <BarChart3 size={100} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-[56px] p-20 flex flex-col items-center text-center border-white/60 bg-white/40">
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
               <ClipboardList className="text-primary/20" size={48} />
            </div>
            <h3 className="text-2xl font-bold mb-4">Tugas Tidak Ditemukan</h3>
            <p className="text-on-surface-variant max-w-sm font-medium">Anda belum memiliki tugas atau belum ada tugas yang sesuai dengan pencarian.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
