import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  AUTH_RATE_LIMIT_COOLDOWN_SECONDS,
  getProfileByUserId,
  isRateLimitAuthError,
  loginWithPassword,
  resendSignupVerificationEmail,
} from "../../auth/authService";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownSeconds(0);
        window.clearInterval(interval);
        return;
      }
      setCooldownSeconds(remaining);
    }, 250);

    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cooldownSeconds > 0) {
      return;
    }

    setError("");
    setNotice("");
    setShowVerificationHelp(false);
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

      navigate("/", { replace: true });
    } catch (loginError) {
      const loginMessage =
        loginError instanceof Error ? loginError.message : "Login failed.";

      const lowerMessage = loginMessage.toLowerCase();
      const shouldShowVerificationHelp =
        lowerMessage.includes("verify your email") ||
        lowerMessage.includes("email not confirmed") ||
        lowerMessage.includes("invalid email or password");

      if (isRateLimitAuthError(loginError)) {
        const until = Date.now() + AUTH_RATE_LIMIT_COOLDOWN_SECONDS * 1000;
        setCooldownUntil(until);
        setCooldownSeconds(AUTH_RATE_LIMIT_COOLDOWN_SECONDS);
      }

      setShowVerificationHelp(shouldShowVerificationHelp && Boolean(email));
      setError(loginMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || isResendingVerification || cooldownSeconds > 0) {
      return;
    }

    setNotice("");
    setError("");
    setIsResendingVerification(true);

    try {
      await resendSignupVerificationEmail(email, `${window.location.origin}/login`);
      setNotice("Verification email sent. Please check inbox and spam folder.");
    } catch (resendError) {
      if (isRateLimitAuthError(resendError)) {
        const until = Date.now() + AUTH_RATE_LIMIT_COOLDOWN_SECONDS * 1000;
        setCooldownUntil(until);
        setCooldownSeconds(AUTH_RATE_LIMIT_COOLDOWN_SECONDS);
      }

      setError(
        resendError instanceof Error
          ? resendError.message
          : "Could not resend verification email."
      );
    } finally {
      setIsResendingVerification(false);
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

          {notice ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
              {notice}
            </p>
          ) : null}

          {showVerificationHelp ? (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-2">
              <p>
                If this email was just signed up, it may still be unverified. Verify email first or resend verification.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification || cooldownSeconds > 0}
                className="inline-flex items-center rounded-md border border-amber-300 px-3 py-1.5 font-medium hover:bg-amber-100 disabled:opacity-60"
              >
                {isResendingVerification ? "Sending..." : "Resend verification email"}
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || cooldownSeconds > 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg py-2.5"
          >
            {isSubmitting
              ? "Logging in..."
              : cooldownSeconds > 0
                ? `Try again in ${cooldownSeconds}s`
                : "Login"}
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
