import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Posts from './pages/Posts.jsx';
import PostEditor from './pages/PostEditor.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/new" element={<PostEditor />} />
        <Route path="/posts/:id/edit" element={<PostEditor />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}