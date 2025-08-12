import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import Wallet from './pages/Wallet';
import Play from './pages/Play';
import { AuthProvider } from './contexts/AuthContext'; 

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-black font-mono text-white">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/play" element={<Play />} />
          {/* Add other routes for game modes later */}
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
