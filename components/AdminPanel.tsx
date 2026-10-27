'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiFetch } from '@/lib/api-client';
import {
  Shield,
  Layers,
  PackageCheck,
  Truck,
  Users,
  History,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Check,
  BellRing,
} from 'lucide-react';

export default function AdminPanel() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeAdminTab, setActiveAdminTab] = useState<'ingredientes' | 'stock' | 'proveedores' | 'usuarios' | 'logs'>('ingredientes');
  const [showIngredienteModal, setShowIngredienteModal] = useState(false);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Form states
  const [ingForm, setIngForm] = useState({
    nombre: '',
    categoria: 'FRUTO_SECO',
    fdcId: '',
    caloriasPor100g: 500,
    proteinasG100g: 15,
    grasasG100g: 30,
    carbohidratosG100g: 20,
    fibraG100g: 8,
    sodioMg100g: 0,
    precioPorGramo: 0.05,
    stockInicialGramos: 2000,
  });

  const [provForm, setProvForm] = useState({
    nombre: '',
    ruc: '',
    contacto: '',
  });

  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    password: 'Password123!',
    rol: 'VENDEDOR' as 'ADMIN' | 'VENDEDOR' | 'CLIENTE',
  });

  // Queries
  const { data: ingredientes = [], isLoading: loadingIng } = useQuery({
    queryKey: ['admin-ingredientes'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/catalog/ingredientes?soloActivos=false');
      if (!res.ok) throw new Error('Error al cargar ingredientes');
      return res.json();
    },
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['admin-proveedores'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/catalog/proveedores');
      if (!res.ok) throw new Error('Error al cargar proveedores');
      return res.json();
    },
    enabled: !!user && ['ADMIN', 'VENDEDOR'].includes(user.rol),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/auth/users');
      if (!res.ok) throw new Error('Error al cargar usuarios');
      return res.json();
    },
    enabled: user?.rol === 'ADMIN',
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/audit/logs');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.rol === 'ADMIN',
  });

  const { data: notifLogs = [] } = useQuery({
    queryKey: ['admin-notif-logs'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/notifications/logs');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && ['ADMIN', 'VENDEDOR'].includes(user.rol),
  });

  // Mutations
  const createIngredienteMutation = useMutation({
    mutationFn: async (dto: any) => {
      const res = await apiFetch('/api/v1/catalog/ingredientes', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear ingrediente');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setShowIngredienteModal(false);
    },
  });

  const softDeleteIngredienteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/catalog/ingredientes/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al desactivar ingrediente');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, gramos }: { id: number; gramos: number }) => {
      const res = await apiFetch('/api/v1/catalog/stock', {
        method: 'POST',
        body: JSON.stringify({ ingredienteId: id, gramosDisponibles: gramos }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  const createProveedorMutation = useMutation({
    mutationFn: async (dto: any) => {
      const res = await apiFetch('/api/v1/catalog/proveedores', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar proveedor');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-proveedores'] });
      setShowProveedorModal(false);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (dto: any) => {
      const res = await apiFetch('/api/v1/auth/users', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear usuario');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setShowUserModal(false);
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const res = await apiFetch(`/api/v1/auth/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
    },
  });

  if (!user || !['ADMIN', 'VENDEDOR'].includes(user.rol)) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-stone-200 space-y-3">
        <Shield className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-stone-900">Acceso Restringido por RBAC</h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Esta vista está reservada para roles <strong>ADMIN</strong> o <strong>VENDEDOR</strong>. Usa el selector de roles en la barra superior para cambiar a una cuenta con permisos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backoffice Header */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>Panel de Administración & Operaciones</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Gestión de Catálogo, Stock & RBAC</h1>
          <p className="text-sm text-stone-400 mt-1">
            Sesión activa: <strong className="text-white">{user.nombre}</strong> (Rol: {user.rol})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 bg-stone-800 p-1.5 rounded-xl border border-stone-700 max-w-full">
          <button
            onClick={() => setActiveAdminTab('ingredientes')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors flex items-center space-x-1.5 min-w-0 ${
              activeAdminTab === 'ingredientes' ? 'bg-amber-600 text-white font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Catálogo</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('stock')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors flex items-center space-x-1.5 min-w-0 ${
              activeAdminTab === 'stock' ? 'bg-amber-600 text-white font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Inventario & Stock</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('proveedores')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors flex items-center space-x-1.5 min-w-0 ${
              activeAdminTab === 'proveedores' ? 'bg-amber-600 text-white font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Proveedores</span>
          </button>

          {user.rol === 'ADMIN' && (
            <button
              onClick={() => setActiveAdminTab('usuarios')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors flex items-center space-x-1.5 min-w-0 ${
                activeAdminTab === 'usuarios' ? 'bg-rose-600 text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuarios (Admin)</span>
            </button>
          )}

          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors flex items-center space-x-1.5 min-w-0 ${
              activeAdminTab === 'logs' ? 'bg-amber-600 text-white font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{user?.rol === 'ADMIN' ? 'Auditoría & Notificaciones' : 'Notificaciones'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INGREDIENTES CRUD */}
      {activeAdminTab === 'ingredientes' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-bold text-lg text-stone-900">Catálogo Maestro de Ingredientes</h2>
              <p className="text-sm text-stone-500">
                Creación y actualización de ingredientes con soft-delete estricto (activo = false).
              </p>
            </div>
            <button
              onClick={() => setShowIngredienteModal(true)}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center space-x-1.5 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Ingrediente</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-y border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">ID / Nombre</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">USDA FDC</th>
                  <th className="py-2.5 px-3">Calorías</th>
                  <th className="py-2.5 px-3">Macros (P/G/C)</th>
                  <th className="py-2.5 px-3">Precio / g</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ingredientes.map((ing: any) => (
                  <tr key={ing.id} className={!ing.activo ? 'bg-stone-50 opacity-60' : 'hover:bg-stone-50/50'}>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">
                      #{ing.id} {ing.nombre}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 font-bold text-[11px]">
                        {ing.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-500">{ing.fdcId || '-'}</td>
                    <td className="py-2.5 px-3">{ing.caloriasPor100g} kcal</td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {ing.proteinasG100g}p / {ing.grasasG100g}g / {ing.carbohidratosG100g}c
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-900">${(ing.precioPorGramo || 0.05).toFixed(3)}</td>
                    <td className="py-2.5 px-3">
                      {ing.activo ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                          DESACTIVADO
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ing.activo ? (
                        <button
                          onClick={() => softDeleteIngredienteMutation.mutate(ing.id)}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs"
                          title="Desactivar ingrediente (soft delete)"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">Desactivado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTARIO & STOCK */}
      {activeAdminTab === 'stock' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-bold text-lg text-stone-900">Control de Stock & Gramos Disponibles</h2>
              <p className="text-sm text-stone-500">
                Ajuste directo de existencias en tiempo real para la reserva atómica del checkout.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ingredientes.filter((i: any) => i.activo).map((ing: any) => {
              const currentStock = ing.stock?.gramosDisponibles ?? 0;

              return (
                <div key={ing.id} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm text-stone-900 leading-tight">{ing.nombre}</h4>
                      <span className="text-[10px] text-stone-400 font-mono">ID #{ing.id}</span>
                    </div>
                    <span
                      className={`text-sm font-black px-2 py-0.5 rounded ${
                        currentStock > 1000
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentStock > 300
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {currentStock}g
                    </span>
                  </div>

                  <div className="pt-2 flex items-center space-x-1.5">
                    <button
                      onClick={() => updateStockMutation.mutate({ id: ing.id, gramos: currentStock + 500 })}
                      className="flex-1 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700"
                    >
                      +500g
                    </button>
                    <button
                      onClick={() => updateStockMutation.mutate({ id: ing.id, gramos: currentStock + 2000 })}
                      className="flex-1 py-1 rounded bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white"
                    >
                      +2000g
                    </button>
                    <button
                      onClick={() => updateStockMutation.mutate({ id: ing.id, gramos: 0 })}
                      className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                      title="Agotar stock"
                    >
                      Agotar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PROVEEDORES */}
      {activeAdminTab === 'proveedores' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-bold text-base text-stone-900">Proveedores Homologados</h2>
              <p className="text-xs text-stone-500">Gestión de RUC y contactos de proveedores de frutos y semillas.</p>
            </div>
            <button
              onClick={() => setShowProveedorModal(true)}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Proveedor</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-y border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Razón Social</th>
                  <th className="py-2.5 px-3">RUC</th>
                  <th className="py-2.5 px-3">Contacto / Correo</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {proveedores.map((prov: any) => (
                  <tr key={prov.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{prov.nombre}</td>
                    <td className="py-2.5 px-3 font-mono text-stone-700">{prov.ruc}</td>
                    <td className="py-2.5 px-3 text-stone-600">{prov.contacto || 'Sin contacto'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        ACTIVO
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USUARIOS (ADMIN ONLY) */}
      {activeAdminTab === 'usuarios' && user.rol === 'ADMIN' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-bold text-base text-stone-900">Control de Usuarios & RBAC</h2>
              <p className="text-xs text-stone-500">
                Creación exclusiva por el Administrador (no hay registro público en KairosMix).
              </p>
            </div>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Vendedor / Cliente</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-y border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Nombre</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Rol</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usuarios.map((u: any) => (
                  <tr key={u.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{u.nombre}</td>
                    <td className="py-2.5 px-3 font-mono text-stone-600">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          u.rol === 'ADMIN'
                            ? 'bg-rose-100 text-rose-800'
                            : u.rol === 'VENDEDOR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {u.activo ? (
                        <span className="text-emerald-700 font-bold text-[11px]">Activo</span>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px]">Inactivo</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {u.id !== user.id && (
                        <button
                          onClick={() => toggleUserStatusMutation.mutate({ id: u.id, activo: !u.activo })}
                          className="text-stone-500 hover:text-stone-900 underline text-[11px]"
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDITORÍA & NOTIFICACIONES */}
      {activeAdminTab === 'logs' && (
        <div className={`grid grid-cols-1 ${user?.rol === 'ADMIN' ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Notifications Log */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
              <BellRing className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-stone-900">Registro de Notificaciones (NotificacionLog)</h3>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifLogs.map((log: any) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-stone-900">{log.tipo}</span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(log.enviadaEn).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">Destinatario: {log.destinatario}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Event Log (ADMIN only) */}
          {user?.rol === 'ADMIN' && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                <History className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-stone-900">Eventos de Auditoría (EventoAuditoria)</h3>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.map((aud: any) => (
                  <div key={aud.id} className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-amber-900">{aud.accion}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          aud.resultado === 'EXITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {aud.resultado}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400">
                      Entidad: {aud.entidad} #{aud.entidadId} • {new Date(aud.timestamp).toLocaleTimeString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE INGREDIENTE MODAL */}
      {showIngredienteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg font-bold text-stone-900">Nuevo Ingrediente de Catálogo</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre del Ingrediente</label>
                <input
                  type="text"
                  value={ingForm.nombre}
                  onChange={(e) => setIngForm({ ...ingForm, nombre: e.target.value })}
                  placeholder="Ej. Anacardo Tostado sin Sal"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Categoría</label>
                  <select
                    value={ingForm.categoria}
                    onChange={(e) => setIngForm({ ...ingForm, categoria: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="FRUTO_SECO">FRUTO_SECO</option>
                    <option value="SEMILLA">SEMILLA</option>
                    <option value="FRUTA_DESHIDRATADA">FRUTA_DESHIDRATADA</option>
                    <option value="CEREAL">CEREAL</option>
                    <option value="PROTEINA_POLVO">PROTEINA_POLVO</option>
                    <option value="ESPECIA">ESPECIA</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">USDA FDC ID (Opcional)</label>
                  <input
                    type="number"
                    value={ingForm.fdcId}
                    onChange={(e) => setIngForm({ ...ingForm, fdcId: e.target.value })}
                    placeholder="170567"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Calorías / 100g</label>
                  <input
                    type="number"
                    value={ingForm.caloriasPor100g}
                    onChange={(e) => setIngForm({ ...ingForm, caloriasPor100g: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Proteínas (g)</label>
                  <input
                    type="number"
                    value={ingForm.proteinasG100g}
                    onChange={(e) => setIngForm({ ...ingForm, proteinasG100g: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={ingForm.grasasG100g}
                    onChange={(e) => setIngForm({ ...ingForm, grasasG100g: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Precio por Gramo ($)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={ingForm.precioPorGramo}
                    onChange={(e) => setIngForm({ ...ingForm, precioPorGramo: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Stock Inicial (Gramos)</label>
                  <input
                    type="number"
                    value={ingForm.stockInicialGramos}
                    onChange={(e) => setIngForm({ ...ingForm, stockInicialGramos: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                onClick={() => setShowIngredienteModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-stone-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => createIngredienteMutation.mutate(ingForm)}
                disabled={!ingForm.nombre || createIngredienteMutation.isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
              >
                Guardar Ingrediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROVEEDOR MODAL */}
      {showProveedorModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Registrar Proveedor</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Razón Social</label>
                <input
                  type="text"
                  value={provForm.nombre}
                  onChange={(e) => setProvForm({ ...provForm, nombre: e.target.value })}
                  placeholder="Distribuidora Nacional de Nueces S.A."
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">RUC (Único)</label>
                <input
                  type="text"
                  value={provForm.ruc}
                  onChange={(e) => setProvForm({ ...provForm, ruc: e.target.value })}
                  placeholder="1792837465001"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Contacto / Email / Teléfono</label>
                <input
                  type="text"
                  value={provForm.contacto}
                  onChange={(e) => setProvForm({ ...provForm, contacto: e.target.value })}
                  placeholder="ventas@proveedor.com"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                onClick={() => setShowProveedorModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-stone-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => createProveedorMutation.mutate(provForm)}
                disabled={!provForm.nombre || !provForm.ruc}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
              >
                Registrar Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (ADMIN ONLY) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Registrar Usuario (RBAC)</h3>
            <p className="text-xs text-stone-500">
              Registrado por la cuenta Administradora. Se generará hash seguro con bcrypt.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  placeholder="Mateo Salazar"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="mateo@kairosmix.com"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Rol Asignado</label>
                <select
                  value={userForm.rol}
                  onChange={(e) => setUserForm({ ...userForm, rol: e.target.value as any })}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="VENDEDOR">VENDEDOR (Acceso a catálogo, stock y órdenes)</option>
                  <option value="CLIENTE">CLIENTE (Armado de mezclas y compras)</option>
                  <option value="ADMIN">ADMIN (Acceso total)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-stone-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => createUserMutation.mutate(userForm)}
                disabled={!userForm.email || !userForm.nombre}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
              >
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
