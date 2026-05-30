import { useState } from "react";
import { Link } from "react-router-dom";

import { motion, AnimatePresence } from "motion/react";
import Logo from "/src/img/Logo.svg";
import Asset1 from "/src/img/Asset 1.png";
import Asset2 from "/src/img/Asset 2.png";
import Asset3 from "/src/img/Asset 3.png";
import Asset4 from "/src/img/Asset 4.png";
import Asset5 from "/src/img/Asset 5.png";
import Asset6 from "/src/img/Asset 6.png";
import Dewa from "../img/Dewa.jpg";
import Joy from "../img/Joy.jpg";
import Nayla from "../img/Nayla.jpg";
import Siti from "../img/Siti.jpg";
import BgHero from "../img/BG_HERO.png";
import BgSec5 from "../img/BG_SEC5.png";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20">
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
            <Link to="/" className="font-extrabold text-primary border-b-4 border-primary pb-1">Beranda</Link>
            <Link to="/features" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Fitur AI</Link>
            <Link to="/pricing" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Pricing</Link>
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
                  className="font-extrabold text-primary text-lg"
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
                  className="font-bold text-on-surface-variant hover:text-primary text-lg transition-colors"
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

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-6rem)] py-20 overflow-hidden flex items-center z-0">
        {/* Background Image */}
        <img 
          src={BgHero} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-10" 
        />
        <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 relative z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full mb-8">
              <iconify-icon icon="lucide:sparkles" width="16" className="text-primary" ></iconify-icon>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">AI-CORE ENGINE V3.0</span>
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-on-surface leading-[0.95] mb-8 tracking-tighter">
              Revolusi <span className="text-primary italic">Evaluasi</span> Akademik.
            </h1>
            <p className="text-xl md:text-2xl text-on-surface-variant/80 mb-12 max-w-2xl leading-relaxed font-medium mx-auto">
              Otomasi pembuatan soal Taksonomi Bloom, analisis butir soal cerdas, dan manajemen kelas terintegrasi.
            </p>
            <div className="flex flex-wrap justify-center gap-6 font-black tracking-widest uppercase text-xs">
              <Link
                to="/auth"
                className="bg-primary text-white py-5 px-10 rounded-[28px] shadow-2xl shadow-primary/25 hover:scale-105 transition-all flex items-center gap-4"
              >
                Mulai Sebagai Guru
                <iconify-icon icon="lucide:arrow-right" width="20"  ></iconify-icon>
              </Link>
              <Link
                to="/auth"
                className="btn-glass py-5 px-10 rounded-[28px] flex items-center gap-4"
              >
                Gabung Kelas
                <iconify-icon icon="lucide:users" width="20"  ></iconify-icon>
              </Link>
            </div>
          </motion.div>

          {/* Background blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10" />

          {/* Decorative Assets for Hero */}
          <motion.img
            src={Asset1}
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 lg:-left-20 w-32 md:w-40 h-32 md:h-40 object-contain z-30 drop-shadow-2xl opacity-90 hidden md:block"
          />
          <motion.img
            src={Asset2}
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-0 right-0 lg:-right-20 w-40 md:w-48 h-40 md:h-48 object-contain z-30 drop-shadow-2xl opacity-90 hidden md:block"
          />
        </div>
      </section>

      {/* Tim Pengembang Section */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-20 relative z-10">
            <span className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-black uppercase tracking-[0.2em]">Tim Pengembang</span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mt-6 text-on-surface">Di Balik Layar <span className="text-primary italic">Edugrade</span></h2>
          </div>

          <motion.img src={Asset3} animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute -top-10 left-0 lg:left-10 w-24 lg:w-32 h-24 lg:h-32 object-contain opacity-70 z-0 pointer-events-none hidden md:block" />
          <motion.img src={Asset4} animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }} className="absolute top-20 right-0 lg:right-10 w-28 lg:w-36 h-28 lg:h-36 object-contain opacity-70 z-0 pointer-events-none hidden md:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <DeveloperCard
              name="Dewa Ahmad Septriansyah"
              role="UI UX Designer"
              avatarInitials="DA"
              bgGradient="from-violet-500/10 to-indigo-500/10"
              iconColor="text-violet-600"
              badgeBg="bg-violet-500/10"
              imageUrl={Dewa}
            />
            <DeveloperCard
              name="Siti Agisna"
              role="Backend"
              avatarInitials="SA"
              bgGradient="from-pink-500/10 to-rose-500/10"
              iconColor="text-pink-600"
              badgeBg="bg-pink-500/10"
              imageUrl={Siti}
            />
            <DeveloperCard
              name="Nayla Tiani Putri"
              role="Quality Assurance"
              avatarInitials="NT"
              bgGradient="from-amber-500/10 to-orange-500/10"
              iconColor="text-amber-600"
              badgeBg="bg-amber-500/10"
              imageUrl={Nayla}
            />
            <DeveloperCard
              name="Joy Christine"
              role="Frontend Developer"
              avatarInitials="JC"
              bgGradient="from-blue-500/10 to-sky-500/10"
              iconColor="text-blue-600"
              badgeBg="bg-blue-500/10"
              imageUrl={Joy}
            />
          </div>
        </div>
      </section>

      {/* AI Capabilities Showcase Section */}
      <section className="py-24 bg-surface relative overflow-hidden z-0">
        {/* Background Image */}
        <img 
          src={BgSec5} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-10" 
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-black uppercase tracking-[0.2em]">Kekuatan AI Edugrade</span>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight text-on-surface">Solusi AI <span className="text-primary italic">End-to-End</span> Penilaian Kelas</h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto font-medium">
              Dari pembuatan naskah soal hingga analisis butir instrumen, asisten AI kami siap mengotomatisasi pekerjaan administratif Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-10 rounded-[44px] border-white/60 shadow-xl flex flex-col justify-between hover:scale-[1.02] transition-all bg-white/40">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <iconify-icon icon="lucide:sparkles" width="24"  ></iconify-icon>
                </div>
                <h3 className="text-2xl font-black tracking-tight">Generator Soal Cerdas</h3>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                  Hasilkan paket soal otomatis berdasarkan topik rujukan Anda. Kelebihan utamanya: Menghemat waktu pembuatan soal hingga 90% dengan hasil presisi yang terjamin sesuai standar kognitif Taksonomi Bloom (C1-C6).
                </p>
              </div>
            </div>

            <div className="glass p-10 rounded-[44px] border-white/60 shadow-xl flex flex-col justify-between hover:scale-[1.02] transition-all bg-white/40">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                  <iconify-icon icon="lucide:graduation-cap" width="24"  ></iconify-icon>
                </div>
                <h3 className="text-2xl font-black tracking-tight">Koreksi & Rekomendasi Nilai AI</h3>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                  Asisten AI mengevaluasi respon jawaban esai siswa secara objektif. Kelebihannya: Memberikan rekomendasi nilai instan dan analisis kata kunci yang sangat akurat, sehingga guru bisa mengoreksi ratusan esai dalam hitungan menit.
                </p>
              </div>
            </div>

            <div className="glass p-10 rounded-[44px] border-white/60 shadow-xl flex flex-col justify-between hover:scale-[1.02] transition-all bg-white/40">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600">
                  <iconify-icon icon="lucide:check-circle" width="24"  ></iconify-icon>
                </div>
                <h3 className="text-2xl font-black tracking-tight">Analisis Butir & Pengecoh</h3>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                  Menghitung tingkat kesukaran, daya pembeda kelompok, efektivitas pengecoh, dan validitas tes otomatis. Keunggulannya: Menghasilkan laporan komprehensif tanpa pusing perhitungan rumit, memastikan evaluasi berkualitas.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <motion.img src={Asset5} animate={{ y: [0, 20, 0], rotate: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-10 left-10 lg:left-40 w-32 h-32 object-contain opacity-60 drop-shadow-xl z-0 pointer-events-none hidden md:block" />
        <motion.img src={Asset6} animate={{ y: [0, -20, 0], rotate: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }} className="absolute bottom-10 right-10 lg:right-40 w-40 h-40 object-contain opacity-60 drop-shadow-xl z-0 pointer-events-none hidden md:block" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl font-bold mb-12">Siap Memulai Transformasi Digital Kelas Anda?</h2>
          <div className="bg-primary/5 p-10 rounded-[40px] border-2 border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-left">
              <h3 className="text-2xl font-bold mb-2">Daftar sekarang sebagai Guru</h3>
              <p className="text-on-surface-variant">Dapatkan akses gratis selama 30 hari penuh.</p>
            </div>
            <Link
              to="/auth"
              className="bg-primary text-white py-4 px-10 rounded-2xl font-bold shadow-xl shadow-primary/25 hover:scale-105 transition-all text-lg"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low py-12 px-6 lg:px-12 border-t border-outline-variant/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-4">
            <img src={Logo} alt="Edugrade Logo" className="h-8 object-contain" />
            <p className="text-on-surface-variant max-w-sm">
              Empowering educators with AI-driven assessments and precision analytics.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div className="space-y-4">
              <h4 className="font-bold">Product</h4>
              <ul className="space-y-2 text-on-surface-variant">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/features">Features</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold">Legal</h4>
              <ul className="space-y-2 text-on-surface-variant">
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-outline-variant/30 text-sm text-on-surface-variant text-center">
          © 2024 Edugrade AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function DeveloperCard({
  name,
  role,
  avatarInitials,
  bgGradient,
  iconColor,
  badgeBg,
  imageUrl,
  description
}: {
  name: string;
  role: string;
  avatarInitials: string;
  bgGradient: string;
  iconColor: string;
  badgeBg: string;
  imageUrl?: string;
  description?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="premium-card overflow-hidden flex flex-col group hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)] hover:border-slate-200/80 transition-all duration-300"
    >
      {/* Photo Container - Large aspect 4:5 (IG Ratio) stretching to borders */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center font-black text-4xl bg-gradient-to-br ${bgGradient} ${iconColor}`}>
            {avatarInitials}
          </div>
        )}
      </div>

      {/* Content Container - Left Aligned */}
      <div className="p-6 md:p-8 flex flex-col flex-grow text-left">
        {/* Badge / Pill */}
        <div className="flex mb-4">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${badgeBg} ${iconColor}`}>
            {role}
          </span>
        </div>

        {/* Developer Name */}
        <h3 className="text-xl font-black text-on-surface tracking-tight mb-2 leading-tight group-hover:text-primary transition-colors">
          {name}
        </h3>

        {/* Bio / Description */}
        {description && (
          <p className="text-xs text-on-surface-variant/80 font-medium leading-relaxed mt-2">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
