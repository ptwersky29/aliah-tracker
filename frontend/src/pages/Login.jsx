import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookMarked, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { API } from "../lib/api";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "register" ? "register" : "login";
      const body = mode === "register" ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password };
      const { data } = await axios.post(`${API}/auth/${endpoint}`, body);
      localStorage.setItem("pinkas_token", data.token);
      navigate("/app");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
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

          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">{mode === "login" ? "Sign in" : "Create account"}</h2>
          <p className="text-sm text-ink-500 mt-1.5 mb-8">
            {mode === "login" ? "Sign in with your email." : "Register to access the app."}
          </p>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="Your name"
                  className="input w-full"
                  autoFocus={mode === "register"}
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@shul.org"
                className="input w-full"
                autoFocus={mode === "login"}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger-600 bg-danger-50 border border-danger-500/20 px-3 py-2 rounded-md">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-400 disabled:cursor-not-allowed px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-card"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-sm text-ink-500 text-center mt-6">
            {mode === "login" ? (
              <>Don't have an account?{" "}<button onClick={() => { setMode("register"); setError(""); }} className="font-semibold text-brand-700 hover:text-brand-800">Register</button></>
            ) : (
              <>Already have an account?{" "}<button onClick={() => { setMode("login"); setError(""); }} className="font-semibold text-brand-700 hover:text-brand-800">Sign in</button></>
            )}
          </p>

          <p className="text-xs text-ink-400 text-center mt-6">
            This is a private system for authorised shul officers only.
          </p>
        </div>
      </div>
    </div>
  );
}
