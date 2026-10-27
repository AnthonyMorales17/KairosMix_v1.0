'use client';

import React from 'react';
import LoginView from '@/components/LoginView';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-[#faf8f5] flex flex-col justify-between overflow-x-hidden">
      <div>
        <Navbar
          activeTab="login"
          setActiveTab={(tab) => {
            if (tab === 'login') return;
            router.push('/');
          }}
          onOpenCart={() => router.push('/')}
        />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <LoginView onSuccess={() => router.push('/')} />
        </main>
      </div>

      <footer className="w-full bg-white border-t border-stone-200 py-6 text-center text-sm sm:text-base text-stone-500 px-4">
        KairosMix Monolith Core • Autenticación Real de Usuarios (JWT + Refresh Tokens)
      </footer>
    </div>
  );
}
