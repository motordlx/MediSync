import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoControlPanel } from '../demo/DemoControlPanel';
import { useDemo } from '../../context/DemoContext';
import { X } from 'lucide-react';

export const Layout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isPanelOpen, setIsPanelOpen } = useDemo();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-xs bg-white h-full shadow-2xl flex flex-col z-50 animate-slide-right">
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenMobile={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Slide-over Demo Control Panel Drawer */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPanelOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md shadow-2xl">
              <DemoControlPanel onClose={() => setIsPanelOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
