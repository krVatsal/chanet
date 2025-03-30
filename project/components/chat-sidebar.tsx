import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { MessageSquarePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
interface ChatSession {
  id: string;
  title: string;
  lastActive: string;
  messageCount: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (isOpen && userId) {
      const socket = io('https://chanet-974929463300.asia-south2.run.app');
      
      socket.emit('get-sessions', { userId });
      
      socket.on('sessions-result', (data) => {
        setSessions(data.sessions);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isOpen, userId]);

  const createNewChat = () => {
    const socket = io('https://chanet-974929463300.asia-south2.run.app');
    socket.emit('create-session', { 
      userId,
      title: 'New Chat' 
    });

    socket.on('session-created', (data) => {
      router.push(`/code?session=${data.sessionId}`);
    });
  };

  const openChat = (sessionId: string) => {
    router.push(`/code?session=${sessionId}`);
  };

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out z-50",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Chat History</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        <Button 
          className="w-full justify-start space-x-2" 
          onClick={createNewChat}
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {sessions.map((session) => (
            <Button
              key={session.id}
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => openChat(session.id)}
            >
              <div className="truncate">
                <p className="font-medium">{session.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.lastActive).toLocaleDateString()} • 
                  {session.messageCount} messages
                </p>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}