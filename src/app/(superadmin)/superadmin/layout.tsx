"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { path: "/superadmin", label: "Dashboard" },
    { path: "/superadmin/admin", label: "Admin" },
    { path: "/superadmin/seller", label: "Seller" },
    { path: "/superadmin/withdrawal", label: "Withdrawal" },
    { path: "/superadmin/product", label: "Product" },
    { path: "/superadmin/task_settings", label: "Task Settings" },
    { path: "/superadmin/social_settings", label: "Social Settings" },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle - always visible on mobile */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-md shadow-md"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } lg:static lg:translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Admin</h2>
          {/* Close button inside sidebar for mobile */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="mt-6">
          <ul>
            {navItems.map((item) => (
              <li key={item.path} className="px-6 py-3">
                <Link
                  href={item.path}
                  className={`flex items-center text-gray-700 hover:text-blue-600 transition-colors duration-200 ${
                    pathname === item.path ? "text-blue-600 font-medium" : ""
                  }`}
                  onClick={() => {
                    // Close sidebar on mobile when a link is clicked
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6 pt-16 lg:pt-6">
        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={toggleSidebar}
          />
        )}

        <main>{children}</main>
      </div>
    </div>
  );
}
