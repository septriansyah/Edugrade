import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, GraduationCap, ClipboardList, ArrowRight, Loader2, X, School, Zap, CheckCircle2, Clock, AlertCircle, Lightbulb, TrendingDown, Target, ZapIcon, Search } from "lucide-react";
import Layout from "@/src/components/Layout";
import CreateClassModal from "@/src/components/CreateClassModal";
import { cn } from "@/src/lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router-dom";

interface ClassData {
  id: string;
  name: string;
  subject: string;
  joinCode: string;
  studentCount: number;
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeAssignmentsCount, setActiveAssignmentsCount] = useState(0);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchDashboardData();
      } else {
        setClasses([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      // 1. Fetch Classes
      const classesQuery = query(collection(db, "classes"), where("teacherId", "==", auth.currentUser.uid));
      const classesSnap = await getDocs(classesQuery);
      const classesData = classesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        studentCount: (doc.data() as any).studentIds?.length || 0
      })) as ClassData[];
      setClasses(classesData);
      
      const totalStudents = classesData.reduce((acc, curr) => acc + curr.studentCount, 0);
      setTotalStudentsCount(totalStudents);

      if (classesData.length > 0) {
        // 2. Fetch Assignments
        const classIds = classesData.map(c => c.id);
        const assignmentsQuery = query(collection(db, "assignments"), where("classId", "in", classIds));
        const assignmentsSnap = await getDocs(assignmentsQuery);
        setActiveAssignmentsCount(assignmentsSnap.size);
        const assignmentsData = assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Fetch Recent Submissions
        const assignmentIds = assignmentsData.map(a => a.id);
        if (assignmentIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < assignmentIds.length; i += 30) {
                chunks.push(assignmentIds.slice(i, i + 30));
            }
            
            const allSubmissions: any[] = [];
            for (const chunk of chunks) {
                const subQuery = query(collection(db, "submissions"), where("assignmentId", "in", chunk));
                const subSnap = await getDocs(subQuery);
                allSubmissions.push(...subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            // Fetch student names for these submissions
            const uniqueStudentIds = [...new Set(allSubmissions.map(s => s.studentId))];
            const studentMap: Record<string, any> = {};
            
            if (uniqueStudentIds.length > 0) {
                const studentChunks = [];
                for (let i = 0; i < uniqueStudentIds.length; i += 30) {
                    studentChunks.push(uniqueStudentIds.slice(i, i + 30));
                }
                for (const chunk of studentChunks) {
                    const sQuery = query(collection(db, "users"), where("__name__", "in", chunk));
                    const sSnap = await getDocs(sQuery);
                    sSnap.docs.forEach(d => {
                        studentMap[d.id] = d.data();
                    });
                }
            }

            const enrichedActivity = allSubmissions.map(sub => {
                const student = studentMap[sub.studentId];
                const assignment = assignmentsData.find(a => a.id === sub.assignmentId) as any;
                const classroom = classesData.find(c => c.id === assignment?.classId);
                return {
                    id: sub.id,
                    studentName: student?.displayName || "Siswa tidak dikenal",
                    className: classroom?.name || "Kelas tidak dikenal",
                    assignmentTitle: assignment?.title || "Tugas tidak dikenal",
                    status: sub.status === "graded" ? "Selesai" : "Menunggu Review",
                    score: sub.totalScore || "-",
                    createdAt: sub.createdAt
                };
            }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);

            setRecentActivity(enrichedActivity);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout userType="teacher">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-black mb-3 tracking-tighter text-on-surface">Dashboard <span className="text-primary italic">Guru</span></h1>
            <p className="text-on-surface-variant/70 text-xl font-medium">Tinjau performa mengajar dan insight kelas Anda.</p>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsModalOpen(true)}
            className="btn-glass-primary py-5 px-10 rounded-[28px] text-xl flex items-center gap-4 shadow-2xl shadow-primary/20"
          >
            <Plus size={28} strokeWidth={3} />
            Buat Kelas Baru
          </motion.button>
        </div>

        {/* Bento Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard 
            icon={<ClipboardList size={32} className="text-secondary" />} 
            label="Tugas Aktif" 
            value={activeAssignmentsCount.toString()} 
            bgColor="bg-secondary/10" 
            delay={0.1}
          />
          <StatCard 
            icon={<Users size={32} className="text-blue-500" />} 
            label="Total Siswa" 
            value={totalStudentsCount.toString()} 
            bgColor="bg-blue-500/10" 
            delay={0.2}
          />
          <StatCard 
            icon={<GraduationCap size={32} className="text-primary" />} 
            label="Kelas Diampu" 
            value={classes.length.toString()} 
            bgColor="bg-primary/10" 
            delay={0.3}
          />
        </div>

        {/* Classes Section */}
        <div>
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-4xl font-black tracking-tight mb-2">Daftar Kelas</h2>
              <p className="text-on-surface-variant font-medium">Kelola akses dan pantau progres tiap kelas.</p>
            </div>
            <button className="text-primary font-bold flex items-center gap-2 hover:underline text-lg">
              Lihat Semua
              <ArrowRight size={20} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={60} />
            </div>
          ) : classes.length === 0 ? (
            <div className="glass rounded-[48px] p-20 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                 <School className="text-primary/20" size={48} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Belum Ada Kelas</h3>
              <p className="text-on-surface-variant max-w-sm mb-10">Klik tombol di atas untuk mulai membuat kelas pertama Anda.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-glass-primary px-8"
              >
                Buat Kelas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {classes.map((cls, idx) => (
                <ClassCard 
                  key={cls.id}
                  id={cls.id}
                  title={cls.name}
                  subject={cls.subject}
                  joinCode={cls.joinCode}
                  studentCount={cls.studentCount}
                  delay={0.1 * idx}
                />
              ))}
            </div>
          )}
        </div>

        {/* AI Insight Recommendations Section */}
        <section className="space-y-10">
          <div className="flex justify-between items-end px-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Lightbulb size={18} className="text-primary" />
                </div>
                <h2 className="text-4xl font-black tracking-tight">AI Insights & Rekomendasi</h2>
              </div>
              <p className="text-on-surface-variant font-medium">Berdasarkan data performa terbaru, AI menyarankan fokus pada area berikut.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <RecommendationCard 
                type="Perbaikan"
                title="Review Performa"
                desc="Beberapa siswa mungkin memerlukan perhatian lebih pada materi tertentu. Tinjau analisis butir soal untuk detail lebih mendalam."
                icon={<TrendingDown className="text-error" size={24} />}
                tag="Insight"
                tagColor="bg-error/10 text-error border-error/20"
                actionLabel="Analisis Butir Soal"
                to="/analytics"
             />
             <RecommendationCard 
                type="Pengayaan"
                title="Optimasi Materi"
                desc="Gunakan Generator Soal AI untuk menciptakan variasi soal baru yang menantang bagi siswa yang sudah mahir."
                icon={<Target className="text-secondary" size={24} />}
                tag="Tips"
                tagColor="bg-secondary/10 text-secondary border-secondary/20"
                actionLabel="Buka Generator AI"
                to="/generator"
             />
          </div>
        </section>

        {/* Student Progress Monitoring Section */}
        <section className="space-y-10">
          <div className="flex justify-between items-end px-4">
            <div>
              <h2 className="text-4xl font-black tracking-tight mb-2">Pemantauan Progress Siswa</h2>
              <p className="text-on-surface-variant font-medium">Lacak penyelesaian tugas dan skor terbaru siswa secara real-time.</p>
            </div>
          </div>

          <div className="glass rounded-[48px] overflow-hidden border-white/40 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/40 bg-white/40">
                    <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Nama Siswa</th>
                    <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Kelas</th>
                    <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Tugas Terakhir</th>
                    <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Status</th>
                    <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <ProgressRow 
                        key={activity.id}
                        name={activity.studentName} 
                        className={activity.className} 
                        assignment={activity.assignmentTitle} 
                        status={activity.status} 
                        score={activity.score.toString()} 
                        statusColor={activity.status === "Selesai" ? "text-green-500" : "text-blue-500"} 
                        statusIcon={activity.status === "Selesai" ? <CheckCircle2 size={16} /> : <Clock size={16} />} 
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-10 py-20 text-center text-on-surface-variant/40 font-medium">
                        Belum ada aktivitas siswa terbaru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* AI Promo Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[56px] p-12 lg:p-16 relative overflow-hidden flex flex-col lg:flex-row items-center gap-16 border-white/40"
        >
          <div className="z-10 flex-1">
            <div className="flex items-center gap-2 mb-6">
               <span className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-black uppercase tracking-widest">Mesin Baru</span>
               <Zap className="text-primary" size={20} fill="currentColor" />
            </div>
            <h3 className="text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-none">Otomatiskan Bank Soal dengan AI</h3>
            <p className="text-xl text-on-surface-variant/80 mb-12 max-w-xl font-medium leading-relaxed">
              Buat paket soal kompleks berdasarkan Taksonomi Bloom dalam hitungan detik. Personalisasi sesuai kurikulum Anda.
            </p>
            <button className="bg-primary text-white px-10 py-5 rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-xl flex items-center gap-4">
              Coba Generator Soal
              <ArrowRight size={24} />
            </button>
          </div>
          
          <div className="relative z-10 w-full lg:w-[400px] h-[300px] rounded-[40px] overflow-hidden shadow-2xl ring-8 ring-white/20 group">
             <img 
              src="https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=1000&auto=format&fit=crop" 
              alt="Pusat AI"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent flex items-end p-8">
               <p className="text-white font-black text-2xl">Mesin Cerdas v3.0</p>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -mr-64 -mt-64" />
        </motion.div>
      </div>

      {/* Create Class Modal */}
      <CreateClassModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={fetchDashboardData}
      />
    </Layout>
  );
}

