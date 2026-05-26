import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Sparkles, Database, FileText, CheckCircle, GraduationCap, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Logo from "/src/img/Logo.svg";
import Asset1 from "/src/img/Asset 1.png";
import Asset2 from "/src/img/Asset 2.png";
import Asset3 from "/src/img/Asset 3.png";
import Asset4 from "/src/img/Asset 4.png";
import Asset5 from "/src/img/Asset 5.png";
import Asset6 from "/src/img/Asset 6.png";

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
              <Menu size={24} />
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
                  <X size={20} />
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
      <section className="relative pt-32 pb-32 overflow-hidden flex items-center">
        <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 relative z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full mb-8">
              <Sparkles size={16} className="text-primary" />
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
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/auth"
                className="btn-glass py-5 px-10 rounded-[28px] flex items-center gap-4"
              >
                Gabung Kelas
                <Users size={20} />
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

      {/* Features Bento Grid */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-16 relative z-10">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-widest">FITUR UNGGULAN</span>
            <h2 className="text-4xl font-bold mt-4">Platform Cerdas untuk Guru Masa Depan</h2>
          </div>
          
          <motion.img src={Asset3} animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute -top-10 left-0 lg:left-10 w-24 lg:w-32 h-24 lg:h-32 object-contain opacity-70 z-0 pointer-events-none hidden md:block" />
          <motion.img src={Asset4} animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }} className="absolute top-20 right-0 lg:right-10 w-28 lg:w-36 h-28 lg:h-36 object-contain opacity-70 z-0 pointer-events-none hidden md:block" />

          <div className="grid grid-cols-12 gap-6">
            {/* AI Generator */}
            <motion.div
              whileHover={{ y: -5 }}
              className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[32px] border border-outline-variant border-b-4 border-b-primary shadow-sm flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="flex-1">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart AI Generator</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Kelebihan utama: Buat soal essay atau pilihan ganda secara instan berdasarkan persentase level Taksonomi Bloom (C1-C6). Cukup masukkan topik, biarkan AI yang menghemat berjam-jam waktu kerja Anda.
                </p>
              </div>
              <div className="flex-1 w-full p-6 bg-surface rounded-2xl border border-outline-variant">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <div className="w-3 h-3 rounded-full bg-tertiary" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-3 opacity-40">
                  <div className="h-4 bg-primary/20 rounded w-3/4" />
                  <div className="h-4 bg-primary/10 rounded w-1/2" />
                  <div className="h-4 bg-primary/15 rounded w-5/6" />
                </div>
              </div>
            </motion.div>

            {/* Bank Soal */}
            <motion.div
              whileHover={{ y: -5 }}
              className="col-span-12 lg:col-span-4 bg-primary text-white p-10 rounded-[32px] shadow-xl relative overflow-hidden group"
            >
              <div className="relative z-10">
                <Database size={48} className="mb-6 opacity-80" />
                <h3 className="text-2xl font-bold mb-4">Bank Soal Komunitas</h3>
                <p className="opacity-80 leading-relaxed">
                  Keunggulannya: Bagikan dan temukan ribuan referensi soal berkualitas dari sesama pendidik di seluruh Indonesia, memperkaya bank soal Anda tanpa batas secara kolaboratif.
                </p>
              </div>
              <Users className="absolute -bottom-8 -right-8 text-white/10 w-48 h-48 group-hover:scale-110 transition-transform" />
            </motion.div>

            {/* Analysis Pro */}
            <motion.div
              whileHover={{ y: -5 }}
              className="col-span-12 lg:col-span-5 bg-white p-10 rounded-[32px] border border-outline-variant shadow-sm"
            >
              <FileText size={48} className="text-secondary mb-6" />
              <h3 className="text-2xl font-bold mb-4">Analisis Butir Soal Pro</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                Kelebihan sistem: Hitung otomatis Indeks Kesukaran, Daya Pembeda, Efektivitas Pengecoh, serta Validitas dan Reliabilitas soal secara real-time tanpa rumus Excel yang rumit.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface rounded-2xl text-center border border-outline-variant/30">
                  <span className="text-xs font-bold text-on-surface-variant block mb-1">Reliabilitas</span>
                  <span className="text-2xl font-bold text-secondary">0.86</span>
                </div>
                <div className="p-4 bg-surface rounded-2xl text-center border border-outline-variant/30">
                  <span className="text-xs font-bold text-on-surface-variant block mb-1">Validitas</span>
                  <span className="text-2xl font-bold text-green-600">Sangat Tinggi</span>
                </div>
              </div>
            </motion.div>

            {/* Question Generator */}
            <motion.div
              whileHover={{ y: -5 }}
              className="col-span-12 lg:col-span-7 bg-white p-10 rounded-[32px] border border-outline-variant shadow-sm overflow-hidden"
            >
              <div>
                <div className="w-12 h-12 bg-tertiary-container shadow-inner rounded-xl flex items-center justify-center mb-6">
                  <FileText className="text-tertiary" size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Generator Soal DeepSeek</h3>
                <p className="text-on-surface-variant mb-6 leading-relaxed">
                  Keunggulan utama: Hasilkan soal pilihan ganda dan esai secara instan yang sangat presisi, relevan, lengkap dengan opsi jawaban dan pembahasannya.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="text-primary" size={18} />
                    <span>Kontrol jumlah opsi pilihan ganda</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="text-primary" size={18} />
                    <span>Dapat memakai materi teks sebagai referensi</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Capabilities Showcase Section */}
      <section className="py-24 bg-surface relative overflow-hidden">
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
                  <Sparkles size={24} />
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
                  <GraduationCap size={24} />
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
                  <CheckCircle size={24} />
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
