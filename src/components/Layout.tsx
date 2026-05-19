import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  Users, 
  Sparkles, 
  Search, 
  Plus, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Settings,
  GraduationCap,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import Logo from "@/src/img/Logo.svg";
import { motion, AnimatePresence } from "motion/react";
import { auth, logOut } from "@/src/lib/firebase";
import JoinClassModal from "./JoinClassModal";
import CreateClassModal from "./CreateClassModal";

interface LayoutProps {
  children: ReactNode;
  userType?: "teacher" | "student" | "guest";
}

export default function Layout({ children, userType = "teacher" }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const isGuest = userType === "guest";
  const isTeacherMarketplace = userType === "teacher" && location.pathname === "/dashboard";
  const isInClass = location.pathname.includes("/class/");

  if (isGuest) return <>{children}</>;

  const themeClass = userType === "student" ? "theme-student" : "theme-teacher";

  const handleSignOut = async () => {
    try {
      await logOut();
      navigate("/auth");
    } catch (error) {
      console.error(error);
    }
  };

  const currentUser = auth.currentUser;

  const handleAction = () => {
    if (userType === "student") {
      setIsJoinModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  return (
    <div className={cn("flex min-h-screen bg-surface selection:bg-primary/20", themeClass)}>
      {/* Sidebar - Rail design that adapts when in contextual views */}
      <aside className={cn(
        "hidden lg:flex flex-col transition-all duration-500 glass border-r sticky top-0 h-screen z-40",
        isInClass ? "w-24 p-4" : "w-80 p-10"
      )}>
        <div className={cn("transition-all duration-500", isInClass ? "mb-10 px-0 flex flex-col items-center" : "mb-16 px-2")}>
          <div className="flex items-center gap-3 mb-4">
            <img src={Logo} alt="Edugrade Logo" className={cn("transition-all object-contain", isInClass ? "h-8" : "h-10")} />
          </div>
          {!isInClass && (
            <div className="flex items-center gap-2 ml-1">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <p className="text-on-surface-variant/40 text-[10px] font-black uppercase tracking-[0.3em]">
                  {userType === "teacher" ? "Guru Portal" : "Siswa Portal"}
               </p>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 space-y-3", isInClass && "flex flex-col items-center")}>
          <SidebarItem 
            to={userType === "teacher" ? "/dashboard" : "/student/dashboard"} 
            icon={<Home size={22} />} 
            label="Dashboard" 
            active={location.pathname === "/dashboard" || location.pathname === "/student/dashboard"} 
            slim={isInClass}
          />
          {userType === "teacher" ? (
            <>
              <SidebarItem 
                to="/analytics" 
                icon={<Search size={22} />} 
                label="Butir Soal" 
                active={location.pathname.startsWith("/analytics")} 
                slim={isInClass}
              />
            </>
          ) : (
            <>
              <SidebarItem 
                to="/assignments" 
                icon={<GraduationCap size={22} />} 
                label="Tugas & Ujian" 
                active={location.pathname === "/assignments" || location.pathname.includes("/assignment/")} 
                slim={isInClass}
              />
            </>
          )}
        </nav>

        <div className={cn("pt-10 mt-auto border-t border-white/20 space-y-3", isInClass && "px-0 flex flex-col items-center")}>
          <button 
            onClick={handleAction}
            title={userType === "teacher" ? "Buat Kelas" : "Gabung Kelas"}
            className={cn(
                "btn-glass-primary flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20",
                isInClass ? "w-14 h-14 rounded-2xl p-0" : "w-full py-4 rounded-[20px]"
            )}
          >
            <Plus size={20} />
            {!isInClass && <span className="text-xs font-black uppercase tracking-widest">{userType === "teacher" ? "Buat Kelas" : "Gabung Kelas"}</span>}
          </button>
          <div className="h-4" />
          <SidebarItem 
            to="/auth" 
            icon={<LogOut size={22} />} 
            label="Keluar" 
            variant="error"
            onClick={handleSignOut}
            slim={isInClass}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="glass border-b sticky top-0 z-30 h-20 md:h-24 flex items-center px-4 md:px-8 lg:px-16 justify-between transition-all">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-on-surface hover:bg-on-surface/5 rounded-xl transition-all"
            >
              <Menu size={24} />
            </button>
            <Link to={userType === "teacher" ? "/dashboard" : "/student/dashboard"} className="flex items-center gap-2 md:gap-3">
              <img src={Logo} alt="Edugrade Logo" className="h-8 md:h-10 object-contain" />
            </Link>
            
            <div className="hidden lg:flex gap-10 ml-8">
              <HeaderLink to="/dashboard" label="Home" active />
              <HeaderLink to="#" label="Kurikulum" />
              <HeaderLink to="#" label="Bank Soal" />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            
            <button className="text-on-surface-variant hover:text-primary transition-all p-3 rounded-2xl hover:bg-white/60 relative">
              <Bell size={22} />
              <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
            </button>
            
            <div className="flex items-center gap-4 pl-6 border-l border-white/20">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-on-surface leading-none mb-1">{currentUser?.displayName || "User Profile"}</p>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{userType}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl relative group cursor-pointer active:scale-95 transition-transform">
                    <img 
                      src={currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=800&auto=format&fit=crop"} 
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="glass border-t mt-auto py-8 md:py-12 px-6 md:px-8 lg:px-16 text-on-surface-variant">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2 grayscale brightness-200 opacity-50">
                <img src={Logo} alt="Edugrade Logo" className="h-8 object-contain" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">© 2024 PRECISION ACADEMIC INTELLIGENCE</p>
            </div>
            <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest">
              <Link to="#" className="hover:text-primary transition-colors hover:underline underline-offset-8 decoration-2">Syarat & Ketentuan</Link>
              <Link to="#" className="hover:text-primary transition-colors hover:underline underline-offset-8 decoration-2">Privacy Policy</Link>
              <Link to="#" className="hover:text-primary transition-colors hover:underline underline-offset-8 decoration-2">Help Center</Link>
            </div>
          </div>
        </footer>
      </div>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] lg:hidden"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[60] p-8 flex flex-col lg:hidden shadow-2xl"
            >
               <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-3">
                    <img src={Logo} alt="Edugrade Logo" className="h-8 object-contain" />
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-on-surface/5 rounded-xl transition-all">
                    <X size={20} />
                  </button>
               </div>

               <nav className="flex-1 space-y-2">
                  <SidebarItem 
                    to={userType === "teacher" ? "/dashboard" : "/student/dashboard"} 
                    icon={<Home size={20} />} 
                    label="Dashboard" 
                    active={location.pathname === "/dashboard" || location.pathname === "/student/dashboard"} 
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  {userType === "teacher" ? (
                    <SidebarItem 
                      to="/analytics" 
                      icon={<Search size={20} />} 
                      label="Butir Soal" 
                      active={location.pathname === "/analytics"} 
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  ) : (
                    <SidebarItem 
                      to="/assignments" 
                      icon={<GraduationCap size={20} />} 
                      label="Tugas & Ujian" 
                      active={location.pathname === "/assignments" || location.pathname.includes("/assignment/")} 
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  )}
               </nav>

               <div className="pt-8 mt-auto border-t border-on-surface/5 space-y-3">
                  <button 
                    onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleAction();
                    }}
                    className="w-full btn-glass-primary flex items-center justify-center gap-3 py-4 rounded-[20px] transition-all"
                  >
                    <Plus size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{userType === "teacher" ? "Buat Kelas" : "Gabung Kelas"}</span>
                  </button>
                  <SidebarItem 
                    to="/auth" 
                    icon={<LogOut size={20} />} 
                    label="Keluar" 
                    variant="error"
                    onClick={handleSignOut}
                  />
               </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <JoinClassModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)} 
        onJoined={() => {
            // refresh data if on dashboard
            if (location.pathname === "/student/dashboard") {
                window.location.reload(); // Simple way to refresh for now
            } else {
                navigate("/student/dashboard");
            }
        }}
      />

      <CreateClassModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreated={() => {
            // refresh data if on dashboard
            if (location.pathname === "/dashboard") {
                window.location.reload(); // Simple way to refresh for now
            } else {
                navigate("/dashboard");
            }
        }}
      />
    </div>
  );
}