function ClassCard({ id, title, subject, joinCode, studentCount, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-[44px] overflow-hidden group border-white/60 shadow-xl"
    >
      <div className="relative h-44 bg-primary/5 flex items-center justify-center border-b border-white/30">
        <div className="text-center">
            <h4 className="text-3xl font-black text-on-surface tracking-tighter mb-1 px-6">{title}</h4>
            <p className="text-primary font-bold uppercase text-xs tracking-widest">{subject}</p>
        </div>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/40 p-5 rounded-3xl border border-white/60">
            <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">Kode</p>
            <p className="text-xl font-black text-primary tracking-widest">{joinCode}</p>
          </div>
          <div className="bg-white/40 p-5 rounded-3xl border border-white/60">
            <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">Siswa</p>
            <p className="text-xl font-black text-secondary">{studentCount}</p>
          </div>
        </div>
        <Link 
          to={`/class/${id}`}
          className="w-full py-5 bg-on-surface text-surface rounded-[24px] font-bold hover:bg-on-surface-variant transition-all text-lg active:scale-95 flex items-center justify-center gap-2"
        >
          Buka Manajemen Kelas
          <ArrowRight size={20} />
        </Link>
      </div>
    </motion.div>
  );
}

function ProgressRow({ name, className, assignment, status, score, statusColor, statusIcon }: any) {
    return (
        <tr className="hover:bg-white/20 transition-colors">
            <td className="px-10 py-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">
                        {name.charAt(0)}
                    </div>
                    <span className="font-bold text-lg">{name}</span>
                </div>
            </td>
            <td className="px-10 py-8 font-medium text-on-surface-variant">{className}</td>
            <td className="px-10 py-8 font-bold text-on-surface tracking-tight">{assignment}</td>
            <td className="px-10 py-8">
                <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-widest", statusColor)}>
                    {statusIcon}
                    {status}
                </div>
            </td>
            <td className="px-10 py-8">
                <span className={cn(
                    "px-4 py-2 rounded-xl font-black text-lg",
                    score !== "-" ? "bg-primary/10 text-primary" : "bg-black/5 text-on-surface-variant/20"
                )}>
                    {score}
                </span>
            </td>
        </tr>
    );
}

