'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiFetch } from '@/lib/api-client';
import {
  BookOpen,
  Send,
  Code,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

export default function SwaggerDocsView() {
  const { user, accessToken } = useAuthStore();
  const [activeEndpoint, setActiveEndpoint] = useState<string>('/catalog/ingredientes');
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: spec } = useQuery({
    queryKey: ['swagger-spec'],
    queryFn: async () => {
      const res = await apiFetch('/api/docs');
      if (!res.ok) throw new Error('Acceso restringido a documentación');
      return res.json();
    },
    enabled: user?.rol === 'ADMIN',
  });

  if (user?.rol !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-4 shadow-sm my-12">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900">Acceso Restringido</h2>
          <p className="text-xs text-stone-500 mt-1">
            La documentación OpenAPI/Swagger es exclusiva para administradores (Rol <strong>ADMIN</strong>).
          </p>
        </div>
      </div>
    );
  }

  const handleTestEndpoint = async (path: string, method: string) => {
    setIsLoadingTest(true);
    setResponseOutput(null);

    try {
      let targetUrl = `/api/v1${path.replace('{id}', '1')}`;
      let options: RequestInit = {
        method: method.toUpperCase(),
      };

      if (path === '/orders/checkout' && method === 'post') {
        options.body = JSON.stringify({
          items: [{ ingredienteId: 1, gramos: 100 }],
          metodoPago: 'TARJETA_CREDITO',
          simulateFailure: false,
        });
      } else if (path === '/catalog/stock' && method === 'post') {
        options.body = JSON.stringify({
          ingredienteId: 1,
          gramosDisponibles: 3500,
        });
      }

      const res = await apiFetch(targetUrl, options);
      const data = await res.json();
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsLoadingTest(false);
    }
  };

  const copyToken = () => {
    if (accessToken) {
      navigator.clipboard.writeText(accessToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-950 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-300 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>OpenAPI 3.0 • Swagger Documentation</span>
          </div>
          <h1 className="font-serif text-2xl font-bold">KairosMix REST API Explorer</h1>
          <p className="text-xs text-blue-200 mt-0.5">
            Especificación oficial del monolito modular para el módulo Catalog, Identity, Orders, Billing y Notificaciones.
          </p>
        </div>

        {/* Current Auth Token Badge */}
        <div className="bg-blue-900/80 border border-blue-700/50 p-3 rounded-xl max-w-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-200 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Token JWT ({user?.rol || 'INVITADO'})</span>
            </span>
            <button
              onClick={copyToken}
              className="text-[10px] text-blue-300 hover:text-white flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar Token'}</span>
            </button>
          </div>
          <p className="text-[10px] font-mono text-blue-300 truncate">{accessToken || 'Sin token'}</p>
        </div>
      </div>

      {/* Main Spec & Live Tester Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoints List */}
        <div className="lg:col-span-7 space-y-4">
          {spec?.paths &&
            Object.entries(spec.paths).map(([path, methods]: [string, any]) => (
              <div key={path} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-stone-900">{path}</span>
                </div>

                <div className="space-y-2">
                  {Object.entries(methods).map(([method, details]: [string, any]) => {
                    const methodColors: Record<string, string> = {
                      get: 'bg-blue-50 text-blue-700 border-blue-200',
                      post: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      delete: 'bg-rose-50 text-rose-700 border-rose-200',
                      patch: 'bg-amber-50 text-amber-700 border-amber-200',
                    };

                    return (
                      <div
                        key={method}
                        className="p-3 rounded-lg bg-stone-50 border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                methodColors[method] || 'bg-stone-100'
                              }`}
                            >
                              {method}
                            </span>
                            <span className="text-xs font-semibold text-stone-800">{details.summary}</span>
                          </div>
                          {details.tags && (
                            <span className="text-[10px] text-stone-400 block">
                              Módulo: {details.tags.join(', ')}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setActiveEndpoint(path);
                            handleTestEndpoint(path, method);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto"
                        >
                          <Send className="w-3 h-3" />
                          <span>Probar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Live Response Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-900 text-stone-100 rounded-xl p-4 shadow-sm space-y-3 sticky top-20">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-mono text-amber-400 flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5" />
                <span>Respuesta API en Vivo</span>
              </span>
              <span className="text-[10px] text-stone-400 font-mono">{activeEndpoint}</span>
            </div>

            {isLoadingTest ? (
              <div className="py-12 text-center text-stone-500 font-mono text-xs">Ejecutando petición...</div>
            ) : responseOutput ? (
              <pre className="text-[11px] font-mono p-3 bg-stone-950 rounded-lg overflow-x-auto text-emerald-400 max-h-96 leading-relaxed">
                {responseOutput}
              </pre>
            ) : (
              <div className="py-12 text-center text-stone-500 font-mono text-xs">
                Selecciona cualquier endpoint a la izquierda para ejecutar una petición HTTP en vivo con tu Bearer Token actual.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
