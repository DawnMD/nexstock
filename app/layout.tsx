import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NexStock",
    template: "%s · NexStock",
  },
  description: "Inbound warehouse management system",
  applicationName: "NexStock",
  appleWebApp: { title: "NexStock", capable: true },
  // Next.js fills og:/twitter: title and description from the resolved page
  // metadata, so per-page values flow through without repeating them here.
  openGraph: { type: "website", siteName: "NexStock" },
  twitter: { card: "summary" },
  // Every route is behind a session guard, so there is nothing here worth
  // indexing — and order numbers and SKUs should not leak into search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Android: shrink the layout viewport when the on-screen keyboard opens, so
  // the dvh-sized shell and its scroll region follow the focused field instead
  // of leaving it under the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCReactProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors closeButton position="top-right" />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
