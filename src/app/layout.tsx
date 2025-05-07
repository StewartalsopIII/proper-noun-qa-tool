import type { Metadata } from "next";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proper Noun QA Tool",
  description: "A tool for identifying and correcting proper nouns in transcripts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Add console log to check if Clerk keys are loaded
  console.log("Clerk key exists:", !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  console.log("Clerk key value:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 5) + "...");
  
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <header className="w-full flex justify-end items-center p-4 bg-blue-200 shadow-sm border-b border-gray-300">
            <SignedOut>
              <SignInButton mode="modal" />
              <div className="ml-4 inline-block">
                <SignUpButton mode="modal" />
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
