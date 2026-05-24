import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Cpu, CheckCircle2, Zap, BarChart3, Clock, GraduationCap, Users, Award, ShieldCheck, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Logo from "/src/img/Logo.svg";
import Asset1 from "/src/img/Asset 1.png";
import Asset2 from "/src/img/Asset 2.png";
import Asset3 from "/src/img/Asset 3.png";
import Asset4 from "/src/img/Asset 4.png";
import Asset5 from "/src/img/Asset 5.png";
import Asset6 from "/src/img/Asset 6.png";

export default function AiFeaturesPage() {
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
            <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Beranda</Link>
            <Link to="/features" className="font-extrabold text-primary border-b-4 border-primary pb-1">Fitur AI</Link>
            <Link to="/pricing" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Pricing</Link>
          </nav>
          
          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 md:gap-6">
            <Link to="/auth" className="font-black text-on-surface-variant hover:text-primary transition-colors text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em]">Login</Link>
            <Link
              to="/auth"
              className="bg-primary text-white px-4 md:px-8 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] font-bold hover:brightness-110 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 text-xs md:text-sm uppercase tracking-wider md:tracking-widest"
            >
              Mulai
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
                  className="font-bold text-on-surface-variant hover:text-primary text-lg transition-colors"
                >
                  Beranda
                </Link>
                <Link 
                  to="/features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-extrabold text-primary text-lg"
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
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full"
          >
            <Sparkles size={16} className="text-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Teknologi AI Edugrade v3.0</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-7xl font-black text-on-surface leading-tight tracking-tight max-w-4xl mx-auto"
          >
            Kelebihan & Kekuatan <span className="text-primary italic">Asisten AI</span> Kami
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-2xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Pelajari bagaimana Edugrade memanfaatkan kecerdasan buatan kelas dunia untuk menyederhanakan evaluasi dan meningkatkan kualitas pembelajaran di kelas Anda.
          </motion.p>
        </div>
        
        {/* Background blobs & Decorative Assets */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10" />
        <motion.img src={Asset1} animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-20 left-10 lg:left-32 w-24 md:w-32 h-24 md:h-32 object-contain opacity-60 z-0 pointer-events-none drop-shadow-xl hidden md:block" />
        <motion.img src={Asset2} animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }} className="absolute bottom-20 right-10 lg:right-32 w-32 md:w-40 h-32 md:h-40 object-contain opacity-50 z-0 pointer-events-none drop-shadow-xl hidden md:block" />
      </section>

      {/* Main Advantages Grid */}
      <section className="py-16 md:py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 space-y-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Cpu size={28} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">Generator Soal Berbasis Taksonomi Bloom</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed font-medium">
                Edugrade AI menggunakan model bahasa besar yang disesuaikan secara khusus untuk merancang soal-soal berkualitas tinggi berdasarkan tingkat kognitif Bloom (C1 hingga C6).
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-on-surface block">Efisiensi Waktu Hingga 90%</span>
                    <span className="text-on-surface-variant text-sm font-medium">Buat paket soal lengkap dengan kunci jawaban dan pembahasan dalam hitungan detik, bukan jam.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-on-surface block">Standar Kualitas HOTS</span>
                    <span className="text-on-surface-variant text-sm font-medium">AI memastikan pertanyaan menantang keterampilan berpikir kritis siswa secara proporsional.</span>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass p-6 md:p-8 rounded-[40px] border-white/60 shadow-2xl bg-white/40"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="font-black text-xs uppercase tracking-widest text-on-surface-variant/60">Contoh Output AI</span>
                  <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">Taksonomi C4 (Analisis)</span>
                </div>
                <p className="font-bold text-lg text-on-surface">Pertanyaan Essay:</p>
                <div className="p-5 bg-surface rounded-2xl border border-outline-variant/50">
                  <p className="font-medium text-sm text-on-surface-variant leading-relaxed">
                    "Analisis dampak perubahan iklim global terhadap keanekaragaman hayati laut di wilayah terumbu karang segitiga karang Indonesia. Buatlah hipotesis mengenai rantai makanan setempat bila salah satu spesies predator puncak punah."
                  </p>
                </div>
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="font-bold text-xs uppercase text-primary tracking-widest mb-2">Panduan Penilaian & Pembahasan:</p>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                    Jawaban harus mengandung kata kunci: Trofik, Pemutihan Karang, Eutrofikasi, Keseimbangan Ekosistem. Bobot nilai 25 poin untuk korelasi logis.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <hr className="border-outline-variant/30" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass p-6 md:p-8 rounded-[40px] border-white/60 shadow-2xl bg-white/40 order-last lg:order-first"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="font-black text-xs uppercase tracking-widest text-on-surface-variant/60">Skor Esai AI vs Validasi Guru</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">Sangat Akurat</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                      <span>Rekomendasi Skor AI</span>
                      <span className="text-primary">85/100</span>
                    </div>
                    <div className="h-3 bg-primary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                      <span>Skor Validasi Guru</span>
                      <span className="text-secondary">87/100</span>
                    </div>
                    <div className="h-3 bg-secondary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: "87%" }} />
                    </div>
                  </div>
                  <div className="p-4 bg-surface rounded-2xl border border-outline-variant/40 text-xs text-on-surface-variant font-medium leading-relaxed">
                    "AI menganalisis 4 dari 5 kata kunci esai dengan ketepatan interpretasi semantik mencapai 98.4%."
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                <Award size={28} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">Koreksi & Rekomendasi Nilai Esai Cerdas</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed font-medium">
                Mengoreksi esai secara manual memakan waktu yang sangat lama dan rentan bias. Edugrade AI memecahkan masalah ini dengan sistem penilaian semantik objektif.
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-secondary shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-on-surface block">Pencocokan Kata Kunci Semantik</span>
                    <span className="text-on-surface-variant text-sm font-medium">AI tidak hanya mencari kata yang sama persis, tetapi juga memahami konsep dan arti jawaban siswa secara kontekstual.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-secondary shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-on-surface block">Rekomendasi yang Dapat Disesuaikan</span>
                    <span className="text-on-surface-variant text-sm font-medium">Guru memegang kendali penuh. AI memberikan rekomendasi skor dan masukan, lalu Guru dapat menyesuaikan atau langsung mengonfirmasinya.</span>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>

          <hr className="border-outline-variant/30" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600">
                <BarChart3 size={28} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">Analisis Butir Soal & Pengecoh Otomatis</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed font-medium">
                Dapatkan wawasan mendalam tentang efektivitas instrumen penilaian Anda tanpa perlu menghitung statistik yang rumit secara manual.
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-on-surface block">Validitas & Reliabilitas Seketika</span>
                    <span className="text-on-surface-variant text-sm font-medium">Sistem secara otomatis menghitung koefisien korelasi skor butir dengan skor total untuk mengetahui kevalidan dan keandalan soal.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-on-surface block">Tingkat Kesukaran & Daya Pembeda</span>
                    <span className="text-on-surface-variant text-sm font-medium">Mengelompokkan soal secara otomatis menjadi sangat mudah, sedang, atau sukar serta mengukur kemampuan membedakan siswa pandai dan kurang pandai.</span>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass p-6 md:p-8 rounded-[40px] border-white/60 shadow-2xl bg-white/40"
            >
              <div className="space-y-4">
                <h4 className="font-black text-xs uppercase tracking-widest text-on-surface-variant/60">Ringkasan Statistik Butir Soal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center">
                    <span className="text-xs text-on-surface-variant font-medium block">Daya Pembeda (DP)</span>
                    <span className="text-xl font-black text-primary">0.42 (Baik)</span>
                  </div>
                  <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center">
                    <span className="text-xs text-on-surface-variant font-medium block">Tingkat Kesukaran</span>
                    <span className="text-xl font-black text-secondary">Sedang (0.55)</span>
                  </div>
                  <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center col-span-2">
                    <span className="text-xs text-on-surface-variant font-medium block mb-1">Efektivitas Pengecoh</span>
                    <span className="text-sm font-bold text-green-600 block">Semua distraktor berfungsi (A, B, C, E)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Summary of Advantages Section */}
      <section className="py-20 bg-surface relative overflow-hidden">
        <motion.img src={Asset3} animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-1/3 left-0 lg:left-10 w-24 lg:w-32 h-24 lg:h-32 object-contain opacity-40 z-0 pointer-events-none hidden md:block" />
        <motion.img src={Asset4} animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }} className="absolute top-2/3 right-0 lg:right-10 w-28 lg:w-36 h-28 lg:h-36 object-contain opacity-40 z-0 pointer-events-none hidden md:block" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 space-y-16 relative z-10">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Mengapa Harus Menggunakan Edugrade AI?</h2>
            <p className="text-lg text-on-surface-variant max-w-xl mx-auto font-medium">Bandingkan alur kerja tradisional dengan alur kerja modern Edugrade.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="glass p-8 rounded-[36px] border-white/60 bg-red-500/5 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                <span>Alur Kerja Lama</span>
              </h3>
              <ul className="space-y-4 text-sm font-medium text-on-surface-variant">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span>Membuat soal manual membutuhkan waktu berhari-hari.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span>Koreksi esai bertumpuk-tumpuk rawan bias di malam hari.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span>Menghitung analisis butir soal manual di Excel sangat rumit.</span>
                </li>
              </ul>
            </div>

            <div className="glass p-8 rounded-[36px] border-primary/20 bg-primary/5 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span>Dengan Edugrade AI</span>
              </h3>
              <ul className="space-y-4 text-sm font-medium text-on-surface">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <span>Soal berkualitas tinggi siap pakai dalam 1 menit.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <span>AI merekomendasikan nilai esai dengan analisis kata kunci.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <span>Statistik analisis butir soal terhitung otomatis instan.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-surface-container-low relative overflow-hidden">
        <motion.img src={Asset5} animate={{ y: [0, 20, 0], rotate: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-10 left-10 lg:left-40 w-32 h-32 object-contain opacity-60 drop-shadow-xl z-0 pointer-events-none hidden md:block" />
        <motion.img src={Asset6} animate={{ y: [0, -20, 0], rotate: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }} className="absolute bottom-10 right-10 lg:right-40 w-40 h-40 object-contain opacity-60 drop-shadow-xl z-0 pointer-events-none hidden md:block" />
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-on-surface">Siap Merasakan Kemudahan Ini?</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto font-medium text-base md:text-lg">
            Bergabunglah dengan ribuan pendidik lain dan mulailah menghemat waktu kerja Anda hari ini.
          </p>
          <div className="pt-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-3 bg-primary text-white py-4 px-10 rounded-2xl font-bold shadow-xl shadow-primary/25 hover:scale-105 transition-all text-lg"
            >
              Mulai Gratis Sekarang
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low py-12 px-6 lg:px-12 border-t border-outline-variant/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-4">
            <img src={Logo} alt="Edugrade Logo" className="h-8 object-contain" />
            <p className="text-on-surface-variant max-w-sm text-sm font-medium">
              Empowering educators with AI-driven assessments and precision analytics.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface">Product</h4>
              <ul className="space-y-2 text-sm text-on-surface-variant font-medium">
                <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface">Legal</h4>
              <ul className="space-y-2 text-sm text-on-surface-variant font-medium">
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-outline-variant/30 text-xs text-on-surface-variant/60 text-center font-medium">
          © 2024 Edugrade AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
