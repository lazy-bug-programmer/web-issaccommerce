"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function AuthButtons() {
  const { isLoggedIn, logout } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="mt-12 flex justify-center gap-4">
        <Button onClick={logout} size="lg">
          Logout
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/product">View More Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-12 flex justify-center gap-4">
      <Button asChild size="lg">
        <Link href="/login">Login</Link>
      </Button>
    </div>
  );
}
