'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/lib/store/useCartStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiFetch } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Trash2,
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onViewOrders: () => void;
}

export default function CartDrawer({ isOpen, onClose, onViewOrders }: CartDrawerProps) {
  const { items, updateGrams, removeItem, clearCart, mixName } = useCartStore();
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [metodoPago, setMetodoPago] = useState<string>('TARJETA_CREDITO');
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);

  const totalGramos = items.reduce((acc, i) => acc + i.gramos, 0);
  const totalPrice = items.reduce((acc, i) => acc + i.gramos * i.precioPorGramo, 0);

  // Checkout Mutation calling /api/v1/orders/checkout
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: items.map((i) => ({
          ingredienteId: i.ingredienteId,
          gramos: i.gramos,
        })),
        metodoPago,
        simulateFailure,
      };

      const res = await apiFetch('/api/v1/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok && res.status !== 402) {
        throw new Error(data.message || 'Error en el checkout');
      }
      return data;
    },
    onSuccess: (data) => {
      setCheckoutResult(data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });

      if (data.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        clearCart();
      }
    },
    onError: (err: any) => {
      setCheckoutResult({
        success: false,
        mensaje: err.message || 'Error al procesar el pedido',
      });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-stone-900">Carrito de Compra</h2>
              <p className="text-[11px] text-stone-500">{mixName} ({totalGramos}g)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Checkout Result Banner if processed */}
          {checkoutResult && (
            <div
              className={`p-4 rounded-xl border ${
                checkoutResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              } space-y-2`}
            >
              <div className="flex items-start space-x-2">
                {checkoutResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {checkoutResult.success ? '¡Pedido Confirmado con Éxito!' : 'Fallo en la Transacción'}
                  </h3>
                  <p className="text-xs mt-0.5 leading-relaxed">{checkoutResult.mensaje}</p>
                </div>
              </div>

              {checkoutResult.stockRevertido && (
                <div className="p-2 bg-amber-100/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center space-x-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    <strong>Transacción de Compensación ejecutada:</strong> El stock reservado fue liberado y devuelto al inventario automáticamente.
                  </span>
                </div>
              )}

              {checkoutResult.pedido && (
                <div className="text-[11px] bg-white/70 p-2 rounded-lg space-y-1 font-mono">
                  <p>ID Pedido: {checkoutResult.pedido.id}</p>
                  <p>Estado: {checkoutResult.pedido.estado}</p>
                  {checkoutResult.factura && <p>Factura: #{checkoutResult.factura.id} (PAGADA)</p>}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setCheckoutResult(null);
                    onClose();
                    onViewOrders();
                  }}
                  className="text-xs font-bold underline flex items-center space-x-1"
                >
                  <span>Ver en Mis Pedidos</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Items List */}
          {items.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-medium text-stone-600">Tu carrito no tiene ingredientes</p>
              <p className="text-xs text-stone-400">Arma tu mezcla personalizada en el Mezclador Studio</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <span>Ingredientes de la Mezcla</span>
                <span>{items.length} items</span>
              </div>

              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl p-3 bg-white">
                {items.map((item) => {
                  const subtotal = item.gramos * item.precioPorGramo;

                  return (
                    <div key={item.ingredienteId} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-stone-900 truncate">{item.nombre}</p>
                        <p className="text-[11px] text-stone-500">
                          {item.gramos}g × ${item.precioPorGramo.toFixed(3)}/g
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-stone-900">${subtotal.toFixed(2)}</span>
                        <button
                          onClick={() => removeItem(item.ingredienteId)}
                          className="text-stone-300 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">Método de Pago (Simulado):</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago('TARJETA_CREDITO')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                      metodoPago === 'TARJETA_CREDITO'
                        ? 'border-amber-600 bg-amber-50/70 font-semibold text-amber-900'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600 mb-1" />
                    <span>Tarjeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago('PAYPHONE')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                      metodoPago === 'PAYPHONE'
                        ? 'border-amber-600 bg-amber-50/70 font-semibold text-amber-900'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-600 mb-1" />
                    <span>PayPhone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago('TRANSFERENCIA')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                      metodoPago === 'TRANSFERENCIA'
                        ? 'border-amber-600 bg-amber-50/70 font-semibold text-amber-900'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-600 mb-1" />
                    <span>Transf. Bancaria</span>
                  </button>
                </div>
              </div>

              {/* Transaction Testing Toggle: Simulate Failure & Compensation */}
              <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-stone-700" />
                    <span className="text-xs font-bold text-stone-800">Simulador de Transacción & Rollback</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  {simulateFailure ? (
                    <span className="text-rose-700 font-semibold">
                      ⚠️ MODO PRUEBA DE FALLO ACTIVO: Se simulará un rechazo de pasarela para validar la transacción de compensación (reversión de stock a la base de datos y estado FALLIDO).
                    </span>
                  ) : (
                    'Flujo normal de pago exitoso (Reserva de stock -> Factura emitida -> Pedido CONFIRMADO).'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer & Checkout Action */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-white space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Peso Neto Total:</span>
              <span className="font-semibold text-stone-900">{totalGramos}g</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Envío & Empaque Kraft:</span>
              <span className="font-semibold text-emerald-600">GRATIS</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-stone-100">
              <span>Total a Pagar:</span>
              <span className="font-black text-xl text-amber-900">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={items.length === 0 || checkoutMutation.isPending}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 text-white ${
              simulateFailure
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700 active:scale-[0.99]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {checkoutMutation.isPending ? (
              <span>Procesando Transacción...</span>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {simulateFailure ? 'Ejecutar Checkout con Fallo Simulado' : `Confirmar y Pagar $${totalPrice.toFixed(2)}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
