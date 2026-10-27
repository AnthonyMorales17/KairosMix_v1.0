'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useCartStore } from '@/lib/store/useCartStore';
import {
  Sparkles,
  BrainCircuit,
  Flame,
  Dumbbell,
  Wheat,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowRight,
  Info,
} from 'lucide-react';

interface AiMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart?: () => void;
}

type AiMixResult = {
  mezclaId: string;
  estado: 'generada' | 'ajustada';
  justificacion: string;
  totales: {
    pesoGramos: number;
    calorias: number;
    proteinaG: number;
    grasaG: number;
    carbohidratosG: number;
  };
  items: Array<{
    ingredienteId: number;
    nombre: string;
    categoria: string;
    gramos: number;
    precioPorGramo: number;
    caloriasPor100g: number;
    proteinasG100g: number;
    grasasG100g: number;
    carbohidratosG100g: number;
    fibraG100g?: number;
    sodioMg100g?: number;
  }>;
  metasCumplidas: boolean;
  intentosRealizados: number;
  modeloUsado: string;
};

type AiMixErrorKind = 'factibility' | 'service' | 'generic';

type AiMixErrorState = {
  kind: AiMixErrorKind;
  message: string;
  retryable: boolean;
};

type MixRequestSnapshot = {
  tipoDieta: 'KETO' | 'VEGANA' | 'DEPORTIVA' | 'ESTANDAR' | 'PALEO';
  metaCalorias: number;
  metaProteinaG: number;
  pesoTotalGramos: number;
  alergenosExcluir: number[];
};

