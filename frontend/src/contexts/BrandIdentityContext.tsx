import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface BrandAsset {
  id: string;
  name: string;
  type: 'logo' | 'media';
  dataUrl: string;
  mimeType?: string;
}

const STORAGE_KEY = 'brandIdentityAssets';

function loadFromStorage(): BrandAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(assets: BrandAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

interface BrandIdentityContextValue {
  assets: BrandAsset[];
  addAsset: (asset: Omit<BrandAsset, 'id'>) => void;
  removeAsset: (id: string) => void;
  hasAssets: boolean;
}

const defaultValue: BrandIdentityContextValue = {
  assets: [],
  addAsset: () => {},
  removeAsset: () => {},
  hasAssets: false,
};

const BrandIdentityContext = createContext<BrandIdentityContextValue>(defaultValue);

export function BrandIdentityProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<BrandAsset[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(assets);
  }, [assets]);

  const addAsset = useCallback((asset: Omit<BrandAsset, 'id'>) => {
    const newAsset: BrandAsset = {
      ...asset,
      id: crypto.randomUUID(),
    };
    setAssets((prev) => [...prev, newAsset]);
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value: BrandIdentityContextValue = {
    assets,
    addAsset,
    removeAsset,
    hasAssets: assets.length > 0,
  };

  return (
    <BrandIdentityContext.Provider value={value}>
      {children}
    </BrandIdentityContext.Provider>
  );
}

export function useBrandIdentity(): BrandIdentityContextValue {
  return useContext(BrandIdentityContext);
}

/** Use when component may render outside provider (returns default empty assets). */
export function useBrandIdentityOptional(): BrandIdentityContextValue {
  return useContext(BrandIdentityContext);
}
