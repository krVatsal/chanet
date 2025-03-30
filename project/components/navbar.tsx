import { Bot, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { useState } from 'react';
import ChatSidebar from './chat-sidebar';

interface NavBarProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function NavBar({ isLoggedIn, onLogout }: NavBarProps) {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            {isLoggedIn && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6" />
              <span className="text-lg font-bold">Chanet</span>
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {isLoggedIn && <Button onClick={onLogout}>Logout</Button>}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {isLoggedIn && <ChatSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />}
    </>
  );
}