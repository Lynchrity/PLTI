import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { StudentDashboardPage, TutorDashboardPage } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<StudentDashboardPage />} />
        <Route path="/dashboard/tutor" element={<TutorDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
