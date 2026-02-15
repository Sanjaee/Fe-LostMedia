import "@/styles/globals.css";
import type { AppProps } from "next/app";
import type { AppContext } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { ApiProvider } from "@/components/contex/ApiProvider";
import { SessionRefreshListener, RoleUpdateWebSocketListener } from "@/components/auth/SessionRefreshListener";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ChatProvider } from "@/contexts/ChatContext";
import MainNavbar from "@/components/general/MainNavbar";
import BanDialog from "@/components/general/BanDialog";
import { useRouter } from "next/router";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface AppContentProps {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}

function AppContent({ Component, pageProps }: AppContentProps) {
  const router = useRouter();
  const isAuthPage = useMemo(
    () => router.pathname.startsWith("/auth"),
    [router.pathname]
  );

  return (
    <div className={cn(geistSans.variable, geistMono.variable)}>
      {!isAuthPage && <MainNavbar />}
      {!isAuthPage && <BanDialog />}
      <Component {...pageProps} />
    </div>
  );
}

function AuthAwareLayout({
  Component,
  pageProps,
}: {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}) {
  const router = useRouter();
  const isAuthPage = useMemo(
    () => router.pathname.startsWith("/auth"),
    [router.pathname]
  );

  // On auth pages (login, register, etc.) skip WebSocket/Chat so session isn't refetched in a loop
  if (isAuthPage) {
    return (
      <>
        <AppContent Component={Component} pageProps={pageProps} />
        <Toaster />
      </>
    );
  }
  return (
    <WebSocketProvider>
      <RoleUpdateWebSocketListener />
      <ChatProvider>
        <AppContent Component={Component} pageProps={pageProps} />
        <Toaster />
      </ChatProvider>
    </WebSocketProvider>
  );
}

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <div className={cn(geistSans.variable, geistMono.variable)}>
      <ThemeProvider attribute="class" defaultTheme="dark" >
        <SessionProvider
          session={session}
          refetchInterval={0}
          refetchOnWindowFocus={false}
          refetchWhenOffline={false}
        >
          <SessionRefreshListener />
          <ApiProvider>
            <AuthAwareLayout Component={Component} pageProps={pageProps} />
          </ApiProvider>
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}

// Supply session from server on first load so SessionProvider skips initial client fetch (stops session loop)
// Dynamic import avoids pulling node-only modules (e.g. from [...nextauth]) into client bundle (node:net error)
App.getInitialProps = async (appContext: AppContext) => {
  const ctx = appContext.ctx;
  let pageProps: Record<string, unknown> = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(ctx);
  }
  let session = undefined;
  if (typeof window === "undefined" && ctx.req && ctx.res) {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/pages/api/auth/[...nextauth]");
    // Next.js adds cookies to req at runtime; cast for getServerSession typing
    const reqWithCookies = ctx.req as typeof ctx.req & { cookies: Partial<{ [key: string]: string }> };
    session = await getServerSession(reqWithCookies, ctx.res, authOptions);
  }
  return { pageProps: { ...pageProps, session } };
};

export default App;
