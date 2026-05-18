import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  ClipboardList, 
  Sparkles, 
  CheckCircle2, 
  GraduationCap,
  LayoutDashboard,
  Plus,
  ArrowLeft,
  Settings,
  MoreVertical,
  Zap,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  FileCheck,
  Loader2,
  Search,
  BookOpen,
  Video,
  Link as LinkIcon,
  File
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import Layout from "@/src/components/Layout";
import CreateAssignmentModal from "@/src/components/CreateAssignmentModal";
import CreateMaterialModal from "@/src/components/CreateMaterialModal";
import CreateMeetingModal from "@/src/components/CreateMeetingModal";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { doc, onSnapshot, collection, query, where, getDocs, documentId } from "firebase/firestore";

type Tab = "overview" | "assignments" | "materials" | "meetings" | "students" | "generator" | "reviews" | "grading";

export default function ClassroomManagement() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "overview";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [classroom, setClassroom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState(false);
  const [isCreateMaterialModalOpen, setIsCreateMaterialModalOpen] = useState(false);
  const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false);

  const sortByNewest = (items: any[]) => {
    return [...items].sort((a, b) => {
      const aTime = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
      const bTime = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
      return bTime - aTime;
    });
  };

  useEffect(() => {
    if (!classId) return;
    const unsubscribe = onSnapshot(doc(db, "classes", classId), (doc) => {
      if (doc.exists()) {
        setClassroom({ id: doc.id, ...doc.data() });
      } else {
        navigate("/dashboard");
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to classroom:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [classId, navigate]);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
    if (classroom && (activeTab === "reviews" || activeTab === "grading" || activeTab === "assignments" || activeTab === "overview" || activeTab === "students" || activeTab === "materials" || activeTab === "meetings")) {
        fetchAllClassData();
    }
  }, [classroom?.studentIds?.length, activeTab, setSearchParams]);

  const fetchAllClassData = async (forceRefresh = false) => {
    if (!classroom) return;
    setIsDataLoading(true);
    console.log("Fetching class data for studentIds:", classroom.studentIds);
    try {
        // Fetch Students
        const studentIds = classroom.studentIds || [];
        if (studentIds.length > 0) {
            // Firestore 'in' limit is 30.
            const chunks = [];
            for (let i = 0; i < studentIds.length; i += 30) {
              chunks.push(studentIds.slice(i, i + 30));
            }
            
            const studentData: any[] = [];
            for (const chunk of chunks) {
              const studentsQuery = query(collection(db, "users"), where(documentId(), "in", chunk));
              const studentSnaps = await getDocs(studentsQuery);
              console.log(`Fetched ${studentSnaps.size} students for chunk:`, chunk);
              studentData.push(...studentSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            setStudents(studentData);
        } else {
            console.log("No studentIds found in classroom document");
            setStudents([]);
        }

        // Fetch Assignments
        const assignmentsQuery = query(
            collection(db, "assignments"), 
            where("classId", "==", classroom.id)
        );
        const assignSnaps = await getDocs(assignmentsQuery);
        const fetchedAssignments = sortByNewest(assignSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
        setAssignments(fetchedAssignments);

        // Fetch Materials
        const materialsQuery = query(
            collection(db, "materials"),
            where("classId", "==", classroom.id)
        );
        const materialSnaps = await getDocs(materialsQuery);
        setMaterials(sortByNewest(materialSnaps.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Fetch Meetings
        const meetingsQuery = query(
            collection(db, "meetings"),
            where("classId", "==", classroom.id)
        );
        const meetingSnaps = await getDocs(meetingsQuery);
        setMeetings(sortByNewest(meetingSnaps.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Fetch Submissions
        if (fetchedAssignments.length > 0) {
            const assignIds = fetchedAssignments.map(a => a.id);
            const assignChunks = [];
            for (let i = 0; i < assignIds.length; i += 30) {
              assignChunks.push(assignIds.slice(i, i + 30));
            }

            const subData: any[] = [];
            for (const chunk of assignChunks) {
              const submissionsQuery = query(
                  collection(db, "submissions"), 
                  where("assignmentId", "in", chunk)
              );
              const subSnaps = await getDocs(submissionsQuery);
              subData.push(...subSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            setSubmissions(subData);
        }
    } catch (error) {
        console.error("Error fetching class data:", error);
    } finally {
        setIsDataLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
             <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant/40">Membuka kelas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="teacher">
      <div className="flex h-full min-h-[calc(100vh-6rem)]">
        {/* Internal Classroom Sidebar */}
        <aside className="w-72 glass border-r flex flex-col p-6 space-y-2 hidden lg:flex">
          <div className="px-4 py-6 mb-4">
            <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-2">{classroom?.subject}</h2>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">{classroom?.name}</h1>
          </div>
          
          <nav className="space-y-1">
            <ClassNavButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<LayoutDashboard size={20} />} label="Ringkasan" />
            <ClassNavButton active={activeTab === "assignments"} onClick={() => setActiveTab("assignments")} icon={<ClipboardList size={20} />} label="Tugas" />
            <ClassNavButton active={activeTab === "materials"} onClick={() => setActiveTab("materials")} icon={<BookOpen size={20} />} label="Materi" />
            <ClassNavButton active={activeTab === "meetings"} onClick={() => setActiveTab("meetings")} icon={<Video size={20} />} label="Pertemuan Virtual" />
            <ClassNavButton active={activeTab === "students"} onClick={() => setActiveTab("students")} icon={<Users size={20} />} label="Siswa" />
            <div className="my-4 h-px bg-on-surface-variant/5 mx-4" />
            <ClassNavButton active={activeTab === "generator"} onClick={() => setActiveTab("generator")} icon={<Sparkles size={20} />} label="Generator AI" />
            <ClassNavButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} icon={<CheckCircle2 size={20} />} label="Review Pengumpulan" />
            <ClassNavButton active={activeTab === "grading"} onClick={() => setActiveTab("grading")} icon={<FileCheck size={20} />} label="Nilai" />
          </nav>

          <div className="mt-auto p-4 bg-primary/5 rounded-[24px] border border-primary/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Kode Kelas</span>
            </div>
            <div className="bg-white/60 text-center py-3 rounded-xl font-mono font-black text-xl tracking-widest text-on-surface select-all">
              {classroom?.joinCode}
            </div>
            <p className="text-[9px] text-center mt-3 font-bold text-on-surface-variant/40 uppercase">Undang siswa dengan kode ini</p>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-6 md:py-10">
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "overview" && <OverviewSection classroom={classroom} setActiveTab={setActiveTab} assignments={assignments} materials={materials} meetings={meetings} submissions={submissions} students={students} onCreateAssignment={() => setIsCreateAssignmentModalOpen(true)} />}
                {activeTab === "assignments" && <AssignmentsSection classroom={classroom} assignments={assignments} onCreate={() => setIsCreateAssignmentModalOpen(true)} />}
                {activeTab === "materials" && <MaterialsSection classroom={classroom} materials={materials} onCreate={() => setIsCreateMaterialModalOpen(true)} />}
                {activeTab === "meetings" && <MeetingsSection classroom={classroom} meetings={meetings} onCreate={() => setIsCreateMeetingModalOpen(true)} />}
                {activeTab === "students" && <StudentsSection classroom={classroom} students={students} assignments={assignments} submissions={submissions} onRefresh={() => fetchAllClassData(true)} isLoading={isDataLoading} />}
                {activeTab === "generator" && <GeneratorSection classroom={classroom} />}
                {activeTab === "reviews" && <ReviewSection classroom={classroom} assignments={assignments} submissions={submissions} students={students} isLoading={isDataLoading} />}
                {activeTab === "grading" && <GradingSection classroom={classroom} students={students} assignments={assignments} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <CreateAssignmentModal 
        isOpen={isCreateAssignmentModalOpen}
        onClose={() => setIsCreateAssignmentModalOpen(false)}
        onCreated={fetchAllClassData}
        classId={classId!}
        subject={classroom?.subject || "Umum"}
      />

      <CreateMaterialModal 
        isOpen={isCreateMaterialModalOpen}
        onClose={() => setIsCreateMaterialModalOpen(false)}
        onCreated={fetchAllClassData}
        classId={classId!}
      />

      <CreateMeetingModal 
        isOpen={isCreateMeetingModalOpen}
        onClose={() => setIsCreateMeetingModalOpen(false)}
        onCreated={fetchAllClassData}
        classId={classId!}
      />
    </Layout>
  );
}

function ClassNavButton({ active, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm",
        active 
          ? "bg-primary text-white shadow-xl shadow-primary/10" 
          : "text-on-surface-variant/60 hover:bg-on-surface/5 hover:text-on-surface"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function OverviewSection({ classroom, setActiveTab, assignments, materials, meetings, submissions, students, onCreateAssignment }: any) {
  const pendingCount = submissions.filter((s: any) => s.status === "submitted").length;
  const gradedCount = submissions.filter((s: any) => s.status === "graded").length;
  const recentSubmissions = useMemo(() => {
    return submissions
        .map((sub: any) => {
            const student = students.find((s: any) => s.id === sub.studentId);
            const assignment = assignments.find((a: any) => a.id === sub.assignmentId);
            return {
                ...sub,
                studentName: student?.displayName || "Siswa tidak dikenal",
                studentEmail: student?.email,
                assignmentTitle: assignment?.title || "Tugas tidak dikenal"
            };
        })
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 3);
  }, [submissions, students, assignments]);

  return (
    <div className="space-y-8 md:space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">Dashboard Kelas</p>
           <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Selamat datang kembali, {auth.currentUser?.displayName?.split(' ')[0]}</h2>
        </div>
        <div className="flex w-full md:w-auto gap-3">
           <button 
             onClick={onCreateAssignment}
             className="w-full md:w-auto px-6 py-4 md:py-3 bg-on-surface text-surface rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-on-surface-variant transition-all"
           >
              <Plus size={18} />
              Tugas Baru
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard icon={<Users size={24} className="text-blue-500" />} label="Total Siswa" value={students.length} trend="Terdaftar" />
        <StatCard icon={<ClipboardList size={24} className="text-primary" />} label="Tugas" value={assignments.length} trend="Aktif" />
        <StatCard icon={<BookOpen size={24} className="text-secondary" />} label="Materi" value={materials.length} trend="Dibagikan" />
        <StatCard icon={<Video size={24} className="text-red-500" />} label="Pertemuan" value={meetings.length} trend="Sesi virtual" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass rounded-[48px] p-10 border-white/60">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
               <Clock size={20} className="text-primary" />
               Aktivitas Terbaru
            </h3>
            <button onClick={() => setActiveTab("reviews")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Lihat Semua</button>
          </div>
          
          <div className="space-y-6">
             {recentSubmissions.length > 0 ? (
               recentSubmissions.map((sub: any) => (
                 <Link 
                    key={sub.id} 
                    to={`/assignment/${sub.assignmentId}?studentId=${sub.studentId}`}
                    className="flex items-center justify-between p-4 bg-on-surface/5 rounded-2xl hover:bg-on-surface/10 transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white border border-on-surface/10 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.studentId}`} alt="avatar" />
                       </div>
                       <div>
                          <p className="text-sm font-bold">{sub.studentName}</p>
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{sub.assignmentTitle} • {sub.createdAt?.toDate().toLocaleDateString()}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                 </Link>
               ))
             ) : (
               <div className="text-center py-10 opacity-40">
                  <Clock size={40} className="mx-auto mb-4" />
                  <p className="text-sm font-bold">Belum ada aktivitas</p>
               </div>
             )}
          </div>
        </div>
        
        <div className="glass rounded-[48px] p-10 border-white/60">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
             <Video size={20} className="text-red-500" />
             Sesi Terjadwal
          </h3>
          <div className="space-y-4">
            {meetings.length > 0 ? (
              meetings.slice(0, 2).map((m: any) => (
                <div key={m.id} className="p-6 bg-red-500/5 rounded-[32px] border border-red-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-on-surface">{m.title}</p>
                    <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest mt-1">
                      {m.startTime ? new Date(m.startTime).toLocaleString() : "Sedang Berlangsung"}
                    </p>
                  </div>
                  <a href={m.link} target="_blank" rel="noreferrer" className="px-5 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Gabung</a>
                </div>
              ))
            ) : (
              <div className="p-8 bg-on-surface/5 rounded-[32px] text-center">
                <p className="text-sm font-medium text-on-surface-variant">Tidak ada sesi zoom terdekat.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MaterialsSection({ classroom, materials, onCreate }: any) {
  return (
    <div className="space-y-10">
       <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tight">Materi Pembelajaran</h2>
          <button 
            onClick={onCreate}
            className="btn-primary shadow-xl shadow-primary/20 flex items-center gap-2 bg-secondary"
          >
             <Plus size={18} />
             Bagikan Materi
          </button>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {materials.map((m: any) => (
            <div key={m.id} className="glass rounded-[40px] p-8 border-white/60 hover:shadow-2xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                  {m.type === "file" ? <File className="text-secondary" size={24} /> : <LinkIcon className="text-secondary" size={24} />}
                </div>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{m.createdAt?.toDate?.() ? m.createdAt.toDate().toLocaleDateString() : "Baru saja"}</p>
              </div>
              <h3 className="text-xl font-black mb-2 group-hover:text-secondary transition-colors">{m.title}</h3>
              {m.message && <p className="text-sm text-on-surface-variant/70 mb-6 line-clamp-2">{m.message}</p>}
              
              <a 
                href={m.url} 
                target="_blank" 
                rel="noreferrer"
                className="w-full block py-4 bg-secondary text-white rounded-2xl text-center text-[10px] font-black uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-105 transition-all"
              >
                Buka Materi
              </a>
            </div>
          ))}
          {materials.length === 0 && (
            <div className="md:col-span-2 py-20 text-center glass rounded-[40px] border-dashed border-2">
              <BookOpen size={48} className="mx-auto text-on-surface-variant/20 mb-4" />
              <p className="text-on-surface-variant/40 font-black uppercase tracking-widest text-sm">Belum ada materi dibagikan</p>
            </div>
          )}
       </div>
    </div>
  )
}

function MeetingsSection({ classroom, meetings, onCreate }: any) {
  return (
    <div className="space-y-10">
       <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tight">Kelas Virtual</h2>
          <button 
            onClick={onCreate}
            className="btn-primary shadow-xl shadow-primary/20 flex items-center gap-2 bg-red-500"
          >
             <Plus size={18} />
             Jadwalkan Meeting
          </button>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {meetings.map((m: any) => (
            <div key={m.id} className="glass rounded-[40px] p-8 border-white/60 hover:shadow-2xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Video size={100} />
              </div>
              <div className="flex justify-between items-start mb-6">
                <div className="px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                  {m.platform}
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant/40">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {m.startTime ? new Date(m.startTime).toLocaleString() : "Setiap Saat"}
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-black mb-6">{m.title}</h3>
              
              <div className="flex gap-4">
                 <a 
                   href={m.link} 
                   target="_blank" 
                   rel="noreferrer"
                   className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 text-center hover:scale-105 transition-all"
                 >
                   Mulai Sesi
                 </a>
                 <button 
                   onClick={() => navigator.clipboard.writeText(m.link)}
                   className="px-6 py-4 bg-on-surface/5 hover:bg-on-surface/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   Salin Link
                 </button>
              </div>
            </div>
          ))}
          {meetings.length === 0 && (
            <div className="md:col-span-2 py-20 text-center glass rounded-[40px] border-dashed border-2">
              <Video size={48} className="mx-auto text-on-surface-variant/20 mb-4" />
              <p className="text-on-surface-variant/40 font-black uppercase tracking-widest text-sm">Belum ada jadwal meeting</p>
            </div>
          )}
       </div>
    </div>
  )
}

function AssignmentsSection({ classroom, assignments, onCreate }: any) {
  return (
    <div className="space-y-10">
       <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tight">Tugas</h2>
          <button 
            onClick={onCreate}
            className="btn-primary shadow-xl shadow-primary/20 flex items-center gap-2"
          >
             <Plus size={18} />
             Tugas Baru
          </button>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {assignments.map((a: any) => (
            <div key={a.id} className="glass rounded-[40px] p-8 border-white/60 hover:shadow-2xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <FileText className="text-primary" size={24} />
                </div>
                <button className="p-2 text-on-surface-variant/40 hover:text-on-surface transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
              <h3 className="text-xl font-black mb-1 group-hover:text-primary transition-colors">{a.title}</h3>
              <p className="text-xs font-medium text-on-surface-variant/60 mb-4">{a.subject}</p>
              
              {a.dueDate && (
                <div className="flex items-center gap-2 mb-6 text-on-surface-variant/40">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Tenggat: {a.dueDate?.toDate?.() ? a.dueDate.toDate().toLocaleString() : new Date(a.dueDate).toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="flex gap-4">
                 <Link to={`/assignment/${a.id}`} className="flex-1 py-3 bg-on-surface/5 hover:bg-on-surface/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center">Buka</Link>
                 <Link to={`/analytics/${a.id}`} className="flex-1 py-3 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center">Analitik</Link>
              </div>
            </div>
          ))}
       </div>
    </div>
  )
}

function ReviewSection({ classroom, assignments, submissions, students, isLoading }: any) {
  const [filter, setFilter] = useState<"pending" | "reviewed">("pending");

  const enrichedSubmissions = useMemo(() => {
    return submissions.map((sub: any) => {
        const student = students.find((s: any) => s.id === sub.studentId);
        const assignment = assignments.find((a: any) => a.id === sub.assignmentId);
        return {
            ...sub,
            studentName: student?.displayName || "Siswa tidak dikenal",
            studentEmail: student?.email,
            assignmentTitle: assignment?.title || "Tugas tidak dikenal"
        };
    }).filter((sub: any) => {
        if (filter === "pending") return sub.status === "submitted";
        return sub.status === "graded";
    }).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [submissions, students, assignments, filter, classroom]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  return (
    <div className="space-y-8 md:space-y-10">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Review Pengumpulan</h2>
            <p className="text-on-surface-variant/60 font-medium mt-1">Nilai dan tinjau pekerjaan siswa.</p>
          </div>
          <div className="flex bg-on-surface/5 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
             <button onClick={() => setFilter("pending")} className={cn("px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", filter === "pending" ? "bg-white shadow-sm" : "text-on-surface-variant/40")}>Menunggu ({submissions.filter((s:any)=>s.status==="submitted").length})</button>
             <button onClick={() => setFilter("reviewed")} className={cn("px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", filter === "reviewed" ? "bg-white shadow-sm" : "text-on-surface-variant/40")}>Sudah Dinilai ({submissions.filter((s:any)=>s.status==="graded").length})</button>
          </div>
       </div>

       <div className="space-y-6">
          {enrichedSubmissions.length > 0 ? (
            enrichedSubmissions.map((sub: any) => (
                <div key={sub.id} className="glass rounded-[40px] p-6 md:p-8 border-white/60 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-2xl transition-all group">
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-on-surface/5 overflow-hidden border-2 border-white">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.studentId}`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold">{sub.studentName}</h4>
                        <p className="text-xs font-bold text-primary">{sub.assignmentTitle}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-8">
                      <div className="text-right hidden md:block">
                         <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Dikumpulkan</p>
                         <p className="text-sm font-bold">{sub.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                      <Link 
                        to={`/assignment/${sub.assignmentId}?studentId=${sub.studentId}`}
                        className="px-10 py-4 bg-on-surface text-surface rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl"
                      >
                        Tinjau
                      </Link>
                   </div>
                </div>
            ))
          ) : (
            <div className="text-center py-32 rounded-[48px] border-2 border-dashed border-on-surface/10">
                <CheckCircle2 className="mx-auto text-on-surface-variant/20 mb-4" size={40} />
                <p className="text-on-surface-variant/40 font-bold uppercase tracking-widest text-xs">Belum ada pengumpulan {filter === "pending" ? "yang menunggu" : "yang sudah dinilai"}</p>
            </div>
          )}
       </div>
    </div>
  )
}

function StudentsSection({ students, assignments, submissions, onRefresh, isLoading }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  const filteredStudents = useMemo(() => {
    return students.filter((student: any) => {
      // Name filter
      const matchesName = student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesName) return false;

      // Submission status filter
      if (statusFilter === "all") return true;

      const studentSubmissions = submissions.filter((s: any) => s.studentId === student.id);
      const isCompleted = assignments.length > 0 && studentSubmissions.length >= assignments.length;

      if (statusFilter === "completed") return isCompleted;
      if (statusFilter === "pending") return !isCompleted;

      return true;
    });
  }, [students, searchTerm, statusFilter, assignments, submissions]);

  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Siswa Aktif</h2>
            <p className="text-on-surface-variant/60 font-medium mt-1">Kelola dan pantau progres siswa.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
             <button 
                onClick={onRefresh}
                disabled={isLoading}
                className="p-3 bg-on-surface/5 hover:bg-on-surface/10 rounded-2xl transition-all flex items-center justify-center disabled:opacity-50"
                title="Muat ulang data"
             >
                <Clock size={20} className={cn(isLoading && "animate-spin")} />
             </button>
             <div className="relative group flex-grow sm:flex-grow-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Cari siswa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-12 pr-6 py-3 bg-on-surface/5 border-2 border-transparent focus:border-primary outline-none rounded-2xl font-bold text-sm transition-all shadow-sm"
                />
             </div>
             
             <select 
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-6 py-3 bg-on-surface/5 border-2 border-transparent focus:border-primary outline-none rounded-2xl font-bold text-sm transition-all shadow-sm cursor-pointer"
             >
                <option value="all">Semua Status</option>
                <option value="completed">Semua Selesai</option>
                <option value="pending">Belum Selesai</option>
             </select>
          </div>
       </div>

       {filteredStudents.length > 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((s: any) => {
              const studentSubmissions = submissions.filter((sub: any) => sub.studentId === s.id);
              const progress = assignments.length > 0 ? Math.round((studentSubmissions.length / assignments.length) * 100) : 0;
              
              return (
                <div key={s.id} className="glass p-6 md:p-8 rounded-[40px] border-white/60 hover:shadow-2xl transition-all group relative overflow-hidden">
                   <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-on-surface/5 border-2 border-white overflow-hidden shadow-sm">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="font-black text-lg truncate group-hover:text-primary transition-colors">{s.displayName}</p>
                         <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest truncate">{s.email}</p>
                      </div>
                   </div>
                   
                   <div className="mt-8 space-y-3 relative z-10">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                         <span className="text-on-surface-variant/60">Progres</span>
                         <span className="text-primary">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-on-surface/5 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-primary"
                         />
                      </div>
                      <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest text-right">
                         {studentSubmissions.length} / {assignments.length} Pengumpulan
                      </p>
                   </div>

                   <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                      <Users size={80} />
                   </div>
                </div>
              );
            })}
         </div>
       ) : (
         <div className="text-center py-32 rounded-[48px] border-2 border-dashed border-on-surface/10 bg-on-surface/[0.02]">
            <Users className="mx-auto text-on-surface-variant/20 mb-6" size={48} />
            <h3 className="text-xl font-bold">Siswa tidak ditemukan</h3>
            <p className="text-on-surface-variant/40 font-medium max-w-xs mx-auto mt-2">Coba ubah filter atau kata kunci pencarian.</p>
            <button 
              onClick={onRefresh}
              className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
               Cek Ulang Data Siswa
            </button>
         </div>
       )}
    </div>
  )
}

function GradingSection({ classroom, students, assignments }: any) {
  return (
    <div className="space-y-10">
       <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tight">Buku Nilai</h2>
          <button className="px-6 py-3 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl text-xs font-black uppercase tracking-widest">Ekspor</button>
       </div>
       <div className="glass rounded-[48px] overflow-hidden border-white/60">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-on-surface/5">
                   <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-on-surface-variant/60">Siswa</th>
                   <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-on-surface-variant/60">Nilai Akhir</th>
                </tr>
             </thead>
             <tbody>
                {students.map((s: any) => (
                  <tr key={s.id} className="border-t border-on-surface/5">
                     <td className="px-8 py-6 font-bold">{s.displayName}</td>
                     <td className="px-8 py-6"><span className="px-3 py-1 bg-green-500/10 text-green-600 rounded font-black text-xs">Belum Ada</span></td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  )
}

function GeneratorSection({ classroom }: any) {
  return (
    <div className="glass rounded-[56px] p-16 border-white/60 flex flex-col items-center text-center space-y-8 relative overflow-hidden bg-primary/5">
       <Sparkles className="text-primary/20 w-32 h-32 absolute -top-10 -right-10 rotate-12" />
       
       <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-primary/10 relative z-10">
          <Sparkles className="text-primary" size={48} />
       </div>
       
       <div className="space-y-4 relative z-10 max-w-2xl">
          <h3 className="text-4xl font-black tracking-tight italic text-primary">Generator Soal AI</h3>
          <p className="text-xl text-on-surface-variant font-medium leading-relaxed">
             Gunakan kecerdasan buatan untuk membuat soal berkualitas tinggi berdasarkan <span className="font-bold text-on-surface">Taksonomi Bloom</span> dan topik <span className="font-bold text-on-surface">{classroom?.subject}</span> secara instan.
          </p>
       </div>

       <div className="flex flex-col sm:flex-row gap-6 relative z-10 w-full max-w-lg">
          <Link 
            to={`/generator?classId=${classroom?.id}`}
            className="flex-1 bg-primary text-white py-5 rounded-[24px] font-black tracking-widest text-xs uppercase flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-primary/20"
          >
             <Zap size={18} fill="currentColor" />
             Buka Generator AI
          </Link>
          <button className="flex-1 btn-glass px-8 py-5 rounded-[24px] font-black tracking-widest text-xs uppercase border-white/60">
             Lihat Panduan
          </button>
       </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: any) {
  return (
    <div className="glass rounded-[40px] p-8 border-white/60">
      <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white/80">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-1">{label}</p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-black tracking-tighter">{value}</span>
          <p className="text-[10px] font-bold text-green-500 pb-1.5 uppercase tracking-tighter">{trend}</p>
        </div>
      </div>
    </div>
  );
}
