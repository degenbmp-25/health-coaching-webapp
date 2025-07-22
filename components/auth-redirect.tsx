"use client"

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      redirect("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  if (isLoaded && isSignedIn) {
    return null; 
  }

  return <>{children}</>;
} 