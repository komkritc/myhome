import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow-card border border-surface-100 text-surface-600 hover:text-surface-800 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-surface-900/30 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar wrapper */}
      <div className={`fixed md:relative md:translate-x-0 z-[60] transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-[14rem]`}>
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:ml-[2rem] p-4 md:p-6 pt-14 md:pt-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
