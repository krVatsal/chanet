import React from 'react';
import { Skeleton } from './ui/skeleton';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

const LoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <Link href="/" className="flex items-center space-x-2">
            <Bot className="h-6 w-6" />
            <span className="text-lg font-bold">Chanet</span>
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <main className="flex-1 container px-4 py-4 grid grid-rows-[auto,1fr] gap-4">
          {/* Input area skeletons */}
          <div className="flex gap-2">
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 w-12" />
          </div>

          {/* Editor area skeleton */}
          <Skeleton className="h-full rounded-lg" />
        </main>

        {/* Right sidebar skeleton */}
        <div className="w-[35%] p-4">
          <div className="flex flex-col gap-4">
            {/* Chat message skeletons */}
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
            
            {/* Implementation steps skeleton */}
            <div className="mt-8">
              <Skeleton className="h-8 w-48 mb-4" />
              {[1, 2].map((i) => (
                <Skeleton key={`step-${i}`} className="h-32 w-full mb-4" />
              ))}
            </div>
            
            {/* Datasets skeleton */}
            <Skeleton className="h-8 w-48 mb-4" />
            {[1, 2].map((i) => (
              <Skeleton key={`dataset-${i}`} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;