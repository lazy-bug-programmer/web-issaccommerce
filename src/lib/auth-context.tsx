"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { createClient } from "@/lib/appwrite/client";
import { Models } from "appwrite";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  setUser: (user: Models.User<Models.Preferences> | null) => void;
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = !!user;
  const isSuperAdmin = user?.labels?.includes("SUPERADMIN") || false;
  const isAdmin = user?.labels?.includes("ADMIN") || false;
  const isCustomer = user?.labels?.includes("CUSTOMER") || false;

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await getLoggedInUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error getting logged in user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  const logout = async () => {
    try {
      const client = createClient();
      await client.account.deleteSession("current");
      setUser(null);

      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const value = {
    user,
    setUser,
    isLoggedIn,
    isSuperAdmin,
    isAdmin,
    isCustomer,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
