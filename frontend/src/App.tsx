import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import VerifyPage from './pages/VerifyPage';
import ResultPage from './pages/ResultPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
