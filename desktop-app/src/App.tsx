import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Default Route - Redirect to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Dashboard (we'll build next) */}
        {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;