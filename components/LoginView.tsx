'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { LogIn, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
}

export default function LoginView({ onSuccess }: LoginViewProps) {
  const { login, user, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900">Sesión Activa</h2>
          <p className="text-xs text-stone-500 mt-1">Conectado como <strong className="text-stone-800">{user.nombre}</strong> ({user.email})</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
            Rol: {user.rol}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-sm">
          <LogIn className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Iniciar Sesión en KairosMix</h2>
        <p className="text-xs text-stone-500">Ingresa tus credenciales reales para acceder al sistema</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Correo Electrónico</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@kairosmix.com"
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Contraseña</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-900/10 transition-all flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <span className="animate-pulse">Autenticando...</span>
          ) : (
            <>
              <span>Iniciar Sesión</span>
              <LogIn className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

    </div>
  );
}
