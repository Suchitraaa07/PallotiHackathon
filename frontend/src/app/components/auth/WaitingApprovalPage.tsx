"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, RefreshCw } from "lucide-react";
import { getCurrentUser, getProfileByUserId } from "../../auth/authService";
import { supabase } from "../../../lib/supabaseClient";

async function isHospitalInDatabase(hospitalName: string): Promise<boolean> {
  if (!supabase || !hospitalName.trim()) {
    return false;
  }

  const normalized = hospitalName.trim();

  // Try exact name first, then fallback to contains match for slight naming differences.
  const exact = await supabase
    .from("hospitals")
    .select("id,name")
    .ilike("name", normalized)
    .limit(1);

  if (exact.error) {
    console.error("Error checking hospital exact match:", exact.error);
    return false;
  }

  if (exact.data && exact.data.length > 0) {
    return true;
  }

  const partial = await supabase
    .from("hospitals")
    .select("id,name")
    .ilike("name", `%${normalized}%`)
    .limit(1);

  if (partial.error) {
    console.error("Error checking hospital partial match:", partial.error);
    return false;
  }

  return Boolean(partial.data && partial.data.length > 0);
}

export function WaitingApprovalPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  // Check hospital table match on mount and periodically.
  useEffect(() => {
    let isMounted = true;

    const checkApprovalStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const profile = await getProfileByUserId(user.id);
        if (!profile) {
          setMessage("Error loading profile");
          setLoading(false);
          return;
        }

        const hospitalExists = await isHospitalInDatabase(profile.name);

        // If hospital is found in hospitals table, allow dashboard access.
        if (hospitalExists) {
          navigate("/hospital-dashboard", { replace: true });
          return;
        }

        if (!isMounted) {
          return;
        }

        setMessage("Hospital not found in hospitals table yet.");
        setLoading(false);
      } catch (error) {
        console.error("Error checking approval:", error);
        if (isMounted) {
          setMessage("Error checking status. Try refreshing.");
          setLoading(false);
        }
      }
    };

    checkApprovalStatus();

    const timer = window.setInterval(() => {
      void checkApprovalStatus();
    }, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [navigate]);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const profile = await getProfileByUserId(user.id);
      if (!profile) {
        setMessage("Error loading profile");
        setChecking(false);
        return;
      }

      const hospitalExists = await isHospitalInDatabase(profile.name);

      // If found in hospitals table, redirect.
      if (hospitalExists) {
        setMessage("Hospital found. Redirecting...");
        setTimeout(() => {
          navigate("/hospital-dashboard", { replace: true });
        }, 500);
        return;
      }

      setMessage(
        `Still pending. Hospital name not found yet. Last checked: ${new Date().toLocaleTimeString()}`
      );
      setChecking(false);
    } catch (error) {
      console.error("Error refreshing:", error);
      setMessage("Error checking status. Try again.");
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl bg-white border border-amber-200 shadow-sm rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
            <Clock className="text-amber-600 animate-spin" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Checking Status...</h1>
          <p className="text-slate-600 mt-3">Verifying your hospital account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl bg-white border border-amber-200 shadow-sm rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-amber-600" size={28} />
          <h1 className="text-2xl font-bold text-slate-900">Verification Pending</h1>
        </div>

        <p className="text-slate-700 mt-3">
          Your hospital account has been created successfully!
        </p>

        <p className="text-slate-600 mt-3">
          We are checking your hospital name against the hospitals table in Supabase.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Status:</span> Awaiting hospitals table match
          </p>
          {message && (
            <p className="text-xs text-amber-700 mt-2">{message}</p>
          )}
        </div>

        <div className="space-y-3 mt-6">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-500 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw size={18} className={checking ? "animate-spin" : ""} />
            {checking ? "Checking..." : "Check Status"}
          </button>

          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-lg font-semibold transition"
          >
            Back to Login
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          Once your hospital name exists in Supabase hospitals table, you'll be redirected automatically.
        </p>
      </div>
    </main>
  );
}
