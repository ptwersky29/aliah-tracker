import React from "react";
import { useLocation } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { BookMarked } from "lucide-react";

export default function Login() {
  const { pathname } = useLocation();
  const isSignUp = pathname.startsWith("/sign-up");

  return (
    <div className="min-h-screen bg-canvas flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 relative overflow-hidden items-center justify-center">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-700/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative text-center px-12 max-w-lg">
          <div className="w-16 h-16 rounded-xl bg-brand-700 border border-white/10 flex items-center justify-center mx-auto mb-8">
            <BookMarked className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
          {isSignUp ? (
            <>
              <h2 className="text-3xl font-bold text-white tracking-tight">Create account</h2>
              <p className="text-white/50 mt-4 text-lg leading-relaxed">
                Sign up to start managing your shul's auction ledger.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-white/50 mt-4 text-lg leading-relaxed">
                Sign in to manage this week's auction, review member balances, and keep your shul's ledger up to date.
              </p>
            </>
          )}
        </div>
      </div>
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
          {isSignUp ? (
            <SignUp routing="path" path="/sign-up" signInUrl="/login" />
          ) : (
            <SignIn routing="path" path="/login" signUpUrl="/sign-up" />
          )}
        </div>
      </div>
    </div>
  );
}
