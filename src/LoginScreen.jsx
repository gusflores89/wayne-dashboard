import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simular pequeño delay para UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verificar contraseña contra variable de entorno
    const correctPassword = import.meta.env.VITE_DASHBOARD_PASSWORD || "demo123";
    
    if (password === correctPassword) {
      // Guardar sesión en localStorage
      localStorage.setItem("rp_authenticated", "true");
      localStorage.setItem("rp_auth_time", Date.now().toString());
      onLogin(true);
    } else {
      setError("Incorrect password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="RetainPlayers" className="w-20 h-20" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Oswald, sans-serif' }}>
            RETAIN<span className="text-[#5DB3F5]">PLAYERS</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Retention Analytics for Soccer Clubs
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-3xl p-8 shadow-2xl shadow-black/20">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-slate-400 text-sm">Enter your password to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                </>
              ) : (
                <>
                  Access Dashboard
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Protected dashboard • Contact admin for access
        </p>
      </div>
    </div>
  );
}
