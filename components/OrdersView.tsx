'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiFetch } from '@/lib/api-client';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  User,
  RefreshCw,
  Eye,
  CreditCard,
  Package,
} from 'lucide-react';

export default function OrdersView() {
  const { user } = useAuthStore();
  const [selectedFactura, setSelectedFactura] = useState<any | null>(null);

  const { data: pedidos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', user?.id, user?.rol],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/orders');
      if (!res.ok) throw new Error('Error al cargar pedidos');
      return res.json();
    },
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>CONFIRMADO</span>
          </span>
        );
      case 'STOCK_RESERVADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            <span>STOCK RESERVADO</span>
          </span>
        );
      case 'FALLIDO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>FALLIDO (Stock Revertido)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
            <span>{estado}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
            <FileText className="w-4 h-4" />
            <span>{user?.rol === 'CLIENTE' ? 'Mis Pedidos & Facturas' : 'Gestión de Pedidos Global'}</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Historial Transaccional de Pedidos</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {user?.rol === 'CLIENTE'
              ? `Pedidos realizados por la cuenta de ${user.nombre}`
              : `Panel de pedidos para rol ${user?.rol} (Monitoreo de estado y pagos)`}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-3.5 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-12 text-center text-stone-400 bg-white rounded-xl border border-stone-200">
          Cargando pedidos...
        </div>
      ) : pedidos.length === 0 ? (
        <div className="py-12 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
          <Package className="w-8 h-8 mx-auto mb-2 text-stone-400" />
          <p className="font-semibold text-sm">No hay pedidos registrados en este momento</p>
          <p className="text-xs text-stone-400 mt-1">Arma tu mezcla y completa el checkout para ver tus órdenes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido: any) => {
            const itemsCount = pedido.items?.length || 0;
            const totalGramos = pedido.items?.reduce((acc: number, i: any) => acc + (i.gramos || 0), 0) || 0;

            return (
              <div
                key={pedido.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-stone-900">{pedido.id}</span>
                      {getStatusBadge(pedido.estado)}
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Fecha: {new Date(pedido.creadoEn).toLocaleString('es-ES')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block uppercase font-semibold">Total</span>
                      <span className="text-lg font-black text-amber-900">${(pedido.total || 0).toFixed(2)}</span>
                    </div>

                    {pedido.factura && (
                      <button
                        onClick={() => setSelectedFactura(pedido.factura)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors flex items-center space-x-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Ver Factura</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Order Items Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-500">
                    <span>Detalle de la Mezcla ({itemsCount} ingredientes, {totalGramos}g)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {pedido.items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs flex justify-between items-center"
                      >
                        <span className="font-medium text-stone-800 truncate mr-2">
                          {item.ingrediente?.nombre || `Ingrediente #${item.ingredienteId}`}
                        </span>
                        <span className="font-bold text-stone-600 shrink-0">{item.gramos}g</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cliente / Facturación Footer */}
                {pedido.cliente && (
                  <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-stone-400" />
                      <span>Cliente: {pedido.cliente.nombre} ({pedido.cliente.email})</span>
                    </span>
                    {pedido.factura && (
                      <span>Método: {pedido.factura.metodoPago} • Factura #{pedido.factura.id}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Factura Modal View */}
      {selectedFactura && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  Comprobante Electrónico Autorizado
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-1">Factura #{selectedFactura.id}</h3>
                <p className="text-xs text-stone-400 font-mono">Pedido Referencia: {selectedFactura.pedidoId}</p>
              </div>
              <button
                onClick={() => setSelectedFactura(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-lg">
                <div>
                  <span className="text-stone-400 block text-[10px]">Emisor</span>
                  <strong>KairosMix Store S.A.S.</strong>
                  <p className="text-[10px] text-stone-500">RUC: 1793049281001</p>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Estado de Pago</span>
                  <strong className="text-emerald-700">{selectedFactura.estadoPago}</strong>
                  <p className="text-[10px] text-stone-500">Método: {selectedFactura.metodoPago}</p>
                </div>
              </div>

              <div className="border-t border-b border-stone-200 py-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal Neto</span>
                  <span>${(selectedFactura.monto * 0.85).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA / Impuestos (15%)</span>
                  <span>${(selectedFactura.monto * 0.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-1 border-t border-stone-100">
                  <span>Total Facturado</span>
                  <span>${selectedFactura.monto.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedFactura(null)}
                className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
