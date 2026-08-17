import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Posts from './pages/Posts.jsx';
import PostEditor from './pages/PostEditor.jsx';
import AccountStatus from './pages/AccountStatus.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/posts"
            element={
              <RequireAuth>
                <Posts />
              </RequireAuth>
            }
          />
          <Route
            path="/posts/new"
            element={
              <RequireAuth>
                <PostEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/posts/:id/edit"
            element={
              <RequireAuth>
                <PostEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/accounts/:id/status"
            element={
              <RequireAuth>
                <AccountStatus />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}