function SidebarItem({ to, icon, label, active = false, variant = "default", onClick, slim = false }: any) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      title={slim ? label : ""}
      className={cn(
        "flex items-center transition-all duration-300 font-bold group",
        slim ? "justify-center w-14 h-14 rounded-2xl" : "gap-4 px-6 py-4 rounded-[24px]",
        active 
          ? "bg-primary text-white shadow-2xl shadow-primary/25 translate-x-2" 
          : "text-on-surface-variant/60 hover:bg-white/60 hover:text-on-surface",
        variant === "error" && !active && "text-error hover:bg-error/10"
      )}
    >
      <div className={cn("transition-transform group-hover:scale-110", active && "scale-110")}>
        {icon}
      </div>
      {!slim && <span className="text-sm tracking-tight">{label}</span>}
      {active && !slim && (
         <motion.div layoutId="activeDot" className="ml-auto w-2 h-2 bg-white rounded-full" />
      )}
    </Link>
  );
}

function HeaderLink({ to, label, active }: { to: string, label: string, active?: boolean }) {
    return (
        <Link to={to} className={cn(
            "text-sm font-black uppercase tracking-[0.2em] transition-all relative pb-2 group",
            active ? "text-primary" : "text-on-surface-variant/40 hover:text-on-surface"
        )}>
            {label}
            {active && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full" />
            )}
            <div className="absolute bottom-0 left-0 w-0 h-1 bg-primary/20 rounded-full group-hover:w-full transition-all duration-300" />
        </Link>
    )
}
