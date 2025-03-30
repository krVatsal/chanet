"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bot, Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"; 
import { NavBar } from "@/components/navbar";
export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  interface User {
    displayName: string,
  _id: string
  }

  const [user, setUser] = useState<User>();
  const {toast} = useToast()
  const logoutHandler = async () => {
    try {
      const response = await fetch("https://chanet-974929463300.asia-south2.run.app/auth/logout", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        setIsLoggedIn(false);
        setUser(undefined);
        localStorage.removeItem("userId");
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
  }

  useEffect(() => {
    // Check login status
    const checkLoginStatus = async () => {
      try {
        const response = await fetch("https://chanet-974929463300.asia-south2.run.app/auth/status", {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn) {
            console.log(data.user);
            setIsLoggedIn(true);
            setUser(data.user);
          } else {
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error verifying login status", error);
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
  }, []);
  useEffect(() => {
    if(user?._id){
      localStorage.setItem("userId", user._id);
    }
  }, [user])
  return (
<div className="min-h-screen bg-background">
      <NavBar isLoggedIn={isLoggedIn} onLogout={logoutHandler} />

      <main className="container px-4 py-24">
        <div className="flex flex-col items-center text-center">

          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Your Coding Companion
          </h1>
          <p className="mt-4 text-muted-foreground sm:text-xl">
            Generate code instantly with Chanet
          </p>
          <div className="mt-8">
            {isLoggedIn ? (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" className="h-12">
                      <Code2 className="mr-2 h-4 w-4" />
                      Generate Code
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Welcome, {user?.displayName}!</AlertDialogTitle>
                      <AlertDialogDescription>
                        You're successfully logged in. Ready to generate some code?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction>
                      <Link href="/code">
                        <Button size="lg" className="h-12">
                          Start Generating
                        </Button>
                      </Link>
                    </AlertDialogAction>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Link href="https://chanet-974929463300.asia-south2.run.app/auth/github">
                <Button size="lg" className="h-12">
                  <Code2 className="mr-2 h-4 w-4" />
                  Log In to Generate Code
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
