import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BrandIdentityAPI } from '../services/adsurv';

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
  loading: boolean;
}

const defaultValue: BrandIdentityContextValue = {
  assets: [],
  addAsset: () => {},
  removeAsset: () => {},
  hasAssets: false,
  loading: false,
};

const BrandIdentityContext = createContext<BrandIdentityContextValue>(defaultValue);

export function BrandIdentityProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<BrandAsset[]>(loadFromStorage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAssets(loadFromStorage());
      setLoading(false);
      return;
    }
    BrandIdentityAPI.list()
      .then((list) => {
        const mapped: BrandAsset[] = list.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type as 'logo' | 'media',
          dataUrl: a.dataUrl,
          mimeType: a.mimeType,
        }));
        setAssets(mapped);
        saveToStorage(mapped);
      })
      .catch(() => setAssets(loadFromStorage()))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) saveToStorage(assets);
  }, [assets, loading]);

  const addAsset = useCallback((asset: Omit<BrandAsset, 'id'>) => {
    const token = localStorage.getItem('token');
    if (token) {
      BrandIdentityAPI.add({
        name: asset.name,
        type: asset.type,
        data_url: asset.dataUrl,
        mime_type: asset.mimeType,
      })
        .then((a) => {
          setAssets((prev) => [...prev, { id: a.id, name: a.name, type: a.type as 'logo' | 'media', dataUrl: a.dataUrl, mimeType: a.mimeType }]);
        })
        .catch(() => {
          const fallback: BrandAsset = { ...asset, id: crypto.randomUUID() };
          setAssets((prev) => [...prev, fallback]);
        });
    } else {
      const newAsset: BrandAsset = { ...asset, id: crypto.randomUUID() };
      setAssets((prev) => [...prev, newAsset]);
    }
  }, []);

  const removeAsset = useCallback((id: string) => {
    const token = localStorage.getItem('token');
    if (token) {
      BrandIdentityAPI.remove(id).then(
        () => setAssets((prev) => prev.filter((a) => a.id !== id)),
        () => setAssets((prev) => prev.filter((a) => a.id !== id))
      );
    } else {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const value: BrandIdentityContextValue = {
    assets,
    addAsset,
    removeAsset,
    hasAssets: assets.length > 0,
    loading,
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
