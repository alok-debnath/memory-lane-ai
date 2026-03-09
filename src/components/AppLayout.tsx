import React, { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import DesktopSidebar from './DesktopSidebar';
import UnifiedCommandPanel from './UnifiedCommandPanel';
import PageInfoButton from './PageInfoButton';

const CommandPanelContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPanel = () => useContext(CommandPanelContext);

const AppLayout: React.FC = () => {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <CommandPanelContext.Provider value={{ open: () => setPanelOpen(true) }}>
      <div className="min-h-screen bg-background">
        <DesktopSidebar />
        <main className="pb-20 lg:pb-0 lg:pl-72">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-2xl lg:max-w-3xl">
            <Outlet />
          </div>
        </main>
        <BottomNav />
        <UnifiedCommandPanel open={panelOpen} onOpenChange={setPanelOpen} />
      </div>
    </CommandPanelContext.Provider>
  );
};

export default AppLayout;
