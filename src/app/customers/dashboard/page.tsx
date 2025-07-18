"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface MachineStats {
  id: string;
  approval_status: string;
  onboarding_status: string;
  created_at: string;
}

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [machines, setMachines] = useState<MachineStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomerMachines = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_machines")
        .select("id, approval_status, onboarding_status, created_at")
        .eq("customer_id", user.id);
      if (!error) setMachines(data || []);
      setLoading(false);
    };
    if (user && user.role === "customer") {
      loadCustomerMachines();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }
  if (!user || user.role !== "customer") {
    return null;
  }

  const totalMachines = machines.length;
  const activeMachines = machines.filter(m => m.approval_status === "approved").length;
  const pendingMachines = machines.filter(m => m.approval_status === "pending").length;
  const recentMachines = machines.filter(m => {
    const createdAt = new Date(m.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt > thirtyDaysAgo;
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h1>
        <p className="text-gray-600">Manage your vending machines and track your earnings</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Machines</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? "..." : totalMachines}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Active Machines</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? "..." : activeMachines}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Pending Approval</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? "..." : pendingMachines}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Recent (30 days)</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? "..." : recentMachines}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/customers/dashboard/machines" className="block text-blue-600 hover:underline">
              View My Machines
            </Link>
            <Link href="/browse-operators" className="block text-blue-600 hover:underline">
              Browse Operators
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {loading ? (
            <div>Loading...</div>
          ) : machines.length === 0 ? (
            <div>No machines yet</div>
          ) : (
            <ul>
              {machines.slice(0, 3).map(machine => (
                <li key={machine.id} className="mb-2">
                  Machine #{machine.id.slice(0, 8)} - {machine.approval_status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 