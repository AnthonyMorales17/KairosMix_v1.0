'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useCartStore } from '@/lib/store/useCartStore';
import NutritionLabel from './NutritionLabel';
import {
  Layers,
  Search,
  Plus,
  Flame,
  Dumbbell,
  Wheat,
  ShieldCheck,
  AlertCircle,
  Eye,
  Check,
  Filter,
} from 'lucide-react';

export default function CatalogView() {
  const { addItem } = useCartStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [excludeAllergenId, setExcludeAllergenId] = useState<number | null>(null);
  const [inspectingIngredient, setInspectingIngredient] = useState<any | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

  // 1. Fetch Allergens
  const { data: alergenos = [] } = useQuery({
    queryKey: ['alergenos'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/catalog/alergenos');
      if (!res.ok) throw new Error('Error al cargar alérgenos');
      return res.json();
    },
  });

  // 2. Fetch Ingredients with reactive filters
  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ['catalog', selectedCategory, excludeAllergenId, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('soloActivos', 'true');
      if (selectedCategory !== 'TODOS') params.append('categoria', selectedCategory);
      if (excludeAllergenId) params.append('excluirAlergenoId', String(excludeAllergenId));
      if (searchTerm) params.append('busqueda', searchTerm);

      const res = await apiFetch(`/api/v1/catalog/ingredientes?${params.toString()}`);
      if (!res.ok) throw new Error('Error al consultar catálogo');
      return res.json();
    },
  });

  const categories = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'FRUTO_SECO', label: 'Frutos Secos' },
    { id: 'SEMILLA', label: 'Semillas' },
    { id: 'FRUTA_DESHIDRATADA', label: 'Frutas Deshidratadas' },
    { id: 'CEREAL', label: 'Cereales' },
    { id: 'PROTEINA_POLVO', label: 'Proteínas' },
    { id: 'ESPECIA', label: 'Especias' },
    { id: 'OTRO', label: 'Otros / Cacao' },
  ];

  const handleAdd = (ing: any) => {
    addItem({
      ingredienteId: ing.id,
      nombre: ing.nombre,
      categoria: ing.categoria,
      gramos: 100,
      precioPorGramo: ing.precioPorGramo || 0.05,
      caloriasPor100g: ing.caloriasPor100g,
      proteinasG100g: ing.proteinasG100g,
      grasasG100g: ing.grasasG100g,
      carbohidratosG100g: ing.carbohidratosG100g,
      fibraG100g: ing.fibraG100g ?? 0,
      sodioMg100g: ing.sodioMg100g ?? 0,
    });
    setAddedId(ing.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
              <Layers className="w-4 h-4" />
              <span>Catálogo Maestro de Ingredientes</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">Ingredientes 100% Puros & Trazables</h1>
            <p className="text-sm sm:text-base text-stone-500 mt-0.5">
              Datos nutricionales certificados según USDA FoodData Central (FDC) y etiquetado de alérgenos.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="w-full pl-9 pr-4 py-2.5 text-sm font-medium rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category & Allergen Filter Controls */}
        <div className="mt-5 pt-4 border-t border-stone-100 space-y-3">
          {/* Categories */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Allergen Exclusion Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 text-sm text-stone-600">
            <span className="font-semibold flex items-center space-x-1 text-stone-800 shrink-0">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Excluir Alérgeno:</span>
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setExcludeAllergenId(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  excludeAllergenId === null
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Sin exclusión
              </button>
              {alergenos.map((al: any) => (
                <button
                  key={al.id}
                  onClick={() => setExcludeAllergenId(excludeAllergenId === al.id ? null : al.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    excludeAllergenId === al.id
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  Sin {al.nombre.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-stone-400">Consultando catálogo...</div>
        ) : ingredientes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-stone-400" />
            <p className="font-semibold text-sm">No se encontraron ingredientes con los filtros aplicados</p>
            <p className="text-xs text-stone-400 mt-1">Prueba quitando el filtro de alérgenos o buscando otro término</p>
          </div>
        ) : (
          ingredientes.map((ing: any) => {
            const stockGramos = ing.stock?.gramosDisponibles ?? 0;
            const isAdded = addedId === ing.id;

            return (
              <div
                key={ing.id}
                className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {ing.categoria.replace('_', ' ')}
                    </span>
                    {ing.fdcId && (
                      <span className="text-[10px] text-stone-400 font-mono" title="USDA FoodData Central ID">
                        FDC #{ing.fdcId}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-base text-stone-900 leading-tight mb-1">{ing.nombre}</h3>
                  <div className="flex items-baseline space-x-1 mb-3">
                    <span className="text-xl font-black text-amber-900">${(ing.precioPorGramo || 0.05).toFixed(3)}</span>
                    <span className="text-xs text-stone-500">/ gramo</span>
                  </div>

                  {/* Nutrition Highlights */}
                  <div className="grid grid-cols-3 gap-1.5 py-2.5 px-2 bg-stone-50 rounded-lg text-center text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Calorías</span>
                      <strong className="font-bold text-stone-800">{ing.caloriasPor100g}</strong>
                      <span className="text-[9px] text-stone-400 block">/100g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Proteína</span>
                      <strong className="font-bold text-blue-700">{ing.proteinasG100g}g</strong>
                      <span className="text-[9px] text-stone-400 block">/100g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Grasas</span>
                      <strong className="font-bold text-amber-700">{ing.grasasG100g}g</strong>
                      <span className="text-[9px] text-stone-400 block">/100g</span>
                    </div>
                  </div>

                  {/* Allergens Tags */}
                  {ing.alergenos && ing.alergenos.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ing.alergenos.map((ia: any) => (
                        <span
                          key={ia.alergenoId}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            ia.nivel === 'CONTIENE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {ia.nivel === 'CONTIENE' ? 'Contiene' : 'Trazas'}: {ia.alergeno?.nombre?.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1 mb-3">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Sin alérgenos mayores declarados</span>
                    </div>
                  )}
                </div>

                {/* Card Actions & Stock */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-stone-500 text-[10px] block">Stock Disponible:</span>
                    <span
                      className={`font-bold ${
                        stockGramos > 500 ? 'text-emerald-700' : stockGramos > 0 ? 'text-amber-700' : 'text-rose-600'
                      }`}
                    >
                      {stockGramos}g
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setInspectingIngredient(ing)}
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                      title="Ver Ficha Nutricional Completa"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAdd(ing)}
                      disabled={stockGramos <= 0}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs active:scale-95'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Agregado!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>+100g a Mezcla</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ingredient Inspection Modal */}
      {inspectingIngredient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase">
                  {inspectingIngredient.categoria.replace('_', ' ')}
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900">{inspectingIngredient.nombre}</h3>
                {inspectingIngredient.fdcId && (
                  <p className="text-xs text-stone-400 font-mono">USDA FDC #{inspectingIngredient.fdcId}</p>
                )}
              </div>
              <button
                onClick={() => setInspectingIngredient(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center py-2">
              <NutritionLabel
                title={inspectingIngredient.nombre}
                stats={{
                  pesoTotalGramos: 100,
                  calorias: inspectingIngredient.caloriasPor100g,
                  proteinas: inspectingIngredient.proteinasG100g,
                  grasas: inspectingIngredient.grasasG100g,
                  carbohidratos: inspectingIngredient.carbohidratosG100g,
                  fibra: inspectingIngredient.fibraG100g ?? 0,
                  azucares: inspectingIngredient.azucaresG100g ?? 0,
                  sodioMg: inspectingIngredient.sodioMg100g ?? 0,
                }}
                isPer100g={true}
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setInspectingIngredient(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleAdd(inspectingIngredient);
                  setInspectingIngredient(null);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Agregar 100g a mi Mezcla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