export default function AiMixerModal({ isOpen, onClose, onOpenCart }: AiMixerModalProps) {
  const { clearCart, addItem, setMixName } = useCartStore();

  const [tipoDieta, setTipoDieta] = useState<'KETO' | 'VEGANA' | 'DEPORTIVA' | 'ESTANDAR' | 'PALEO'>('DEPORTIVA');
  const [metaCalorias, setMetaCalorias] = useState<number>(500);
  const [metaProteinaG, setMetaProteinaG] = useState<number>(25);
  const [pesoTotalGramos, setPesoTotalGramos] = useState<number>(250);
  const [alergenosExcluir, setAlergenosExcluir] = useState<number[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorState, setErrorState] = useState<AiMixErrorState | null>(null);
  const [resultadoAi, setResultadoAi] = useState<AiMixResult | null>(null);
  const [lastRequest, setLastRequest] = useState<MixRequestSnapshot | null>(null);

  // Fetch list of allergens for checkbox selection
  const { data: alergenos = [] } = useQuery({
    queryKey: ['alergenos-modal'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/catalog/alergenos');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const toggleAlergeno = (id: number) => {
    if (alergenosExcluir.includes(id)) {
      setAlergenosExcluir(alergenosExcluir.filter((item) => item !== id));
    } else {
      setAlergenosExcluir([...alergenosExcluir, id]);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsGenerating(true);
    setErrorState(null);
    setResultadoAi(null);

    const requestSnapshot: MixRequestSnapshot = {
      tipoDieta,
      metaCalorias: Number(metaCalorias),
      metaProteinaG: Number(metaProteinaG),
      pesoTotalGramos: Number(pesoTotalGramos),
      alergenosExcluir: [...alergenosExcluir],
    };
    setLastRequest(requestSnapshot);

    try {
      const res = await apiFetch('/api/v1/ia/generar-mezcla', {
        method: 'POST',
        body: JSON.stringify(requestSnapshot),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          setErrorState({
            kind: 'factibility',
            message:
              data.message ||
              'La meta solicitada no es alcanzable con el catálogo y restricciones actuales.',
            retryable: false,
          });
          return;
        }

        if (res.status === 503) {
          setErrorState({
            kind: 'service',
            message:
              'El motor de IA no está disponible en este momento. Intenta de nuevo en unos minutos.',
            retryable: true,
          });
          return;
        }

        setErrorState({
          kind: 'generic',
          message: data.message || 'Error al formular mezcla con IA',
          retryable: true,
        });
        return;
      }

      setResultadoAi(data);
    } catch (err: any) {
      setErrorState({
        kind: 'generic',
        message: err.message || 'Ocurrió un error inesperado al consultar el motor de IA.',
        retryable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyMixToCart = () => {
    if (!resultadoAi) return;
    clearCart();
    setMixName(`Mezcla IA ${tipoDieta} (${resultadoAi.totales.pesoGramos}g)`);

    resultadoAi.items.forEach((item: any) => {
      addItem({
        ingredienteId: item.ingredienteId,
        nombre: item.nombre,
        categoria: item.categoria,
        gramos: item.gramos,
        precioPorGramo: item.precioPorGramo,
        caloriasPor100g: item.caloriasPor100g,
        proteinasG100g: item.proteinasG100g,
        grasasG100g: item.grasasG100g,
        carbohidratosG100g: item.carbohidratosG100g,
        fibraG100g: item.fibraG100g || 0,
        sodioMg100g: item.sodioMg100g || 0,
      });
    });

    onOpenCart?.();
    onClose();
  };

  const caloriasDelta = resultadoAi ? resultadoAi.totales.calorias - metaCalorias : 0;
  const proteinaDelta = resultadoAi ? resultadoAi.totales.proteinaG - metaProteinaG : 0;
  const estadoBadge = resultadoAi
    ? resultadoAi.metasCumplidas
      ? { label: 'Precisa', className: 'bg-emerald-200 text-emerald-950' }
      : { label: 'Aproximada', className: 'bg-amber-200 text-amber-950' }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-md">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
              </div>
              <div>
              <h2 className="text-xl font-bold text-stone-900 font-serif">Motor IA — Generador de Mezclas Gemini 3.6</h2>
                <p className="text-xs text-stone-500">Filtrado determinista de alérgenos + Optimización nutricional por IA</p>
              </div>
            </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorState && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start space-x-2.5 ${
              errorState.kind === 'factibility'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                errorState.kind === 'factibility' ? 'text-amber-600' : 'text-rose-600'
              }`}
            />
            <div className="space-y-2">
              <div>
                <strong className="font-bold block">
                  {errorState.kind === 'factibility'
                    ? 'Meta no alcanzable con el catálogo actual'
                    : 'El motor de IA no pudo completar la solicitud'}
                </strong>
                <span>{errorState.message}</span>
              </div>
              {errorState.retryable && (
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-current/20 font-bold text-[11px] hover:bg-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Form */}
        {!resultadoAi && (
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tipo de Dieta</label>
                <select
                  value={tipoDieta}
                  onChange={(e: any) => setTipoDieta(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="DEPORTIVA">DEPORTIVA (Alta Proteína & Energía)</option>
                  <option value="KETO">KETO (Baja en Carbohidratos & Grasa Saludable)</option>
                  <option value="VEGANA">VEGANA (100% Origen Vegetal)</option>
                  <option value="PALEO">PALEO (Semillas & Frutos Secos Naturales)</option>
                  <option value="ESTANDAR">ESTÁNDAR (Balance Nutricional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Peso Total Deseado (Gramos)</label>
                <input
                  type="number"
                  min={100}
                  max={1000}
                  step={50}
                  value={pesoTotalGramos}
                  onChange={(e) => setPesoTotalGramos(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Meta de Calorías (kcal)</label>
                <div className="relative">
                  <Flame className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min={100}
                    max={3000}
                    value={metaCalorias}
                    onChange={(e) => setMetaCalorias(Number(e.target.value))}
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Meta de Proteína (Gramos)</label>
                <div className="relative">
                  <Dumbbell className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min={5}
                    max={150}
                    value={metaProteinaG}
                    onChange={(e) => setMetaProteinaG(Number(e.target.value))}
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Exclude Allergens Section */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Alérgenos a Excluir (Filtro Determinista Pre-LLM)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                {alergenos.map((al: any) => (
                  <label
                    key={al.id}
                    className={`flex items-center space-x-2 text-xs p-2 rounded-lg cursor-pointer transition-colors ${
                      alergenosExcluir.includes(al.id)
                        ? 'bg-rose-100 text-rose-900 font-bold border border-rose-300'
                        : 'hover:bg-stone-200/60 text-stone-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={alergenosExcluir.includes(al.id)}
                      onChange={() => toggleAlergeno(al.id)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="truncate">{al.nombre}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white font-bold text-xs shadow-lg shadow-amber-900/10 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <span className="inline-flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Optimizando tu mezcla... esto puede tardar unos segundos</span>
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Formular Mezcla con IA Gemini 3.6</span>
                </>
              )}
            </button>

            {isGenerating && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start space-x-2.5">
                <BrainCircuit className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <p>
                  El motor está filtrando el catálogo, evaluando densidades nutricionales y reintentando si
                  hace falta. En mezclas complejas puede tardar cerca de un minuto.
                </p>
              </div>
            )}
          </form>
        )}

        {/* Results View */}
        {resultadoAi && (
          <div className="space-y-5 animate-in fade-in">
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                resultadoAi.metasCumplidas
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center space-x-1.5">
                  <Sparkles
                    className={`w-4 h-4 ${
                      resultadoAi.metasCumplidas ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <span>Justificación Nutricional (Gemini 3.6 Flash)</span>
                </div>
                {estadoBadge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${
                      estadoBadge.className
                    }`}
                  >
                    {estadoBadge.label} · {resultadoAi.intentosRealizados} intento/s
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed italic">&ldquo;{resultadoAi.justificacion}&rdquo;</p>
            </div>

            {/* Totals Banner */}
            <div className="grid grid-cols-4 gap-2 bg-stone-900 text-white p-3.5 rounded-xl text-center">
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Peso Total</span>
                <span className="font-bold text-sm text-amber-400">{resultadoAi.totales.pesoGramos}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Calorías</span>
                <span className="font-bold text-sm text-white">{resultadoAi.totales.calorias} kcal</span>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Proteínas</span>
                <span className="font-bold text-sm text-emerald-400">{resultadoAi.totales.proteinaG}g</span>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Grasas</span>
                <span className="font-bold text-sm text-amber-300">{resultadoAi.totales.grasaG}g</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-stone-200 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Meta solicitada</p>
                <div className="mt-2 space-y-1 text-xs text-stone-700">
                  <div className="flex justify-between">
                    <span>Calorías</span>
                    <span className="font-bold">{metaCalorias} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proteína</span>
                    <span className="font-bold">{metaProteinaG} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peso</span>
                    <span className="font-bold">{pesoTotalGramos} g</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Resultado real</p>
                <div className="mt-2 space-y-1 text-xs text-stone-700">
                  <div className="flex justify-between">
                    <span>Calorías</span>
                    <span className="font-bold">{resultadoAi.totales.calorias} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proteína</span>
                    <span className="font-bold">{resultadoAi.totales.proteinaG} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desvío total</span>
                    <span className="font-bold">
                      {caloriasDelta >= 0 ? '+' : ''}
                      {caloriasDelta.toFixed(1)} kcal / {proteinaDelta >= 0 ? '+' : ''}
                      {proteinaDelta.toFixed(1)} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Calculated */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Composición Calculada Determinísticamente:
              </h4>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                {resultadoAi.items.map((item: any) => (
                  <div key={item.ingredienteId} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50">
                    <div>
                      <span className="font-bold text-stone-900 block">{item.nombre}</span>
                      <span className="text-[11px] text-stone-500">
                        {item.caloriasPor100g} kcal/100g • {item.proteinasG100g}g prote/100g
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-900 text-sm block">{item.gramos} g</span>
                      <span className="text-[10px] text-stone-400">
                        ${((item.gramos * item.precioPorGramo)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setResultadoAi(null)}
                className="w-1/3 py-3 px-4 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                Re-formular
              </button>
              <button
                onClick={handleApplyMixToCart}
                className="w-2/3 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center space-x-2"
              >
                <span>Cargar Mezcla en mi Bolsa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
