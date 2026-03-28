import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { getCurrentUserWithProfile, type AppRole } from "../../auth/authService";

function LoadingGate() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center">
      <p className="text-slate-700">Checking access...</p>
    </main>
  );
}

export function AuthRequiredGuard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        const { user } = await getCurrentUserWithProfile();
        if (!isMounted) {
          return;
        }
        setIsAuthenticated(Boolean(user));
      } catch {
        if (!isMounted) {
          return;
        }
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <LoadingGate />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RoleGuard({ role }: { role: AppRole }) {
  const [isLoading, setIsLoading] = useState(true);
  const [decision, setDecision] = useState<"allow" | "login" | "pending" | "deny">("login");

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        const { user, profile } = await getCurrentUserWithProfile();

        if (!isMounted) {
          return;
        }

        if (!user || !profile) {
          setDecision("login");
          return;
        }

        if (profile.role !== role) {
          setDecision("deny");
          return;
        }

        if (role === "hospital" && profile.verification_status !== "approved") {
          setDecision("pending");
          return;
        }

        setDecision("allow");
      } catch {
        if (!isMounted) {
          return;
        }
        setDecision("login");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [role]);

  if (isLoading) {
    return <LoadingGate />;
  }

  if (decision === "login") {
    return <Navigate to="/login" replace />;
  }

  if (decision === "pending") {
    return <Navigate to="/waiting-approval" replace />;
  }

  if (decision === "deny") {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export function UserRoleGuard() {
  return <RoleGuard role="user" />;
}

export function HospitalRoleGuard() {
  return <RoleGuard role="hospital" />;
}
