import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import Logo from "@/src/img/Logo.svg";

export default function LegalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrivacy = location.pathname.includes("privacy");

  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/40 glass z-10 sticky top-0">
        <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
          <img src={Logo} alt="Edugrade Logo" className="h-8 object-contain" />
          <span className="font-black text-xl tracking-tight text-on-surface hidden md:block">Edugrade</span>
        </Link>
        <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 px-4 py-2 bg-on-surface/5 hover:bg-on-surface/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
            <ArrowLeft size={16} /> Kembali
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex justify-center py-12 px-6 z-10">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl glass rounded-[48px] p-10 md:p-16 shadow-2xl border-white/60"
        >
            <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center mb-8">
                {isPrivacy ? <ShieldCheck className="text-primary w-10 h-10" /> : <FileText className="text-primary w-10 h-10" />}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-on-surface">
                {isPrivacy ? "Kebijakan Privasi" : "Syarat & Ketentuan"}
            </h1>
            <p className="text-on-surface-variant font-medium text-lg mb-12">
                Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-lg prose-headings:font-black prose-headings:tracking-tight max-w-none text-on-surface-variant/80">
                {isPrivacy ? (
                    <>
                        <h2 className="text-2xl text-on-surface mt-8 mb-4">1. Pengumpulan Data</h2>
                        <p className="mb-6">
                            Edugrade mengumpulkan informasi dasar saat Anda membuat akun, termasuk nama, email, dan foto profil melalui Google. Data ini secara esensial hanya digunakan untuk tujuan identifikasi di dalam lingkungan kelas virtual.
                        </p>
                        
                        <h2 className="text-2xl text-on-surface mt-8 mb-4">2. Penggunaan Informasi</h2>
                        <p className="mb-6">
                            Sistem AI kami menganalisis jawaban dan hasil evaluasi siswa secara algoritmik untuk menghasilkan analitik pembelajaran, rekomendasi penilaian, dan perbaikan soal. Kami berkomitmen untuk tidak memperjualbelikan data performa akademik pengguna kepada pihak ketiga.
                        </p>

                        <h2 className="text-2xl text-on-surface mt-8 mb-4">3. Keamanan</h2>
                        <p className="mb-6">
                            Kami menjaga data pengguna melalui autentikasi Firebase dengan standar enkripsi yang aman. Akses data kelas dan nilai difilter menggunakan aturan keamanan (Security Rules) secara ketat sehingga hanya pengajar dan siswa terkait yang dapat melihatnya.
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl text-on-surface mt-8 mb-4">1. Penggunaan Layanan</h2>
                        <p className="mb-6">
                            Edugrade disediakan sebagai platform asisten pengajar (AI) dan portal pembelajaran interaktif. Layanan ini dapat diakses secara gratis untuk keperluan pendidikan dengan batas penggunaan AI wajar.
                        </p>
                        
                        <h2 className="text-2xl text-on-surface mt-8 mb-4">2. Tanggung Jawab Konten</h2>
                        <p className="mb-6">
                            Meskipun AI kami didesain untuk memberikan jawaban akurat berbasis prinsip Taksonomi Bloom, kami tidak memberikan jaminan kebenaran absolut. Pengajar bertanggung jawab untuk meninjau dan memvalidasi soal (Item Analysis) maupun skor yang dihasilkan oleh AI sebelum difinalisasi.
                        </p>

                        <h2 className="text-2xl text-on-surface mt-8 mb-4">3. Etika Siswa</h2>
                        <p className="mb-6">
                            Siswa diharapkan menggunakan platform ini dengan mengedepankan integritas akademik. Jawaban yang diserahkan akan diproses melalui sistem yang dapat membedakan indikasi plagiarisme dan konsistensi kompetensi dari waktu ke waktu.
                        </p>
                    </>
                )}
            </div>

            <div className="mt-16 pt-8 border-t border-on-surface/10 flex flex-col md:flex-row gap-4 items-center justify-between">
                <p className="text-sm font-bold text-on-surface-variant/40">
                    © {new Date().getFullYear()} Edugrade AI Technology. Hak cipta dilindungi.
                </p>
                <div className="flex gap-4">
                    {!isPrivacy && <Link to="/privacy" className="text-primary font-bold hover:underline text-sm uppercase tracking-widest">Baca Kebijakan Privasi</Link>}
                    {isPrivacy && <Link to="/terms" className="text-primary font-bold hover:underline text-sm uppercase tracking-widest">Baca Syarat & Ketentuan</Link>}
                </div>
            </div>
        </motion.div>
      </main>
    </div>
  );
}
