"use client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import ClientSkiMetrics from '../components/ClientSkiMetrics';

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Welcome back, {session.user?.name || session.user?.email}</h1>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Current Metrics</h2>
              <ClientSkiMetrics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}