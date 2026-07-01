import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Books from './pages/Books.jsx';
import Members from './pages/Members.jsx';
import Borrow from './pages/Borrow.jsx';
import MyLoans from './pages/MyLoans.jsx';
import Reservations from './pages/Reservations.jsx';
import Fines from './pages/Fines.jsx';
import Admins from './pages/Admins.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={isAdmin ? <Dashboard /> : <Books />} />
          {isAdmin && <Route path="/books" element={<Books />} />}
          {isAdmin && <Route path="/members" element={<Members />} />}
          {isAdmin && <Route path="/borrow" element={<Borrow />} />}
          {!isAdmin && <Route path="/my-loans" element={<MyLoans />} />}
          <Route path="/reservations" element={<Reservations />} />
          {isAdmin && <Route path="/fines" element={<Fines />} />}
          {isAdmin && <Route path="/admins" element={<Admins />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
