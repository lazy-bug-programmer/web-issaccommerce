import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

// Import the client component with dynamic import to avoid SSR
const BottomNavigation = dynamic(
  () => import("@/components/layout/bottom-navigation")
);

export const metadata: Metadata = {
  title: "E-commerce Platform",
  description: "A e-commerce platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto container pb-20">{children}</main>
          <BottomNavigation />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
