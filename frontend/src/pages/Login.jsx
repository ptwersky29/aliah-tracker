import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookMarked } from "lucide-react";
import { API } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("pinkas_token", token);
      navigate("/app", { replace: true });
    }
  }, [searchParams, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${API}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 relative overflow-hidden items-center justify-center">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-700/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative text-center px-12 max-w-lg">
          <div className="w-16 h-16 rounded-xl bg-brand-700 border border-white/10 flex items-center justify-center mx-auto mb-8">
            <BookMarked className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="text-white/50 mt-4 text-lg leading-relaxed">
            Sign in to manage this week's auction, review member balances, and keep your shul's ledger up to date.
          </p>
          <div className="mt-12 space-y-6 text-left">
            {["Track weekly aliyos auctions", "View member balances & payments", "Generate reports & insights"].map((text) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-white/70 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-brand-700 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Pinkas</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">Auction Ledger</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Sign in</h2>
          <p className="text-sm text-ink-500 mt-1.5 mb-8">Sign in with your Google account to access the app.</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full inline-flex items-center justify-center gap-3 bg-white text-ink-900 hover:bg-surface2 border border-line2 px-5 py-3 rounded-lg text-sm font-semibold transition-all shadow-card"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <p className="text-xs text-ink-400 text-center mt-10">
            This is a private system for authorised shul officers only.
          </p>
        </div>
      </div>
    </div>
  );
}
