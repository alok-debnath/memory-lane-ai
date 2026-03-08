import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import DesktopSidebar from './DesktopSidebar';
import AIChatPanel from './AIChatPanel';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="pb-20 lg:pb-0 lg:pl-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <AIChatPanel />
    </div>
  );
};

export default AppLayout;
