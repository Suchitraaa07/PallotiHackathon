import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { type AppRole, signUpWithRole } from "../../auth/authService";

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await signUpWithRole({ name, email, password, role });
      setSuccess("Signup successful. Please login to continue.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (signupError) {
      setError(
        signupError instanceof Error ? signupError.message : "Signup failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
        <p className="text-sm text-slate-600 mt-1">Signup with role-based access.</p>

        <form onSubmit={handleSignup} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

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
              minLength={6}
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as AppRole)}
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="user">User</option>
              <option value="hospital">Hospital</option>
            </select>
          </div>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 rounded-lg">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg py-2.5"
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-green-700 font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
