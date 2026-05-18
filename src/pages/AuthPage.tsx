import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Loader2, GraduationCap } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle, ensureUserProfile, auth } from "@/src/lib/firebase";
import type { UserRole } from "@/src/lib/firebase";

const PENDING_ROLE_KEY = "edugrade:pending-login-role";

function getPendingRole(): UserRole | null {
  const role = window.localStorage.getItem(PENDING_ROLE_KEY);
  return role === "teacher" || role === "student" ? role : null;
}

function setPendingRole(role: UserRole) {
  window.localStorage.setItem(PENDING_ROLE_KEY, role);
}

function clearPendingRole() {
  window.localStorage.removeItem(PENDING_ROLE_KEY);
}

function getDashboardPath(role: UserRole) {
  return role === "teacher" ? "/dashboard" : "/student/dashboard";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setAuthMessage("");
      try {
        const role = await ensureUserProfile(user, getPendingRole() || undefined);

        if (role) {
          clearPendingRole();
          navigate(getDashboardPath(role), { replace: true });
        } else {
          setAuthMessage("Akun Google sudah masuk. Pilih Guru atau Siswa untuk menyelesaikan profil.");
        }
      } catch (error) {
        console.error("Error checking auth state:", error);
        setAuthMessage("Login Google berhasil, tapi profil Edugrade belum bisa dibuat. Coba pilih role lagi.");
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async (selectedRole: UserRole) => {
    setIsLoading(true);
    setAuthMessage("");
    setPendingRole(selectedRole);

    try {
      const user = await signInWithGoogle();
      const finalRole = await ensureUserProfile(user, selectedRole);

      if (!finalRole) {
        throw new Error("Profil pengguna belum memiliki role.");
      }

      clearPendingRole();

      navigate(getDashboardPath(finalRole), { replace: true });
    } catch (error) {
      console.error(error);
      setAuthMessage("Gagal menyelesaikan login. Pastikan Google Auth aktif dan aturan Firestore sudah terpasang.");
      alert("Gagal menyelesaikan login. Coba lagi atau cek konfigurasi Firebase.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-student-primary/5 rounded-full blur-[120px] -ml-64 -mb-64" />

      <header className="mb-16 text-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
             <GraduationCap className="text-primary" size={28} />
          </div>
          <span className="text-4xl font-black tracking-tighter text-on-surface">Edu<span className="text-primary">grade</span></span>
          <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase border border-primary/20">AI POWERED</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-5xl font-extrabold max-w-2xl leading-tight tracking-tight text-on-surface"
        >
          Mulai masa depan pendidikan yang lebih cerdas.
        </motion.h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl z-10 px-4">
        {/* Teacher Option */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -8 }}
          className="glass rounded-[48px] p-12 flex flex-col h-full border-white/40 shadow-2xl shadow-primary/5 group theme-teacher"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl shadow-primary/10">
            <span className="text-4xl">👩‍🏫</span>
          </div>
          <h2 className="text-4xl font-black mb-6 tracking-tight">Saya Seorang Guru</h2>
          <p className="text-on-surface-variant/80 text-xl mb-10 flex-grow leading-relaxed font-medium">
            Otomasi pembuatan soal, analisis mendalam, dan kelola kelas Anda dengan asisten AI.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => handleGoogleLogin("teacher")}
              disabled={isLoading}
              className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-xl flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : <GoogleLogo />}
              Masuk Dengan Google
            </button>
            <p className="text-center text-sm font-bold text-outline uppercase tracking-widest opacity-50">Portal Akademik Guru</p>
          </div>
        </motion.div>

        {/* Student Option */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -8 }}
          className="glass rounded-[48px] p-12 flex flex-col h-full border-white/40 shadow-2xl shadow-student-primary/5 group theme-student"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-xl shadow-primary/10">
            <span className="text-4xl">👨‍🎓</span>
          </div>
          <h2 className="text-4xl font-black mb-6 tracking-tight">Saya Seorang Siswa</h2>
          <p className="text-on-surface-variant/80 text-xl mb-10 flex-grow leading-relaxed font-medium">
            Akses materi, kerjakan tugas, dan lihat progres belajar Anda secara real-time.
          </p>
          <div className="space-y-6">
            <button 
              onClick={() => handleGoogleLogin("student")}
              disabled={isLoading}
              className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-xl flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : <GoogleLogo />}
              Masuk Dengan Google
            </button>
            <p className="text-center text-sm font-bold text-outline uppercase tracking-widest opacity-50 mb-2">Portal Belajar Siswa</p>
          </div>
        </motion.div>
      </div>

      {authMessage && (
        <p className="mt-8 max-w-xl text-center text-sm font-bold text-primary z-10">
          {authMessage}
        </p>
      )}

      <footer className="mt-20 text-center text-on-surface-variant/60 text-sm max-w-sm font-medium z-10">
        Dengan masuk, Anda menyetujui <Link to="#" className="text-primary hover:underline font-bold">Terms</Link> & <Link to="#" className="text-primary hover:underline font-bold">Privacy</Link> Edugrade.
        <p className="mt-4 opacity-40 uppercase tracking-[0.2em] text-[10px] font-black">© 2024 Edugrade AI Technology</p>
      </footer>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
