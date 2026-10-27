'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import CustomMixer from '@/components/CustomMixer';
import CatalogView from '@/components/CatalogView';
import OrdersView from '@/components/OrdersView';
import AdminPanel from '@/components/AdminPanel';
import SwaggerDocsView from '@/components/SwaggerDocsView';
import TestRunnerView from '@/components/TestRunnerView';
import LoginView from '@/components/LoginView';
import CartDrawer from '@/components/CartDrawer';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('mixer');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const { user } = useAuthStore();

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="min-h-screen w-full bg-[#faf8f5] flex flex-col justify-between overflow-x-hidden">
      <div>
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCart={() => setIsCartOpen(true)}
        />

        {/* Global Role Notice Banner (Dev mode only) */}
        {isDev && (
          <div className="bg-amber-900/5 border-b border-amber-900/10 py-1.5 px-4 text-center text-xs text-amber-900">
            <span className="font-semibold">Modo Desarrollo:</span> Sesión activa como{' '}
            <strong className="underline font-bold">{user?.nombre || 'INVITADO'}</strong> (Rol:{' '}
            <span className="font-mono font-bold">{user?.rol || 'SIN_SESION'}</span>). Utiliza el formulario de inicio de sesión para probar autenticación.
          </div>
        )}

        {/* Main Content Area */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === 'mixer' && <CustomMixer onOpenCart={() => setIsCartOpen(true)} />}
          {activeTab === 'catalog' && <CatalogView />}
          {activeTab === 'orders' && <OrdersView />}
          {activeTab === 'admin' && (user?.rol === 'ADMIN' || user?.rol === 'VENDEDOR' ? <AdminPanel /> : <SwaggerDocsView />)}
          {activeTab === 'docs' && <SwaggerDocsView />}
          {activeTab === 'tests' && <TestRunnerView />}
          {activeTab === 'login' && <LoginView onSuccess={() => setActiveTab('mixer')} />}
        </main>
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onViewOrders={() => setActiveTab('orders')}
      />

      {/* Footer */}
      <footer className="w-full bg-white border-t border-stone-200 mt-12 py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between text-sm sm:text-base text-stone-500 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-600 flex items-center justify-center text-white text-[10px] font-bold">
              K
            </div>
            <span className="font-bold text-stone-700">KairosMix Monolith Core v1.0.0</span>
            <span>• Next.js App Router + Prisma PostgreSQL</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button onClick={() => setActiveTab('docs')} className="hover:text-amber-800 underline font-medium">
              OpenAPI /docs
            </button>
            <button onClick={() => setActiveTab('tests')} className="hover:text-amber-800 underline font-medium">
              Jest Tests (Passed)
            </button>
            <span>PostgreSQL + Redis + Prisma</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
