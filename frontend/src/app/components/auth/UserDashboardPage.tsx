import { useNavigate } from "react-router-dom";

import { signOutUser } from "../../auth/authService";

export function UserDashboardPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOutUser();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">User Dashboard</h1>
        <p className="text-slate-600 mt-2">Welcome. Your role is user.</p>
        <button
          onClick={handleLogout}
          className="mt-5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
