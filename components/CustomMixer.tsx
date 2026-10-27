'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useCartStore } from '@/lib/store/useCartStore';
import NutritionLabel from './NutritionLabel';
import AiMixerModal from './AiMixerModal';
import {
  Sliders,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  ShoppingBag,
  Sparkles,
  BookmarkPlus,
  Check,
  Info,
  BrainCircuit,
} from 'lucide-react';

export default function CustomMixer({ onOpenCart }: { onOpenCart: () => void }) {
  const {
    mixName,
    setMixName,
    items,
    updateGrams,
    removeItem,
    addItem,
    clearCart,
    saveCurrentMix,
  } = useCartStore();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('TODOS');
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Fetch all ingredients via TanStack Query
  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ['ingredientes', 'mixer'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/catalog/ingredientes?soloActivos=true');
      if (!res.ok) throw new Error('Error al cargar ingredientes');
      return res.json();
    },
  });

  // Calculate live nutrition totals
  const totalGramos = items.reduce((acc, i) => acc + i.gramos, 0);
  const totalPrice = items.reduce((acc, i) => acc + i.gramos * i.precioPorGramo, 0);

  const totalCalorias = items.reduce((acc, i) => acc + (i.gramos * i.caloriasPor100g) / 100, 0);
  const totalProteinas = items.reduce((acc, i) => acc + (i.gramos * i.proteinasG100g) / 100, 0);
  const totalGrasas = items.reduce((acc, i) => acc + (i.gramos * i.grasasG100g) / 100, 0);
  const totalCarbos = items.reduce((acc, i) => acc + (i.gramos * i.carbohidratosG100g) / 100, 0);
  const totalFibra = items.reduce((acc, i) => acc + (i.gramos * (i.fibraG100g ?? 0)) / 100, 0);
  const totalSodio = items.reduce((acc, i) => acc + (i.gramos * (i.sodioMg100g ?? 0)) / 100, 0);

  // Collect detected allergens across selected items
  const detectedAllergens: string[] = [];
  items.forEach((item) => {
    const fullIng = ingredientes.find((ing: any) => ing.id === item.ingredienteId);
    if (fullIng?.alergenos) {
      fullIng.alergenos.forEach((al: any) => {
        const alName = al.alergeno?.nombre;
        if (alName && !detectedAllergens.includes(alName)) {
          detectedAllergens.push(alName);
        }
      });
    }
  });

  const categories = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'FRUTO_SECO', label: 'Frutos Secos' },
    { id: 'SEMILLA', label: 'Semillas' },
    { id: 'FRUTA_DESHIDRATADA', label: 'Frutas Deshidratadas' },
    { id: 'CEREAL', label: 'Cereales' },
    { id: 'PROTEINA_POLVO', label: 'Proteínas' },
    { id: 'ESPECIA', label: 'Especias' },
    { id: 'OTRO', label: 'Cacao / Otros' },
  ];

  const filteredCatalog =
    selectedCategoryTab === 'TODOS'
      ? ingredientes
      : ingredientes.filter((ing: any) => ing.categoria === selectedCategoryTab);

  const handleSaveRecipe = () => {
    saveCurrentMix();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>KairosMix Custom Snack Studio</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Diseña tu Mezcla de Frutos Secos & Snacks
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Combina ingredientes puros por gramo exacto. Nuestro motor calcula en tiempo real el perfil
            nutricional por porción de 100g, costo total y alertas de alérgenos.
          </p>

          <button
            onClick={() => setShowAiModal(true)}
            className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-stone-950 font-bold text-sm shadow-lg shadow-amber-900/20 transition-all flex items-center space-x-2 border border-amber-300/40"
          >
            <BrainCircuit className="w-4 h-4 text-stone-950 animate-pulse" />
            <span>Formular Mezcla Inteligente con IA (Gemini 3.6)</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mix Builder & Ingredient Weights (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Mix Name & Actions Bar */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Nombre de tu Receta / Mezcla
                </label>
                <input
                  type="text"
                  value={mixName}
                  onChange={(e) => setMixName(e.target.value)}
                  className="w-full text-base font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Ej. Mezcla Trail Proteica Antiox"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 sm:pt-4">
                <button
                  onClick={handleSaveRecipe}
                  disabled={items.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors flex items-center space-x-1 disabled:opacity-50"
                  title="Guardar receta en sesión"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Guardada!</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Guardar Receta</span>
                    </>
                  )}
                </button>

                <button
                  onClick={clearCart}
                  disabled={items.length === 0}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                  title="Vaciar mezcla actual"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of Ingredients in active mix */}
            <div className="divide-y divide-stone-100">
              {items.length === 0 ? (
                <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                  <Sliders className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  <p className="text-base font-medium">Tu mezcla está vacía</p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Selecciona ingredientes del catálogo abajo para agregarlos a tu bolsa
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const subtotal = item.gramos * item.precioPorGramo;
                  const itemCal = ((item.gramos * item.caloriasPor100g) / 100).toFixed(0);

                  return (
                    <div key={item.ingredienteId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-stone-900 truncate">{item.nombre}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                            {item.categoria.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-stone-500 flex items-center space-x-3 mt-0.5">
                          <span>${item.precioPorGramo.toFixed(3)}/g</span>
                          <span>•</span>
                          <span>{itemCal} kcal</span>
                          <span>•</span>
                          <span className="font-semibold text-amber-900">${subtotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Weight Stepper */}
                      <div className="flex items-center space-x-2">
                        <div className="inline-flex items-center bg-stone-100 rounded-lg p-1 border border-stone-200">
                          <button
                            onClick={() => updateGrams(item.ingredienteId, item.gramos - 10)}
                            className="p-1 rounded bg-white text-stone-700 hover:bg-stone-50 shadow-xs active:scale-95 transition-transform"
                            title="Restar 10g"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-14 text-center font-bold text-sm text-stone-900">
                            {item.gramos}g
                          </span>
                          <button
                            onClick={() => updateGrams(item.ingredienteId, item.gramos + 10)}
                            className="p-1 rounded bg-white text-stone-700 hover:bg-stone-50 shadow-xs active:scale-95 transition-transform"
                            title="Sumar 10g"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="hidden sm:flex space-x-1">
                          <button
                            onClick={() => updateGrams(item.ingredienteId, 50)}
                            className="text-[10px] px-1.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium"
                          >
                            50g
                          </button>
                          <button
                            onClick={() => updateGrams(item.ingredienteId, 100)}
                            className="text-[10px] px-1.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium"
                          >
                            100g
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.ingredienteId)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Add Ingredient Palette */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Agregar Ingredientes Disponibles</span>
              </h2>
              <span className="text-sm text-stone-500">{filteredCatalog.length} ingredientes</span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto gap-1.5 pb-2 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors font-medium ${
                  selectedCategoryTab === cat.id
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Ingredient Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="col-span-2 text-center py-6 text-stone-400">Cargando ingredientes...</div>
              ) : (
                filteredCatalog.map((ing: any) => {
                  const isAlreadyIn = items.some((i) => i.ingredienteId === ing.id);
                  const stockGrams = ing.stock?.gramosDisponibles ?? 0;

                  return (
                    <div
                      key={ing.id}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isAlreadyIn
                          ? 'border-amber-400 bg-amber-50/50'
                          : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50/70'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm text-stone-900 leading-tight">{ing.nombre}</h3>
                          <span className="text-xs text-stone-500 uppercase font-medium">
                            {ing.categoria.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-amber-900">
                          ${(ing.precioPorGramo || 0.05).toFixed(3)}/g
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-sm text-stone-600">
                        <span className="flex items-center space-x-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>{ing.caloriasPor100g} kcal/100g</span>
                        </span>

                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            stockGrams > 500
                              ? 'bg-emerald-50 text-emerald-700'
                              : stockGrams > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          Stock: {stockGrams}g
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          addItem({
                            ingredienteId: ing.id,
                            nombre: ing.nombre,
                            categoria: ing.categoria,
                            gramos: 50,
                            precioPorGramo: ing.precioPorGramo || 0.05,
                            caloriasPor100g: ing.caloriasPor100g,
                            proteinasG100g: ing.proteinasG100g,
                            grasasG100g: ing.grasasG100g,
                            carbohidratosG100g: ing.carbohidratosG100g,
                            fibraG100g: ing.fibraG100g ?? 0,
                            sodioMg100g: ing.sodioMg100g ?? 0,
                          })
                        }
                        disabled={stockGrams <= 0}
                        className={`w-full mt-2 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-1 ${
                          isAlreadyIn
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isAlreadyIn ? '+50g a la mezcla' : 'Añadir 50g'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Nutritional Dashboard & Order Action (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Macro Nutrient Summary Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-stone-900">Perfil Nutricional en Vivo</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {totalGramos}g totales
              </span>
            </div>

            {/* High-level Macro Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-orange-50/60 border border-orange-100 text-center">
                <Flame className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                <span className="text-[10px] font-semibold text-orange-700 uppercase">Calorías</span>
                <p className="text-lg font-black text-stone-900">{totalCalorias.toFixed(0)}</p>
                <span className="text-[10px] text-stone-500">
                  {totalGramos > 0 ? ((totalCalorias / totalGramos) * 100).toFixed(0) : 0} kcal/100g
                </span>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-center">
                <Dumbbell className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="text-[10px] font-semibold text-blue-700 uppercase">Proteína</span>
                <p className="text-lg font-black text-stone-900">{totalProteinas.toFixed(1)}g</p>
                <span className="text-[10px] text-stone-500">
                  {totalGramos > 0 ? ((totalProteinas / totalGramos) * 100).toFixed(1) : 0}g/100g
                </span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-center">
                <Wheat className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase">Fibra</span>
                <p className="text-lg font-black text-stone-900">{totalFibra.toFixed(1)}g</p>
                <span className="text-[10px] text-stone-500">
                  {totalGramos > 0 ? ((totalFibra / totalGramos) * 100).toFixed(1) : 0}g/100g
                </span>
              </div>
            </div>

            {/* Additional Macro Bars */}
            <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-600 flex items-center space-x-1.5">
                  <Droplet className="w-3.5 h-3.5 text-amber-600" />
                  <span>Grasas Saludables</span>
                </span>
                <span className="font-bold text-stone-900">{totalGrasas.toFixed(1)}g</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-600 flex items-center space-x-1.5">
                  <Wheat className="w-3.5 h-3.5 text-stone-500" />
                  <span>Carbohidratos Netos</span>
                </span>
                <span className="font-bold text-stone-900">{totalCarbos.toFixed(1)}g</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-600">Sodio</span>
                <span className="font-bold text-stone-900">{totalSodio.toFixed(0)}mg</span>
              </div>
            </div>

            {/* Allergen Warning Banner */}
            {detectedAllergens.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Alérgenos Detectados en esta Mezcla:</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {detectedAllergens.map((al, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 font-semibold text-[11px]"
                    >
                      {al}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition Label Modal Button */}
            <button
              onClick={() => setShowNutritionModal(!showNutritionModal)}
              className="w-full py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center space-x-1.5"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showNutritionModal ? 'Ocultar Tabla Nutricional' : 'Ver Tabla Nutricional FDA/USDA'}</span>
            </button>

            {showNutritionModal && (
              <div className="pt-2 flex justify-center animate-in fade-in zoom-in-95">
                <NutritionLabel
                  title={mixName}
                  stats={{
                    pesoTotalGramos: totalGramos || 100,
                    calorias: totalCalorias,
                    proteinas: totalProteinas,
                    grasas: totalGrasas,
                    carbohidratos: totalCarbos,
                    fibra: totalFibra,
                    sodioMg: totalSodio,
                  }}
                  porciones={Math.max(1, Math.round(totalGramos / 50))}
                />
              </div>
            )}

            {/* Price & Checkout CTA */}
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs text-stone-500 font-medium">Total de la Mezcla:</span>
                  <p className="text-2xl font-black text-stone-900">${totalPrice.toFixed(2)}</p>
                </div>
                <span className="text-xs text-stone-500">
                  {totalGramos > 0 ? `$${(totalPrice / totalGramos).toFixed(3)}/g` : '$0.00/g'}
                </span>
              </div>

              <button
                onClick={onOpenCart}
                disabled={items.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Proceder al Checkout ({totalGramos}g)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Mix Generator Modal */}
      <AiMixerModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onOpenCart={onOpenCart}
      />
    </div>
  );
}
