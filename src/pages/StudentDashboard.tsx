import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Clock, ArrowRight, Dna, History, Calculator, Search, Bell, Sparkles, Users, Loader2, Key, Plus, FileText, ClipboardList, Video, BookOpen, Link2 } from "lucide-react";
import Layout from "@/src/components/Layout";
import { cn } from "@/src/lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";

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
  score?: number | null;
  type?: string;
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
  const [averageScore, setAverageScore] = useState<number>(0);
  const [materials, setMaterials] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const hasAutoJoined = useRef(false);

  useEffect(() => {
    let unsubscribeSubmissions: () => void = () => {};
    let unsubscribeAssignments: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchMyClasses();

        // Listen to submissions in real-time
        const qSubmissions = query(
          collection(db, "submissions"),
          where("studentId", "==", user.uid)
        );
        unsubscribeSubmissions = onSnapshot(qSubmissions, () => {
          fetchMyClasses();
        });

        // Listen to assignments in real-time
        const qAssignments = collection(db, "assignments");
        unsubscribeAssignments = onSnapshot(qAssignments, () => {
          fetchMyClasses();
        });
      } else {
        setClasses([]);
        setAssignments([]);
        setIsLoading(false);
        unsubscribeSubmissions();
        unsubscribeAssignments();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSubmissions();
      unsubscribeAssignments();
    };
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
        const submissionsMap: Record<string, any> = {};
        querySnapshotSubmissions.docs.forEach(doc => {
            const data = doc.data();
            submissionsMap[data.assignmentId] = data;
        });

        // 4. Map status to assignments
        const assignmentsWithStatus = assignmentsList
            .filter(assignment => {
                if (assignment.type === "exam") {
                    const sub = submissionsMap[assignment.id];
                    return sub?.status === "graded";
                }
                return true;
            })
            .map(assignment => {
                const sub = submissionsMap[assignment.id];
                return {
                    ...assignment,
                    status: sub?.status || "belum_dikumpulkan",
                    score: sub?.totalScore !== undefined ? sub.totalScore : (sub?.mcScore !== undefined ? sub.mcScore : null)
                };
            }) as AssignmentData[];

        setAssignments(assignmentsWithStatus);

        const gradedAssignments = assignmentsWithStatus.filter(a => a.status === 'graded' && a.score !== null && a.score !== undefined);
        if (gradedAssignments.length > 0) {
            const sum = gradedAssignments.reduce((acc, curr) => acc + Number(curr.score), 0);
            setAverageScore(Math.round(sum / gradedAssignments.length));
        } else {
            setAverageScore(0);
        }

        // Fetch Materials
        const qMaterials = query(collection(db, "materials"), where("classId", "in", classIds));
        const querySnapshotMaterials = await getDocs(qMaterials);
        const materialsList = querySnapshotMaterials.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        materialsList.sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tB - tA;
        });
        setMaterials(materialsList);

        // Fetch Meetings
        const qMeetings = query(collection(db, "meetings"), where("classId", "in", classIds));
        const querySnapshotMeetings = await getDocs(qMeetings);
        const meetingsList = querySnapshotMeetings.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        meetingsList.sort((a: any, b: any) => {
          const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return tB - tA;
        });
        setMeetings(meetingsList);
      } else {
        setAssignments([]);
        setMaterials([]);
        setMeetings([]);
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
            <h1 className="text-5xl lg:text-6xl font-black mb-0 tracking-tighter text-on-surface">Hello, <span className="text-primary italic">{auth.currentUser?.displayName || "Student"}!</span></h1>
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
          <QuickStat label="Rata-rata Nilai" value={averageScore.toString()} icon={<Sparkles size={24} />} delay={0.3} color="bg-primary/20 text-primary" />
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
                      className="glass rounded-[40px] p-6 md:p-8 border-white/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 group hover:shadow-2xl transition-all"
                    >
                      <div className="flex items-center gap-5 md:gap-6 flex-1 w-full">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                          <FileText className="text-primary" size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 truncate">
                            {classes.find(c => c.id === assignment.classId)?.name || 'Kelas'}
                          </p>
                          <h3 className="text-lg md:text-xl font-black tracking-tight group-hover:text-primary transition-colors truncate">{assignment.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-on-surface-variant/60">
                            <Clock size={12} className="shrink-0" />
                            <span className="text-xs font-medium truncate">Tenggat: {assignment.dueDate?.toDate ? assignment.dueDate.toDate().toLocaleDateString() : assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Tidak ada'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6 w-full md:w-auto mt-2 md:mt-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge status={assignment.status || "belum_dikumpulkan"} />
                          {assignment.status === 'graded' && assignment.score !== null && assignment.score !== undefined && (
                              <div className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl font-black text-sm whitespace-nowrap">
                                  Nilai: {assignment.score}/100
                              </div>
                          )}
                        </div>
                        <Link 
                          to={`/assignment/${assignment.id}`}
                          className="w-full md:w-auto px-8 py-4 bg-on-surface text-surface rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-on-surface-variant transition-all whitespace-nowrap"
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
                        <span className="text-3xl font-black text-primary uppercase">{cls.name.charAt(0)}</span>
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
                      assignments
                        .filter(a => !a.title.toLowerCase().includes("meeting") && !a.title.toLowerCase().includes("materi"))
                        .slice(0, 3)
                        .map(a => (
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

             {/* GMeet/Meetings Section */}
             <div className="glass rounded-[48px] p-10 border-white/60">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black tracking-tight">Link Meeting Kelas</h3>
                   <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Video size={16} className="text-red-500" />
                   </div>
                </div>
                <div className="space-y-6">
                   {meetings.length > 0 ? (
                      meetings.slice(0, 3).map(m => (
                        <div key={m.id} className="p-5 bg-white/40 border border-white/60 rounded-3xl hover:shadow-lg transition-all space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                              {m.platform || "GMeet"}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-1">
                              <Clock size={10} />
                              {m.startTime ? new Date(m.startTime).toLocaleDateString() : "Setiap Saat"}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                              {classes.find(c => c.id === m.classId)?.name || 'Kelas'}
                            </p>
                            <h4 className="font-bold text-on-surface line-clamp-1">{m.title}</h4>
                          </div>
                          <a 
                            href={m.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full block py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all"
                          >
                            Gabung Meeting
                          </a>
                        </div>
                      ))
                   ) : (
                      <p className="text-center text-on-surface-variant/40 text-xs py-8">Belum ada meeting terjadwal.</p>
                   )}
                </div>
             </div>

             {/* Materials Section */}
             <div className="glass rounded-[48px] p-10 border-white/60">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black tracking-tight">Materi Terbaru</h3>
                   <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <BookOpen size={16} className="text-secondary" />
                    </div>
                 </div>
                 <div className="space-y-6">
                    {materials.length > 0 ? (
                       materials.slice(0, 3).map(m => (
                         <div key={m.id} className="p-5 bg-white/40 border border-white/60 rounded-3xl hover:shadow-lg transition-all flex items-start gap-4">
                           <div className="w-10 h-10 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                             {m.type === "file" ? <FileText className="text-secondary" size={20} /> : <Link2 className="text-secondary" size={20} />}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-black text-secondary uppercase tracking-widest">
                               {classes.find(c => c.id === m.classId)?.name || 'Kelas'}
                             </p>
                             <h4 className="font-bold text-on-surface truncate">{m.title}</h4>
                             {m.message && <p className="text-xs text-on-surface-variant/70 mt-1 line-clamp-1">{m.message}</p>}
                             <a 
                               href={m.url} 
                               target="_blank" 
                               rel="noreferrer"
                               className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-secondary uppercase tracking-widest hover:underline"
                             >
                               Buka Materi <ArrowRight size={10} />
                             </a>
                           </div>
                         </div>
                       ))
                    ) : (
                       <p className="text-center text-on-surface-variant/40 text-xs py-8">Belum ada materi dibagikan.</p>
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