function RecommendationCard({ type, title, desc, icon, tag, tagColor, actionLabel, to = "#" }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="glass p-10 rounded-[48px] border-white/40 shadow-2xl relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
             <span className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", tagColor)}>{tag}</span>
             <h4 className="text-sm font-black text-on-surface-variant/40 mt-1 uppercase tracking-widest">{type}</h4>
          </div>
        </div>
      </div>
      
      <h3 className="text-3xl font-black mb-4 tracking-tight underline decoration-primary/10">{title}</h3>
      <p className="text-lg text-on-surface-variant/80 font-medium mb-10 leading-relaxed">
        {desc}
      </p>

      <Link to={to} className="flex items-center gap-3 font-black text-primary hover:gap-5 transition-all text-lg group/btn w-fit">
        {actionLabel}
        <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
      </Link>

      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
    </motion.div>
  );
}

function StatCard({ icon, label, value, bgColor, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -8 }}
      className="glass p-8 rounded-[44px] border-white/40 shadow-xl shadow-on-surface/5 group"
    >
      <div className={cn("w-20 h-20 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500", bgColor)}>
        {icon}
      </div>
      <p className="text-on-surface-variant/60 font-black uppercase tracking-widest text-xs mb-2">{label}</p>
      <h3 className="text-6xl font-black tracking-tight">{value}</h3>
    </motion.div>
  );
}


