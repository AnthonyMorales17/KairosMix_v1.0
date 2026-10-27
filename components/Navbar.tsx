'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useCartStore } from '@/lib/store/useCartStore';
import {
  Sparkles,
  ShoppingBag,
  Shield,
  Layers,
  FileText,
  User,
  Sliders,
  Terminal,
  BookOpen,
  ArrowRightLeft,
  LogIn,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCart: () => void;
}

export default function Navbar({ activeTab, setActiveTab, onOpenCart }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const totalGramos = items.reduce((acc, i) => acc + i.gramos, 0);
  const totalItemsCount = items.length;

  const roleColors = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    VENDEDOR: 'bg-amber-50 text-amber-700 border-amber-200',
    CLIENTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          {/* Brand Logo */}
          <div className="flex min-w-0 items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('mixer')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-900/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-serif text-xl font-bold tracking-tight text-stone-900">KairosMix</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Store
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">Mezclas Personalizadas de Snacks & Frutos Secos</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex min-w-0 flex-1 items-center justify-center space-x-1">
            <button
              onClick={() => setActiveTab('mixer')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'mixer'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Mezclador Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Catálogo</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'orders'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="whitespace-nowrap">{user?.rol === 'CLIENTE' ? 'Mis Pedidos' : 'Pedidos & Facturas'}</span>
            </button>

            {user?.rol && ['ADMIN', 'VENDEDOR'].includes(user.rol) && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-400" />
                  <span className="whitespace-nowrap">Panel Backoffice</span>
                </button>
              )}

              {user?.rol === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'docs'
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span className="whitespace-nowrap">API /docs</span>
                </button>

                <button
                  onClick={() => setActiveTab('tests')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'tests'
                      ? 'bg-purple-50 text-purple-900 font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Terminal className="w-4 h-4 text-purple-600" />
                  <span className="whitespace-nowrap">Tests Unitarios</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Action: User Menu / Login & Cart Trigger */}
          <div className="flex shrink-0 items-center space-x-2 sm:space-x-3">
            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-stone-900 hover:bg-black text-white shadow-sm transition-all flex items-center space-x-2"
              title="Ver Carrito de Compras"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold hidden sm:inline">
                {totalGramos > 0 ? `${totalGramos}g` : 'Carrito'}
              </span>
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-bold flex items-center justify-center shadow">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    roleColors[user.rol] || 'bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                  title="Opciones de usuario"
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span className="font-semibold max-w-[170px] truncate sm:max-w-none">{user.nombre}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-2 border-b border-stone-100">
                      <p className="text-xs font-semibold text-stone-900">{user.nombre}</p>
                      <p className="text-[11px] text-stone-500">{user.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 uppercase">
                        Rol: {user.rol}
                      </span>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-stone-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('mixer')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'mixer' ? 'bg-amber-600 text-white font-medium' : 'text-stone-600 bg-stone-100'
            }`}
          >
            Mezclador
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'catalog' ? 'bg-amber-600 text-white font-medium' : 'text-stone-600 bg-stone-100'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-amber-600 text-white font-medium' : 'text-stone-600 bg-stone-100'
            }`}
          >
            Pedidos
          </button>
          {user?.rol && ['ADMIN', 'VENDEDOR'].includes(user.rol) && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                activeTab === 'admin' ? 'bg-stone-900 text-white font-medium' : 'text-stone-600 bg-stone-100'
              }`}
            >
              Backoffice
            </button>
          )}
          <button
            onClick={() => setActiveTab('login')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'login' ? 'bg-amber-600 text-white font-medium' : 'text-stone-600 bg-stone-100'
            }`}
          >
            {user ? 'Mi Cuenta' : 'Login'}
          </button>
        </div>
      </div>
    </header>
  );
}
