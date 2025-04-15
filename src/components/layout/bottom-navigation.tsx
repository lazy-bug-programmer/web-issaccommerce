"use client";

import Link from "next/link";
import {
  Home,
  ShoppingBag,
  CheckSquare,
  MessageCircle,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function BottomNavigation() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* WhatsApp floating button */}
      <Link href="/contact">
        <button
          className="p-1 fixed bottom-20 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-50"
          aria-label="Contact via WhatsApp"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="70"
            height="70"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.72.043.419-.101.824z" />
          </svg>
        </button>
      </Link>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center z-40 px-2 shadow-lg">
        <Link
          href="/"
          className="flex flex-col items-center justify-center w-full h-full text-xs group"
        >
          <div className="transform group-hover:-translate-y-1 transition-transform">
            <Home className="h-6 w-6 mb-1 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="group-hover:text-blue-500 transition-colors">
            Home
          </span>
        </Link>
        <Link
          href="/orders"
          className="flex flex-col items-center justify-center w-full h-full text-xs group"
        >
          <div className="transform group-hover:-translate-y-1 transition-transform">
            <ShoppingBag className="h-6 w-6 mb-1 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="group-hover:text-blue-500 transition-colors">
            Orders
          </span>
        </Link>

        {/* Enhanced middle Tasks button */}
        <Link
          href="/task"
          className="flex flex-col items-center justify-center w-full h-full text-xs relative -mt-5"
        >
          <div className="absolute -top-6 p-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-xl border-4 border-white dark:border-gray-950 transform hover:scale-110 transition-transform">
            <CheckSquare className="h-7 w-7 text-white" />
          </div>
          <span className="mt-11 font-semibold text-blue-500">Tasks</span>
        </Link>

        <Link
          href="/contact"
          className="flex flex-col items-center justify-center w-full h-full text-xs group"
        >
          <div className="transform group-hover:-translate-y-1 transition-transform">
            <MessageCircle className="h-6 w-6 mb-1 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="group-hover:text-blue-500 transition-colors">
            Contact
          </span>
        </Link>
        <Link
          href="/my"
          className="flex flex-col items-center justify-center w-full h-full text-xs group"
        >
          <div className="transform group-hover:-translate-y-1 transition-transform">
            <User className="h-6 w-6 mb-1 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="group-hover:text-blue-500 transition-colors">
            Profile
          </span>
        </Link>
      </div>
    </>
  );
}
