'use client';

import React from 'react';

interface NutritionStats {
  pesoTotalGramos: number;
  calorias: number;
  proteinas: number;
  grasas: number;
  carbohidratos: number;
  fibra: number;
  azucares?: number;
  sodioMg: number;
}

interface NutritionLabelProps {
  title?: string;
  stats: NutritionStats;
  porciones?: number;
  isPer100g?: boolean;
}

export default function NutritionLabel({
  title = 'Información Nutricional',
  stats,
  porciones = 1,
  isPer100g = false,
}: NutritionLabelProps) {
  const servingSize = isPer100g ? 100 : Math.round(stats.pesoTotalGramos / porciones);
  const factor = isPer100g ? (stats.pesoTotalGramos > 0 ? 100 / stats.pesoTotalGramos : 1) : 1;

  const cal = Math.round(stats.calorias * factor);
  const prot = Math.round(stats.proteinas * factor * 10) / 10;
  const fat = Math.round(stats.grasas * factor * 10) / 10;
  const carb = Math.round(stats.carbohidratos * factor * 10) / 10;
  const fib = Math.round(stats.fibra * factor * 10) / 10;
  const sugar = Math.round((stats.azucares ?? 0) * factor * 10) / 10;
  const sod = Math.round(stats.sodioMg * factor);

  // Daily Value (DV) Percentages based on standard 2,000 kcal diet
  const fatDV = Math.round((fat / 78) * 100);
  const carbDV = Math.round((carb / 275) * 100);
  const fibDV = Math.round((fib / 28) * 100);
  const protDV = Math.round((prot / 50) * 100);
  const sodDV = Math.round((sod / 2300) * 100);

  return (
    <div className="w-full max-w-xs bg-white text-stone-900 border-2 border-stone-900 p-3.5 rounded-lg font-sans text-xs shadow-sm">
      <div className="border-b-8 border-stone-900 pb-1 mb-1">
        <h3 className="font-extrabold text-xl leading-none uppercase tracking-tight">{title}</h3>
        <div className="flex justify-between text-[11px] text-stone-600 mt-1">
          <span>Tamaño de porción:</span>
          <span className="font-bold">{servingSize}g</span>
        </div>
        {!isPer100g && (
          <div className="flex justify-between text-[11px] text-stone-600">
            <span>Porciones por empaque:</span>
            <span className="font-semibold">{porciones}</span>
          </div>
        )}
      </div>

      <div className="border-b-4 border-stone-900 py-1 flex justify-between items-baseline">
        <div>
          <span className="font-bold text-sm">Calorías</span>
        </div>
        <span className="font-black text-2xl tracking-tight">{cal}</span>
      </div>

      <div className="text-[10px] text-right font-bold py-1 border-b border-stone-300">
        % Valor Diario (VD)*
      </div>

      <div className="space-y-1 text-xs divide-y divide-stone-200">
        <div className="flex justify-between pt-1">
          <span>
            <strong className="font-bold">Grasas Totales</strong> {fat}g
          </span>
          <span className="font-bold">{fatDV}%</span>
        </div>

        <div className="flex justify-between pt-1">
          <span>
            <strong className="font-bold">Sodio</strong> {sod}mg
          </span>
          <span className="font-bold">{sodDV}%</span>
        </div>

        <div className="flex justify-between pt-1">
          <span>
            <strong className="font-bold">Carbohidratos Totales</strong> {carb}g
          </span>
          <span className="font-bold">{carbDV}%</span>
        </div>

        <div className="flex justify-between pl-3 pt-0.5 text-stone-600">
          <span>Fibra Dietaria {fib}g</span>
          <span className="font-semibold text-stone-900">{fibDV}%</span>
        </div>

        <div className="flex justify-between pl-3 pt-0.5 text-stone-600">
          <span>Azúcares Totales {sugar}g</span>
          <span className="text-stone-400">-</span>
        </div>

        <div className="flex justify-between pt-1 border-b-4 border-stone-900 pb-1">
          <span>
            <strong className="font-bold">Proteínas</strong> {prot}g
          </span>
          <span className="font-bold">{protDV}%</span>
        </div>
      </div>

      <p className="text-[9px] text-stone-500 mt-2 leading-tight">
        * El % de Valor Diario le indica cuánto contribuye un nutriente en una porción de alimento a una dieta diaria de 2,000 calorías.
      </p>
    </div>
  );
}
