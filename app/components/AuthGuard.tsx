'use client';

import { useState, useEffect } from 'react';
import { isAuthenticated } from '../../lib/auth';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const checkAuth = () => {
      const valid = isAuthenticated();
      if (!valid) {
        router.push('/auth');
        return;
      }
      setIsAuthed(true);
    };
    checkAuth();
  }, [router]);

  // Prevent any flash of protected content by showing nothing until auth is confirmed
  if (!mounted) {
    return null;
  }

  if (!isAuthed) {
    return null; // Redirect is in progress
  }

  return <>{children}</>;
}
