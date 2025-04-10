"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MainNav() {
  const pathname = usePathname();

  // Mock auth data
  const user = {
    name: "Test User",
    email: "user@example.com",
    role: "admin", // Change to "seller" or null to test different views
  };

  const logout = () => {
    console.log("User logged out");
  };

  const isAdmin = user?.role === "admin";
  const isSeller = user?.role === "seller";

  const routes = [
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Dashboard",
            active: pathname === "/admin",
          },
          {
            href: "/admin/sellers",
            label: "Sellers",
            active: pathname === "/admin/sellers",
          },
          {
            href: "/admin/tasks",
            label: "Tasks",
            active: pathname === "/admin/tasks",
          },
          {
            href: "/admin/animations",
            label: "Animations",
            active: pathname === "/admin/animations",
          },
          {
            href: "/admin/shipments",
            label: "Shipments",
            active: pathname === "/admin/shipments",
          },
        ]
      : []),
    ...(isSeller
      ? [
          {
            href: "/seller",
            label: "Dashboard",
            active: pathname === "/seller",
          },
          {
            href: "/seller/products",
            label: "Products",
            active: pathname === "/seller/products",
          },
          {
            href: "/seller/shipments",
            label: "Shipments",
            active: pathname === "/seller/shipments",
          },
        ]
      : []),
  ];

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
      {user && (
        <Button variant="ghost" onClick={logout}>
          Logout
        </Button>
      )}
    </nav>
  );
}
