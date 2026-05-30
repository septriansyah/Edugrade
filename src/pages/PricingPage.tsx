import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

import Logo from "@/src/img/Logo.svg";
import BgAuth from "@/src/img/BG_AUTH.png";
import Asset1 from "@/src/img/Asset 1.png";
import Asset2 from "@/src/img/Asset 2.png";
import Asset3 from "@/src/img/Asset 3.png";
import Asset4 from "@/src/img/Asset 4.png";
import Asset5 from "@/src/img/Asset 5.png";
import Asset6 from "@/src/img/Asset 6.png";
import { auth, db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function PricingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePayment = async () => {
    if (!auth.currentUser) {
      navigate("/auth");
      return;
    }

    if (userProfile?.isPremium) {
      alert("Anda sudah berlangganan paket Premium!");
      return;
    }

    setIsProcessing(true);
    try {
      // Panggil backend untuk mendapatkan token transaksi
      const response = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || "User",
          userEmail: auth.currentUser.email || "user@edugrade.app"
        })
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.error || "Gagal membuat transaksi");
      }

      // Buka popup Midtrans Snap
      if (typeof (window as any).snap !== "undefined") {
        (window as any).snap.pay(data.token, {
          onSuccess: async function(result: any) {
            try {
              // Update status premium di Firebase
              if (auth.currentUser) {
                 const userRef = doc(db, "users", auth.currentUser.uid);
                 await updateDoc(userRef, {
                   isPremium: true,
                   aiTokens: (userProfile?.aiTokens || 0) + 1000
                 });
                 setUserProfile((prev: any) => ({ ...prev, isPremium: true, aiTokens: (prev?.aiTokens || 0) + 1000 }));
                 setShowSuccessModal(true);
              }
            } catch (e) {
               console.error("Gagal update Firestore:", e);
               alert("Pembayaran berhasil namun gagal memperbarui status. Silakan hubungi admin.");
            }
          },
          onPending: function(result: any) {
            alert("Menunggu pembayaran Anda!");
          },
          onError: function(result: any) {
            alert("Pembayaran gagal!");
          },
          onClose: function () {
            // User menutup popup
          }
        });
      } else {
        alert("Sistem pembayaran Midtrans Snap tidak terdeteksi. Silakan coba sesaat lagi.");
      }
    } catch (error: any) {
      alert(error.message || "Gagal memproses pembayaran");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden z-0">
      {/* Background Image */}
      <img 
        src={BgAuth} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-10" 
      />
      {/* Decorative background blur & Assets */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

      <motion.img src={Asset5} animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-32 left-10 lg:left-32 w-24 md:w-32 h-24 md:h-32 object-contain opacity-60 z-0 pointer-events-none drop-shadow-xl hidden md:block" />
      <motion.img src={Asset2} animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }} className="absolute bottom-20 left-10 lg:left-40 w-32 md:w-40 h-32 md:h-40 object-contain opacity-50 z-0 pointer-events-none drop-shadow-xl hidden md:block" />
      <motion.img src={Asset6} animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 0.5 }} className="absolute top-1/2 right-10 lg:right-24 w-28 md:w-36 h-28 md:h-36 object-contain opacity-60 z-0 pointer-events-none drop-shadow-xl hidden md:block" />

      {/* Navbar */}
      <header className="glass sticky top-0 z-50 h-24 border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 h-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:scale-105 transition-transform">
              <img src={Logo} alt="Edugrade Logo" className="h-9 md:h-10 object-contain" />
            </Link>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Beranda</Link>
            <Link to="/features" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Fitur AI</Link>
            <Link to="/pricing" className="font-extrabold text-primary border-b-4 border-primary pb-1">Pricing</Link>
          </nav>
          
          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 md:gap-6">
            <Link to="/auth" className="font-black text-on-surface-variant hover:text-primary transition-colors text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em]">Login</Link>
            <Link
              to="/auth"
              className="bg-primary text-white px-4 md:px-8 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] font-bold hover:brightness-110 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 text-xs md:text-sm uppercase tracking-wider md:tracking-widest"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-4">
            <Link
              to="/auth"
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 uppercase tracking-wider"
            >
              Mulai
            </Link>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-on-surface hover:bg-on-surface/5 rounded-xl transition-all"
            >
              <iconify-icon icon="lucide:menu" width="24"  ></iconify-icon>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-[110] p-8 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                <img src={Logo} alt="Edugrade Logo" className="h-8 object-contain" />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-on-surface/5 rounded-xl transition-all">
                  <iconify-icon icon="lucide:x" width="20"  ></iconify-icon>
                </button>
              </div>

              <nav className="flex flex-col gap-6">
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-bold text-on-surface-variant hover:text-primary text-lg transition-colors"
                >
                  Beranda
                </Link>
                <Link 
                  to="/features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-bold text-on-surface-variant hover:text-primary text-lg transition-colors"
                >
                  Fitur AI
                </Link>
                <Link 
                  to="/pricing" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-extrabold text-primary text-lg"
                >
                  Pricing
                </Link>
                <hr className="border-outline-variant/30 my-2" />
                <Link 
                  to="/auth" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-bold text-on-surface hover:text-primary text-lg transition-colors"
                >
                  Login
                </Link>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6 z-10 relative">
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
        >
            <span className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 inline-block">Harga Terjangkau</span>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-on-surface mb-6">Mulai Transformasi <span className="text-primary italic">Kelas Anda</span></h1>
            <p className="text-xl text-on-surface-variant font-medium max-w-2xl mx-auto">Dapatkan akses tak terbatas ke semua alat AI Edugrade untuk menganalisis, membuat, dan mengelola soal kelas.</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl items-center lg:items-stretch justify-center relative">
            
            {/* Free Plan */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-md premium-card p-10 flex flex-col h-full"
            >
                <div className="mb-8">
                    <h3 className="text-2xl font-black mb-2 text-on-surface">Gratis</h3>
                    <p className="text-on-surface-variant font-medium text-sm">Untuk uji coba platform secara basic.</p>
                </div>
                <div className="mb-10">
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black tracking-tighter">Rp 0</span>
                        <span className="text-on-surface-variant font-medium mb-2">/ selamanya</span>
                    </div>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                    <FeatureItem text="Akses Dashboard Guru" />
                    <FeatureItem text="Manajemen 3 Kelas Aktif" />
                    <FeatureItem text="3 Token AI Generator" />
                    <FeatureItem text="Analisis Item Standar" />
                    <FeatureItem disabled text="Akses AI Fix Analisis Butir Soal" />
                    <FeatureItem disabled text="Prioritas Support" />
                </div>
                <button 
                    disabled
                    className="w-full py-4 bg-on-surface/5 text-on-surface-variant rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                    Paket Saat Ini
                </button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-md premium-card p-10 border-2 border-primary flex flex-col h-full relative overflow-hidden bg-primary/5"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] -mr-8 -mt-8 flex items-center justify-center">
                    <iconify-icon icon="lucide:crown" className="text-primary w-10 h-10 ml-6 mt-6" ></iconify-icon>
                </div>

                <div className="mb-8 relative z-10">
                    <span className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full mb-4 inline-block shadow-lg shadow-primary/30">Paling Populer</span>
                    <h3 className="text-2xl font-black mb-2 text-on-surface">Premium Pro</h3>
                    <p className="text-on-surface-variant font-medium text-sm">Akses tak terbatas kekuatan penuh AI.</p>
                </div>
                <div className="mb-10 relative z-10">
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black tracking-tighter text-primary">Rp 500K</span>
                        <span className="text-on-surface-variant font-medium mb-2">/ sekali bayar</span>
                    </div>
                </div>
                <div className="space-y-4 mb-10 flex-1 relative z-10">
                    <FeatureItem active text="Akses Kelas Tanpa Batas" />
                    <FeatureItem active text="1000 Token AI Generator" />
                    <FeatureItem active text="Akses Penuh AI Fix Analisis" />
                    <FeatureItem active text="Penyimpanan Cloud Ekstra" />
                    <FeatureItem active text="Prioritas Support 24/7" />
                    <FeatureItem active text="Eksport Laporan Kustom" />
                </div>
                
                {userProfile?.isPremium ? (
                    <button 
                        disabled
                        className="w-full py-5 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-500/20 flex items-center justify-center gap-2"
                    >
                        <iconify-icon icon="lucide:check-circle2" width="18"  ></iconify-icon> Premium Aktif
                    </button>
                ) : (
                    <button 
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <iconify-icon icon="lucide:loader2" width="18" className="animate-spin"  ></iconify-icon> : <iconify-icon icon="lucide:zap" width="18"  fill="currentColor" ></iconify-icon>}
                        {isProcessing ? "Memproses..." : "Beli Sekarang"}
                    </button>
                )}
            </motion.div>

        </div>

      </main>

      {/* Success Modal */}
      {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-surface/80">
              <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl text-center border border-primary/20"
              >
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <iconify-icon icon="lucide:check-circle2" className="text-green-500 w-12 h-12" ></iconify-icon>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight mb-4 text-on-surface">Pembayaran Berhasil!</h3>
                  <p className="text-on-surface-variant font-medium mb-8">Terima kasih, akun Anda kini telah diupgrade ke Premium Pro. Anda memiliki akses penuh ke fitur AI Fix dan 1000 Token AI Generator.</p>
                  <button 
                      onClick={() => {
                          setShowSuccessModal(false);
                          navigate("/dashboard");
                      }}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20"
                  >
                      Mulai Menggunakan AI
                  </button>
              </motion.div>
          </div>
      )}
    </div>
  );
}

function FeatureItem({ text, disabled = false, active = false }: { text: string, disabled?: boolean, active?: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
            {disabled ? (
                <div className="w-6 h-6 rounded-full bg-on-surface/10 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-on-surface/40" />
                </div>
            ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-primary/20' : 'bg-secondary/20'}`}>
                    <iconify-icon icon="lucide:check-circle2" width="14" className={`${active ? 'text-primary' : 'text-secondary'}`}  ></iconify-icon>
                </div>
            )}
            <span className="font-bold text-sm text-on-surface">{text}</span>
        </div>
    )
}
