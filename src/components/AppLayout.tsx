import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import DesktopSidebar from './DesktopSidebar';
import UnifiedCommandPanel from './UnifiedCommandPanel';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="pb-20 lg:pb-0 lg:pl-72">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-2xl lg:max-w-3xl">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <UnifiedCommandPanel />
    </div>
  );
};

export default AppLayout;
