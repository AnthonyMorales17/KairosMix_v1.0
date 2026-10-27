'use client';

import { create } from 'zustand';

export interface CartItem {
  ingredienteId: number;
  nombre: string;
  categoria: string;
  gramos: number;
  precioPorGramo: number;
  caloriasPor100g: number;
  proteinasG100g: number;
  grasasG100g: number;
  carbohidratosG100g: number;
  fibraG100g: number;
  sodioMg100g: number;
  alergenos?: { alergenoId: number; alergeno?: { nombre: string } }[];
}

export interface CustomMix {
  id: string;
  nombre: string;
  items: CartItem[];
  pesoTotalGramos: number;
  precioTotal: number;
}

interface CartState {
  mixName: string;
  setMixName: (name: string) => void;
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateGrams: (ingredienteId: number, gramos: number) => void;
  removeItem: (ingredienteId: number) => void;
  clearCart: () => void;
  savedMixes: CustomMix[];
  saveCurrentMix: () => void;
  removeSavedMix: (id: string) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  mixName: 'Mi Mezcla Energética Kairos',
  setMixName: (mixName) => set({ mixName }),
  items: [],

  addItem: (item) => {
    const { items } = get();
    const existing = items.find((i) => i.ingredienteId === item.ingredienteId);
    if (existing) {
      set({
        items: items.map((i) =>
          i.ingredienteId === item.ingredienteId
            ? { ...i, gramos: i.gramos + item.gramos }
            : i
        ),
      });
    } else {
      set({ items: [...items, item] });
    }
  },

  updateGrams: (ingredienteId, gramos) => {
    if (gramos <= 0) {
      get().removeItem(ingredienteId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.ingredienteId === ingredienteId ? { ...i, gramos } : i
      ),
    });
  },

  removeItem: (ingredienteId) => {
    set({ items: get().items.filter((i) => i.ingredienteId !== ingredienteId) });
  },

  clearCart: () => {
    set({ items: [] });
  },

  savedMixes: [],
  saveCurrentMix: () => {
    const { items, mixName, savedMixes } = get();
    if (items.length === 0) return;
    const pesoTotalGramos = items.reduce((acc, i) => acc + i.gramos, 0);
    const precioTotal = items.reduce((acc, i) => acc + i.gramos * i.precioPorGramo, 0);

    const newMix: CustomMix = {
      id: `mix-${Date.now()}`,
      nombre: mixName || 'Mezcla Personalizada',
      items: [...items],
      pesoTotalGramos,
      precioTotal,
    };

    set({ savedMixes: [...savedMixes, newMix] });
  },

  removeSavedMix: (id) => {
    set({ savedMixes: get().savedMixes.filter((m) => m.id !== id) });
  },
}));
