import { Navigate, Route, Routes } from 'react-router-dom';
import { ConstructorPage } from './pages/ConstructorPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/demo-baker" replace />} />
      <Route path="/:slug" element={<ConstructorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
