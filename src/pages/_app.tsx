import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { ApiProvider } from "@/components/contex/ApiProvider";
import MainNavbar from "@/components/general/MainNavbar";
import { useRouter } from "next/router";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isAuthPage, setIsAuthPage] = useState(false);

  useEffect(() => {
    setIsAuthPage(router.pathname.startsWith("/auth"));
  }, [router.pathname]);

  return (
    <div className={cn(geistSans.variable, geistMono.variable)}>
      {!isAuthPage && <MainNavbar />}
      <Component {...pageProps} />
    </div>
  );
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <div className={cn(geistSans.variable, geistMono.variable)}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <SessionProvider session={session}>
          <ApiProvider>
            <AppContent Component={Component} pageProps={pageProps} />
            <Toaster />
          </ApiProvider>
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}
