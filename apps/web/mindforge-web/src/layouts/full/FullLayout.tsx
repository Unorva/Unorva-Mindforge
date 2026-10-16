import { FC } from 'react';
import Sidebar from './vertical/sidebar/Sidebar';
import Header from './vertical/header/Header';
import { SidebarInset, SidebarProvider } from 'src/components/ui/sidebar';
import { cn } from 'src/lib/utils';
import { Outlet } from 'react-router';
import WorkspaceBackground from '@/components/shared/workspace-background';

const FullLayout: FC = () => {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ '--sidebar-width-icon': '52px' } as React.CSSProperties}
    >
      <Sidebar />

      <SidebarInset className="outline outline-border m-2 rounded-none! overflow-hidden">
        {/* Top Header  */}
        <Header />

        {/* Body Content  */}
        <WorkspaceBackground>
          <div className={cn('w-full mx-auto', 'container')}>
            <div className=" min-h-[calc(100vh-140px)]">
              <Outlet />
            </div>
          </div>
        </WorkspaceBackground>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default FullLayout;
