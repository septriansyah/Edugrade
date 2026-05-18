import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassroomDetail from './pages/ClassroomDetail';
import QuestionGenerator from './pages/QuestionGenerator';
import ItemAnalysis from './pages/ItemAnalysis';
import ItemAnalysisList from './pages/ItemAnalysisList';
import StudentDashboard from './pages/StudentDashboard';
import AssignmentDetail from './pages/AssignmentDetail';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Teacher Routes */}
        <Route path="/dashboard" element={<TeacherDashboard />} />
        <Route path="/class/:classId/*" element={<ClassroomDetail />} />
        <Route path="/generator" element={<QuestionGenerator />} />
        <Route path="/analytics" element={<ItemAnalysisList />} />
        <Route path="/analytics/:id" element={<ItemAnalysis />} />
        
        {/* Student Routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/assignments" element={<StudentDashboard />} />
        <Route path="/assignment/:id" element={<AssignmentDetail />} />
        <Route path="/my-classes" element={<StudentDashboard />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

