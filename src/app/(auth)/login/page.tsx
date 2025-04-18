"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getCookie, removeCookie, setCookie } from "typescript-cookie";
import { createClient } from "@/lib/appwrite/client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { lookupUserByPhone } from "@/lib/actions/auth.action";

const formSchema = z.object({
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});

export default function LoginPage() {
  const { setUser } = useAuth();
  const router = useRouter();
  const client = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      const sessionId = getCookie("user-session-id");
      removeCookie("user-session");
      removeCookie("user-session-id");
      await client.account.deleteSession(sessionId!);
    } catch {}

    try {
      // First lookup the user by phone to get their email
      const userLookup = await lookupUserByPhone(values.phone);

      if (!userLookup.email) {
        toast(userLookup.error || "User not found");
        setIsLoading(false);
        return;
      }

      // Then use the email to login on client side
      const session = await client.account.createEmailPasswordSession(
        userLookup.email,
        values.password
      );

      setCookie(
        "user-session",
        String(
          Object.values(JSON.parse(localStorage.getItem("cookieFallback")!))[0]
        )
      );
      setCookie("user-session-id", session.$id);

      const currentUser = await client.account.get();
      setUser(currentUser);

      toast("Login successful, redirecting...");
      router.replace("/");
    } catch {
      toast("Login failed, please try again");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Login
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center flex-wrap">
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
