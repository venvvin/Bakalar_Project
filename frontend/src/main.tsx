import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import App from './App';
import AssignmentsPage from './pages/AssignmentsPage';
import CourseDetail from './pages/CourseDetail';
import PlaceholderPage from './pages/PlaceholderPage';
import AssignmentDetail from './pages/AssignmentDetail';
import LoginPage from './pages/LoginPage';
import InvitationsPage from './pages/InvitationsPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import CoursesPage from "./pages/CoursesPage";
import './index.css';


function Protected({ children, teacherOnly = false }: { children: React.ReactNode; teacherOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-10">Načítavam...</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (teacherOnly && user.role !== 'TEACHER') return <Navigate to="/" replace />;
  return <>{children}</>;
}
function RoutesList() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
    <Route path="/" element={<App />} />
    <Route path="/courses" element={<CoursesPage />} />
    <Route path="/courses/:courseId" element={<Protected><CourseDetail /></Protected>} />
    <Route path="/assignments" element={<Protected><AssignmentsPage /></Protected>} />
    <Route path="/assignments/:assignmentId" element={<Protected><AssignmentDetail /></Protected>} />
    <Route path="/students" element={<Protected teacherOnly><PlaceholderPage /></Protected>} />
    <Route path="/invitations" element={<Protected teacherOnly><InvitationsPage /></Protected>} />
    <Route path="/settings" element={<Protected><PlaceholderPage /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><RoutesList /></AuthProvider></BrowserRouter></React.StrictMode>
);
