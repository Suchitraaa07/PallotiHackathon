import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getProfileByUserId, loginWithPassword } from "../../auth/authService";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await loginWithPassword(email, password);
      const user = result.user;
      if (!user) {
        throw new Error("Login failed. User session was not created.");
      }

      const profile = await getProfileByUserId(user.id);

      if (profile.role === "hospital") {
        if (profile.verification_status !== "approved") {
          navigate("/waiting-approval", { replace: true });
          return;
        }

        navigate("/hospital-dashboard", { replace: true });
        return;
      }

      navigate("/user-dashboard", { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Login</h1>
        <p className="text-sm text-slate-600 mt-1">Access your account dashboard.</p>

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg py-2.5"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4">
          New user?{" "}
          <Link to="/signup" className="text-green-700 font-medium hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
