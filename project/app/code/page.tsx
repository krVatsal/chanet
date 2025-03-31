"use client"
import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import Link from 'next/link'
import { Bot, Send,User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThemeToggle } from '@/components/theme-toggle'
import Editor from "@monaco-editor/react"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import MonacoEditorWithIpynbDownload from '@/components/Editor'
import { get } from 'node:http'
import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/navbar'
import { useSearchParams } from 'next/navigation';
import LoadingSkeleton from '@/components/skeleton'
import { set } from 'date-fns'
interface ChatMessage {
  role: 'user' | 'assistant';
  type?: 'user' | 'assistant';  // Optional for backward compatibility
  content: string;
  trainingData?: string;
  datasets?: any;
  timestamp: Date;
  userId?: string | null;
}

interface HistoryResult {
  isEmpty: boolean;
  messages: ChatMessage[];
  sessionId?: string;
  title?: string;
  lastResponse?: string;
  datasets?: any;
}
export default function CodePage() {
  const [socket, setSocket] = useState<any>(null);
  const [trainingData, setTrainingData] = useState('');
  const [prompt, setPrompt] = useState('')
  const [code, setCode] = useState('// Generated code will appear here')
  const [displayedCode, setDisplayedCode] = useState('// Generated code will appear here')
  const [steps, setSteps] = useState<Array<{title: string, description: string}>>([]);
  const [displayedSteps, setDisplayedSteps] = useState<Array<{title: string, description: string}>>([]);
  const [datasets, setDatasets] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [initiated, setInitiated] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [auth, isAuth] =useState(false)
  const [skeleton, setSkeleton]= useState(true)
  const [isPrinting, setIsPrinting]= useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
const router= useRouter()
useEffect(() => {
  const checkAuth = async () => {
    try {
      const response = await fetch('https://chanet-974929463300.asia-south2.run.app/auth/status', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        router.push('/');
        throw new Error('Not authenticated');
      }

      const data = await response.json();
      console.log(data)
      isAuth(true);
      setSkeleton(false);
      // Set userId from localStorage
      const storedUserId = localStorage.getItem("userId");
      setUserId(storedUserId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify authentication status. Please try again.",
        duration: 3000,
      });
      router.push('/');
    }
  };

  checkAuth();
}, [router]);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  const typewriterRef = useRef<any>(null);

  const typewriterEffect = async (text: string, setter: (text: string) => void, speed = 0.5) => {
    setIsLoading(true);
    const chunkSize = 10; // Increased chunk size
    let currentText = '';
    
    const animate = async (timestamp: number) => {
      const chunk = text.slice(currentText.length, currentText.length + chunkSize);
      if (chunk) {
        currentText += chunk;
        setter(currentText);
        requestAnimationFrame(animate);
      } else {
        setIsLoading(false);
      }
    };
    
    requestAnimationFrame(animate);
};

  const typewriterStepsEffect = async (steps: Array<{title: string, description: string}>, speed = 0.5) => {
    const displaySteps: Array<{title: string, description: string}> = [];
    
    for (const step of steps) {
      displaySteps.push({ title: '', description: '' });
      setDisplayedSteps([...displaySteps]);
      
      // Type the title
      let currentTitle = '';
      for (let i = 0; i < step.title.length; i++) {
        currentTitle += step.title[i];
        displaySteps[displaySteps.length - 1].title = currentTitle;
        setDisplayedSteps([...displaySteps]);
        await new Promise(resolve => setTimeout(resolve, speed));
      }
      
      // Type the description
      let currentDesc = '';
      for (let i = 0; i < step.description.length; i++) {
        currentDesc += step.description[i];
        displaySteps[displaySteps.length - 1].description = currentDesc;
        setDisplayedSteps([...displaySteps]);
        await new Promise(resolve => setTimeout(resolve, speed / 2));
      }
    }
    setIsLoading(true)
  };

  useEffect(() => {
    const newSocket = io('https://chanet-974929463300.asia-south2.run.app', {
      transports: ['websocket']
    });
  
    let accumulatedResponse = '';
    let debounceTimer: NodeJS.Timeout;
  
    newSocket.on('generate-response-chunk', (data) => {
      accumulatedResponse += data.chunk;
      
      // Debounce the parsing to prevent too frequent updates
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        parseGeminiResponse(accumulatedResponse, true);
      }, 16); // Roughly 60fps
    });
  
    newSocket.on('generate-response-result', (data) => {
      console.log("hii2",data);
      setIsLoading(false);
      parseGeminiResponse(data.response, false);
      accumulatedResponse = ''; // Reset accumulated response
      if (data.datasets) {
        console.log("hii3",data.datasets)
        setDatasets(data.datasets);
      }
    });
  
    newSocket.on('error', (errorData) => {
      setIsLoading(false);
              toast({
          variant: "destructive",
          title: "Error",
          description: errorData.message, 
          duration: 3000,
        });
    });
  
    setSocket(newSocket);
  
    return () => {
      newSocket.disconnect();
    };
  }, []);



  const parseGeminiResponse = async (response: string, isStreaming: boolean) => {
    try {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
      }
  
      // Reset states if not streaming
      if (!isStreaming) {
        setDisplayedCode('');
        setDisplayedSteps([]);
      }
  
      const hasCompleteTags = response.includes('</ChanetTags>') && response.includes('</code>');
      if (isStreaming) {
        const partialCodeMatch = response.match(/<code>([\s\S]*?)(?:<\/code>|$)/);
        if (partialCodeMatch) {
          setDisplayedCode(partialCodeMatch[1].trim());
        }
        return; // Skip other processing while streaming
      }
  
      // Extract and set steps
      const tagsMatch = response.match(/<ChanetTags>([\s\S]*?)<\/ChanetTags>/);
      if (tagsMatch) {
        const tags = tagsMatch[1].trim().split('\n').map(tag => {
          const [title, ...descParts] = tag.trim().split(':');
          return {
            title: title.replace(/^\d+\.\s*/, '').trim(),
            description: descParts.join(':').trim()
          };
        });
        setSteps(tags);
        setDisplayedSteps(tags); // No animation for steps
      }

      const codeMatch = response.match(/<code>([\s\S]*?)<\/code>/);
      if (codeMatch) {
        const newCode = codeMatch[1].trim();
        setCode(newCode);
        setDisplayedCode(newCode); // No animation for final code
      }
  
      setInitiated(true);
    } catch (err) {
      console.error('Error parsing Gemini response:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error parsing the response", 
        duration: 3000,
      });
    }
  };
  useEffect(() => {
    if (sessionId && socket && userId) {
      const handleHistoryResult = (data: HistoryResult) => {
        if (!data.isEmpty) {
          // Clean chat messages before setting
          const cleanedMessages = data.messages.map(msg => ({
            ...msg,
            content: msg.role === 'assistant' ? 
               "Ok let me help you with that...": 
              msg.content 
          }));
          
          setChatMessages(cleanedMessages);
          
          // Parse the last complete response to restore UI state
          if (data.lastResponse) {
            parseGeminiResponse(data.lastResponse, false);
            console.log("hii4",data)
          }
          
          // Restore datasets
          if (data.datasets) {
            console.log("hii",data.datasets)
            setDatasets(data.datasets);
          }
          
          setInitiated(true);
        }
      };
  
      socket.emit('get-history', { userId, sessionId });
      socket.on('history-result', handleHistoryResult);
  
      return () => {
        socket.off('history-result', handleHistoryResult);
      };
    }
  }, [sessionId, socket, userId]);
  const handleSubmit = (e: React.FormEvent) => {
    if(!prompt.trim()) return;
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setInitiated(true);
    setDisplayedSteps([]);
    setDisplayedCode('');
    setDatasets([]);
    
    setChatMessages(prev => [
      ...prev,
      {
        role: 'user',  // Changed from type to role
        content: prompt,
        trainingData: trainingData.trim() || undefined,
        timestamp: new Date(),
        userId: localStorage.getItem("userId")
      }
    ]);
    
    let parsedTrainingData = null;
    if (trainingData.trim()) {
      try {
        parsedTrainingData = JSON.parse(trainingData);
      } catch (err) {
        setError('Training Data must be valid JSON.');
        return;
      }
    }
    
    setPrompt('');
    setTrainingData('');
    
    socket.emit('generate-response', {
      userPrompt: prompt,
      trainingData: parsedTrainingData,
      userId: localStorage.getItem("userId"),
      sessionId: sessionId || Date.now().toString()
    });
  };

  if(skeleton){
    return(
      <LoadingSkeleton/>
    )
  }
  const logoutHandler = async () => {
    try {
      const response = await fetch("https://chanet-974929463300.asia-south2.run.app/auth/logout", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        router.push('/');
      }
      toast({
        variant: "default",
        title: "Success",
        description: "Logged Out successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error logging out", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again.",
        duration: 3000,
      });
    }
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar isLoggedIn={auth} onLogout={logoutHandler} />


      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <main className={`flex-1 container px-4 py-4 grid grid-rows-[auto,1fr] gap-4 transition-all duration-300 ease-in-out ${initiated ? 'w-[65%]' : 'w-full'}`}>
          <div className="flex gap-2">
            <Textarea
              placeholder="Describe the code you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Textarea
              placeholder="Sample Training Data (Optional, must be JSON)"
              value={trainingData}
              onChange={(e) => setTrainingData(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              onClick={handleSubmit} 
              className="h-full flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="loader h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full animate-spin"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="h-full rounded-lg border overflow-hidden">
          <MonacoEditorWithIpynbDownload isPrinting={isLoading} code={displayedCode} />
          </div>
        </main>

       <div 
          className={`transition-all duration-300 ease-in-out flex flex-col ${
            initiated ? 'w-[35%] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4 overflow-hidden" ref={chatContainerRef}>
            {chatMessages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-[85%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    <span className="font-medium">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  {message.trainingData && (
                    <div className="mt-2 text-xs bg-background/10 p-2 rounded">
                      <div className="font-medium">Training Data:</div>
                      <pre className="whitespace-pre-wrap">{message.trainingData}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {displayedSteps.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-4">Implementation Steps</h3>
                <div className="flex flex-col gap-4">
                  {displayedSteps.map((step, index) => (
                    <div key={index} className="rounded-lg border p-4 bg-muted/30">
                      <h4 className="font-medium text-primary mb-2">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

{datasets.length == 0 && isLoading ? (
              <div className="loader h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full animate-spin"></div>
            ): (
              <div>
              <h3 className="text-lg font-semibold mb-4">Recommended Datasets</h3>
              <div className="flex flex-col gap-2">
                {datasets.map((dataset: any, index) => (
                  <a
                    key={index}
                    href={dataset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-muted p-2 rounded hover:bg-muted/80 transition-colors"
                  >
                    {dataset.title}
                  </a>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}