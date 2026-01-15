import React, { useState, useEffect } from "react";
import LoginScreen from "./LoginScreen";
import WayneDashboard from "./WayneDashboardDark";

// Tiempo de expiración de sesión: 24 horas
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar sesión existente al cargar
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = localStorage.getItem("rp_authenticated");
      const authTime = localStorage.getItem("rp_auth_time");

      if (authenticated === "true" && authTime) {
        const elapsed = Date.now() - parseInt(authTime, 10);
        if (elapsed < SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          // Sesión expirada
          localStorage.removeItem("rp_authenticated");
          localStorage.removeItem("rp_auth_time");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Pantalla de carga inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Mostrar Login o Dashboard según autenticación
  if (!isAuthenticated) {
    return <LoginScreen onLogin={setIsAuthenticated} />;
  }

  return <WayneDashboard onLogout={() => setIsAuthenticated(false)} />;
}
