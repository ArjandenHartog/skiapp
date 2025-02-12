import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Link from "next/link";
import AuthProvider from "./providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ski Tracker",
  description: "Track your skiing metrics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <nav className="bg-white shadow-md p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link href="/" className="text-xl font-bold">
                Ski Tracker
              </Link>
              <div className="space-x-4">
                {session ? (
                  <div className="flex items-center gap-4">
                    <span>Welcome, {session.user?.name || session.user?.email}</span>
                    <Link
                      href="/api/auth/signout"
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Sign Out
                    </Link>
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
