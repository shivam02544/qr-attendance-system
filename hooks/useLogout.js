import { signOut } from 'next-auth/react';

export const useLogout = () => {
  const logout = async () => {
    try {
      // Sign out without NextAuth handling the redirect
      await signOut({ redirect: false });
      
      // Clear any additional client-side storage if needed
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear();
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Force redirect to home page using current origin
        window.location.href = window.location.origin + '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: still redirect even if signOut fails
      if (typeof window !== 'undefined') {
        window.location.href = window.location.origin + '/';
      }
    }
  };

  return logout;
};