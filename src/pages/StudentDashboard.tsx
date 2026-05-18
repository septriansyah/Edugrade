import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Clock, ArrowRight, Dna, History, Calculator, Search, Bell, Sparkles, Users, Loader2, Key, Plus, FileText, ClipboardList } from "lucide-react";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";

interface ClassData {
  id: string;
  name: string;
  subject: string;
}

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  dueDate: any;
  classId: string;
  status?: string;
}

interface SubmissionData {
  assignmentId: string;
  status: string;
}

export default function StudentDashboard() {
  const location = useLocation();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const hasAutoJoined = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchMyClasses();
      } else {
        setClasses([]);
        setAssignments([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle auto-join from AuthPage
  useEffect(() => {
    const code = location.state?.autoJoinCode;
    if (code && !hasAutoJoined.current && auth.currentUser) {
      hasAutoJoined.current = true;
      handleJoinByCode(code);
    }
  }, [location.state, auth.currentUser]);

  const handleJoinByCode = async (codeToJoin: string) => {
    setIsJoining(true);
    const path = "classes";
    try {
      const q = query(collection(db, path), where("joinCode", "==", codeToJoin.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert("Kode kelas tidak valid.");
        return;
      }

      const classDoc = querySnapshot.docs[0];
      const classData = classDoc.data();
      const studentIds = classData.studentIds || [];
      
      if (studentIds.includes(auth.currentUser!.uid)) {
        alert("Anda sudah terdaftar di kelas ini.");
        setJoinCode("");
        setIsJoining(false);
        return;
      }

      await updateDoc(doc(db, path, classDoc.id), {
        studentIds: arrayUnion(auth.currentUser!.uid)
      });

      setJoinCode("");
      await fetchMyClasses();
      alert(`Berhasil bergabung dengan kelas: ${classData.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsJoining(false);
    }
  };

  const fetchMyClasses = async () => {
    if (!auth.currentUser) return;
    const classesPath = "classes";
    const assignmentsPath = "assignments";
    const submissionsPath = "submissions";
    
    try {
      // 1. Fetch Classes
      const qClasses = query(collection(db, classesPath), where("studentIds", "array-contains", auth.currentUser.uid));
      const querySnapshotClasses = await getDocs(qClasses);
      const classesData = querySnapshotClasses.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassData[];
      setClasses(classesData);

      if (classesData.length > 0) {
        const classIds = classesData.map(c => c.id);
        
        // 2. Fetch Assignments for these classes
        const qAssignments = query(collection(db, assignmentsPath), where("classId", "in", classIds));
        const querySnapshotAssignments = await getDocs(qAssignments);
        const assignmentsList = querySnapshotAssignments.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AssignmentData[];

        // 3. Fetch Submissions for this student
        const qSubmissions = query(collection(db, submissionsPath), where("studentId", "==", auth.currentUser.uid));
        const querySnapshotSubmissions = await getDocs(qSubmissions);
        const submissionsMap: Record<string, string> = {};
        querySnapshotSubmissions.docs.forEach(doc => {
            const data = doc.data();
            submissionsMap[data.assignmentId] = data.status;
        });

        // 4. Map status to assignments
        const assignmentsWithStatus = assignmentsList.map(assignment => ({
            ...assignment,
            status: submissionsMap[assignment.id] || "belum_dikumpulkan"
        })) as AssignmentData[];

        setAssignments(assignmentsWithStatus);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      // We don't call handleFirestoreError here to avoid multiple alerts if one fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinClass = () => {
    if (!joinCode) return;
    handleJoinByCode(joinCode);
  };

  return (
    <Layout userType="student">
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                 <Sparkles className="text-primary" size={20} />
              </div>
              <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Siswa Portal</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-0 tracking-tighter text-on-surface">Hello, <span className="text-primary italic">Student!</span></h1>
          </motion.div>
          
          <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64 group">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="KODE KELAS" 
                  className="w-full bg-white/40 backdrop-blur-md border-2 border-white/60 focus:border-primary outline-none px-6 py-4 rounded-[24px] font-black tracking-widest placeholder:text-outline/40 uppercase transition-all"
                />
                <Key className="absolute right-6 top-4.5 text-outline/40" size={20} />
             </div>
             <button 
                onClick={handleJoinClass}
                disabled={isJoining || !joinCode}
                className="btn-glass-primary px-8 flex items-center justify-center gap-3 disabled:opacity-50"
             >
                {isJoining ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                Gabung
             </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <QuickStat label="Pelajaran" value={classes.length.toString()} icon={<Calculator size={24} />} delay={0.1} />
          <QuickStat label="Tugas Selesai" value={assignments.filter(a => a.status === 'graded').length.toString()} icon={<History size={24} />} delay={0.2} />
          <QuickStat label="Rata-rata Nilai" value="0.0" icon={<Sparkles size={24} />} delay={0.3} color="bg-primary/20 text-primary" />
          <QuickStat label="Tugas" value={assignments.length.toString()} icon={<Users size={24} />} delay={0.4} />
        </div>

        {/* Content Tabs/Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            <section className="space-y-8">
              <h2 className="text-3xl font-black tracking-tight">Tugas Mendatang</h2>
              {assignments.length === 0 ? (
                <div className="glass rounded-[48px] p-16 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-on-surface/5 rounded-full flex items-center justify-center mb-6">
                    <ClipboardList className="text-on-surface-variant/20" size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Belum ada tugas</h3>
                  <p className="text-on-surface-variant text-sm mt-2">Tetap pantau kelas Anda untuk tugas terbaru.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {assignments.map((assignment, idx) => (
                    <motion.div 
                      key={assignment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass rounded-[40px] p-8 border-white/60 flex flex-col md:flex-row justify-between items-center gap-8 group hover:shadow-2xl transition-all"
                    >
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                          <FileText className="text-primary" size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                            {classes.find(c => c.id === assignment.classId)?.name || 'Kelas'}
                          </p>
                          <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{assignment.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-on-surface-variant/60">
                            <Clock size={12} />
                            <span className="text-xs font-medium">Tenggat: {assignment.dueDate?.toDate ? assignment.dueDate.toDate().toLocaleDateString() : assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Tidak ada'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <StatusBadge status={assignment.status || "belum_dikumpulkan"} />
                        <Link 
                          to={`/assignment/${assignment.id}`}
                          className="px-8 py-4 bg-on-surface text-surface rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-on-surface-variant transition-all whitespace-nowrap"
                        >
                          Buka Tugas
                          <ArrowRight size={18} />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-8">
              <h2 className="text-3xl font-black tracking-tight">Kelas Saya</h2>
              {isLoading ? (
                <div className="flex justify-center py-24">
                  <Loader2 className="animate-spin text-primary" size={60} />
                </div>
              ) : classes.length === 0 ? (
                <div className="glass rounded-[48px] p-20 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                    <Search className="text-primary/20" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold">Belum ada kelas diikuti</h3>
                  <p className="text-on-surface-variant font-medium mt-2">Gunakan fitur join di atas untuk masuk ke kelas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {classes.map((cls, idx) => (
                    <motion.div 
                      key={cls.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass rounded-[44px] p-8 border-white/60 hover:shadow-2xl transition-all group"
                    >
                      <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <Dna className="text-primary" size={32} />
                      </div>
                      <h3 className="text-2xl font-black mb-2 tracking-tight group-hover:text-primary transition-colors">{cls.name}</h3>
                      <p className="text-on-surface-variant font-medium">{cls.subject}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-4 space-y-8">
             <div className="glass rounded-[48px] p-10 border-white/60">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-2xl font-black tracking-tight">Timeline</h3>
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell size={16} className="text-primary" />
                   </div>
                </div>
                <div className="space-y-8">
                   {assignments.length > 0 ? (
                      assignments.slice(0, 3).map(a => (
                        <TimelineItem 
                          key={a.id}
                          time={a.dueDate?.toDate || a.dueDate ? "TENGGAT" : "TERBARU"}
                          title={a.title}
                          desc={`Tenggat: ${a.dueDate?.toDate ? a.dueDate.toDate().toLocaleDateString() : a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'Belum ditentukan'}`}
                          isNew={a.status === 'belum_dikumpulkan'}
                        />
                      ))
                   ) : (
                      <p className="text-center text-on-surface-variant/40 font-medium py-10">Belum ada aktivitas terbaru.</p>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getColors = () => {
    switch (status) {
      case 'graded': return "bg-green-500/10 text-green-500 border-green-500/20";
      case 'submitted': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-on-surface/5 text-on-surface-variant/40 border-on-surface/10";
    }
  };

  const labels: Record<string, string> = {
    graded: "SUDAH DINILAI",
    submitted: "SUDAH DIKUMPULKAN",
    belum_dikumpulkan: "BELUM DIKUMPULKAN",
    "Not Submitted": "BELUM DIKUMPULKAN"
  };

  return (
    <span className={cn(
      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
      getColors()
    )}>
      {labels[status] || status.toUpperCase()}
    </span>
  );
}

function QuickStat({ label, value, icon, delay, color }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className={cn("glass p-8 rounded-[40px] border-white/40 shadow-xl shadow-on-surface/5 flex flex-col items-center text-center group", color)}
    >
      <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center mb-6 text-on-surface-variant group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-[0.2em] mb-1">{label}</p>
      <h4 className="text-4xl font-black text-on-surface tracking-tighter">{value}</h4>
    </motion.div>
  );
}

function TimelineItem({ time, title, desc, isNew }: any) {
  return (
    <div className="flex gap-6 items-start group">
       <div className="flex flex-col items-center pt-1.5">
          <div className={cn("w-3 h-3 rounded-full border-2 border-primary bg-white group-hover:scale-125 transition-transform", isNew && "bg-primary ring-4 ring-primary/20")} />
          <div className="w-0.5 h-16 bg-outline-variant/30 mt-2" />
       </div>
       <div>
          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">{time}</p>
          <h4 className="font-bold text-on-surface">{title}</h4>
          <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}
