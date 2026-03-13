import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import StudentsPage from '@/pages/StudentsPage';
import AttendancePage from '@/pages/AttendancePage';
import PaymentsPage from '@/pages/PaymentsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Dashboard Route */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Students Route */}
        <Route path="/students" element={<StudentsPage />} />
        
        {/* Attendance Route */}
        <Route path="/attendance" element={<AttendancePage />} />
        
        {/* Payments Route */}
        <Route path="/payments" element={<PaymentsPage />} />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;