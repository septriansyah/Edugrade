import { Link } from "react-router-dom";
import { ArrowRight, Users, Sparkles, Database, FileText, CheckCircle, GraduationCap } from "lucide-react";
import { motion } from "motion/react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20">
      {/* Navbar */}
      <header className="glass sticky top-0 z-50 h-24 border-b">
        <div className="max-w-7xl mx-auto px-8 lg:px-12 h-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
               <GraduationCap className="text-primary" size={24} />
            </div>
            <span className="text-2xl font-black text-on-surface tracking-tighter">Edu<span className="text-primary underline decoration-4 underline-offset-4 decoration-primary/20">grade</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-10">
            <Link to="/" className="font-extrabold text-primary border-b-4 border-primary pb-1">Beranda</Link>
            <Link to="#" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Fitur AI</Link>
            <Link to="#" className="text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest">Pricing</Link>
          </nav>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="font-black text-on-surface-variant hover:text-primary transition-colors text-sm uppercase tracking-[0.2em]">Login</Link>
            <Link 
              to="/auth" 
              className="bg-primary text-white px-8 py-3.5 rounded-[20px] font-bold hover:brightness-110 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30 text-sm uppercase tracking-widest"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 overflow-hidden flex items-center">
        <div className="max-w-7xl mx-auto px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full mb-8">
               <Sparkles size={16} className="text-primary" />
               <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">AI-CORE ENGINE V3.0</span>
            </div>
            <h1 className="text-7xl lg:text-8xl font-black text-on-surface leading-[0.95] mb-10 tracking-tighter">
              Revolusi <span className="text-primary italic">Evaluasi</span> Akademik.
            </h1>
            <p className="text-2xl text-on-surface-variant/80 mb-12 max-w-xl leading-relaxed font-medium">
              Otomasi pembuatan soal Taksonomi Bloom, analisis butir soal cerdas, dan manajemen kelas terintegrasi.
            </p>
            <div className="flex flex-wrap gap-6 font-black tracking-widest uppercase text-xs">
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

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="glass p-5 rounded-[64px] border-white/40 shadow-2xl relative z-10">
              <div className="rounded-[48px] overflow-hidden aspect-video shadow-inner">
                <img 
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Floating Mini Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 glass p-6 rounded-[32px] shadow-2xl border-white/40 z-20"
              >
                 <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 text-center">VALIDITY RATE</p>
                 <p className="text-3xl font-black text-on-surface tracking-tighter">98.4%</p>
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-10 -left-10 glass p-6 rounded-[32px] shadow-2xl border-white/40 z-20"
              >
                 <div className="flex gap-1.5 mb-2">
                    <div className="w-1.5 h-6 bg-primary/20 rounded-full" />
                    <div className="w-1.5 h-10 bg-primary/40 rounded-full" />
                    <div className="w-1.5 h-8 bg-primary rounded-full" />
                 </div>
                 <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">ANALYTICS</p>
              </motion.div>
            </div>
            
            {/* Background blobs */}
            <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />
            <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-student-primary/10 rounded-full blur-[100px] -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-widest">FITUR UNGGULAN</span>
            <h2 className="text-4xl font-bold mt-4">Platform Cerdas untuk Guru Masa Depan</h2>
          </div>

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
                  Buat soal essay atau pilihan ganda secara instan berdasarkan persentase level Taksonomi Bloom (C1-C6). Cukup masukkan topik, biarkan AI bekerja untuk Anda.
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
                  Berbagi dan temukan referensi soal berkualitas dari ribuan pendidik di seluruh Indonesia secara kolaboratif.
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
                Hitung otomatis Indeks Kesukaran, Daya Pembeda, Efektivitas Pengecoh, serta Validitas dan Reliabilitas soal secara real-time.
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
                  Buat soal pilihan ganda dan esai berbasis Taksonomi Bloom, lengkap dengan opsi jawaban dan pembahasan.
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

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
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
            <h2 className="text-2xl font-bold text-primary">Edugrade</h2>
            <p className="text-on-surface-variant max-w-sm">
              Empowering educators with AI-driven assessments and precision analytics.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
             <div className="space-y-4">
                <h4 className="font-bold">Product</h4>
                <ul className="space-y-2 text-on-surface-variant">
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/">Features</Link></li>
                  <li><Link to="/">Pricing</Link></li>
                </ul>
             </div>
             <div className="space-y-4">
                <h4 className="font-bold">Legal</h4>
                <ul className="space-y-2 text-on-surface-variant">
                  <li><Link to="/">Privacy Policy</Link></li>
                  <li><Link to="/">Terms of Service</Link></li>
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
