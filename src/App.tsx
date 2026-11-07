import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProjectorView from './components/projector/ProjectorView';

// Code-split admin view to optimize projector load performance
const AdminView = lazy(() => import('./components/admin/AdminView'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectorView />} />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <div className="h-full w-full flex items-center justify-center bg-[#0f1226] text-[#f6efdc]">
                  <span className="text-xl font-serif text-[#d4af37] animate-pulse">Loading Admin...</span>
                </div>
              }
            >
              <AdminView />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
