import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

export type UocType = 'MIXED' | 'PLANTATION' | 'MILL' | 'SMALLHOLDERS';

export interface UocItem {
  id: string;
  name: string;
  companyName: string;
  country: string;
  area: number;
  status: string;
  managerName?: string;
  type: UocType;
  appliesAll: boolean;
  applicablePrinciples: string[]; // e.g. ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']
}

interface UocContextType {
  uocs: UocItem[];
  selectedUocId: string; // 'all' or UocItem.id
  setSelectedUocId: (id: string) => void;
  selectedUoc: UocItem | null;
  updateUocScope: (id: string, scopeData: Partial<UocItem>) => void;
  addUoc: (newUoc: Partial<UocItem>) => Promise<UocItem>;
  isPrincipleApplicable: (principleKey: string) => boolean;
}

const UocContext = createContext<UocContextType | undefined>(undefined);

export const UocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [uocs, setUocs] = useState<UocItem[]>([]);

  const [selectedUocId, setSelectedUocId] = useState<string>(() => {
    return localStorage.getItem('ctc_selected_uoc_id') || 'all';
  });

  useEffect(() => {
    if (!user) { setUocs([]); return; }
    api.get('/scc/uocs').then(({ data }) => {
      const normalized = data.map((u: any) => ({
        ...u,
        area: Number(u.area || 0),
        type: u.type || 'MIXED',
        appliesAll: Boolean(u.appliesAll),
        applicablePrinciples: (() => {
          if (Array.isArray(u.applicablePrinciples)) return u.applicablePrinciples;
          if (typeof u.applicablePrinciples === 'string') {
            try { return JSON.parse(u.applicablePrinciples); } catch { return []; }
          }
          return ['M1','M2','M3','M4','M5','M6','M7'];
        })()
      }));
      setUocs(normalized);
      const saved = localStorage.getItem('ctc_selected_uoc_id');
      const validSaved = saved && normalized.some((u: UocItem) => u.id === saved);
      const isGlobalAdmin = ['SUPERADMIN','ADMIN'].includes(user.role);
      if (!isGlobalAdmin && !validSaved) setSelectedUocId(normalized[0]?.id || '');
      if (isGlobalAdmin && !saved) setSelectedUocId('all');
    }).catch(() => setUocs([]));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ctc_selected_uoc_id', selectedUocId);
  }, [selectedUocId]);

  const selectedUoc = selectedUocId === 'all' 
    ? null 
    : uocs.find(u => u.id === selectedUocId) || null;

  const updateUocScope = (id: string, scopeData: Partial<UocItem>) => {
    setUocs(prev => prev.map(u => u.id === id ? { ...u, ...scopeData } : u));
  };

  const addUoc = async (newUoc: Partial<UocItem>) => {
    const { data } = await api.post('/scc/uocs', newUoc);
    const normalized: UocItem = {
      ...data,
      area: Number(data.area || 0),
      type: data.type || newUoc.type || 'MIXED',
      appliesAll: data.appliesAll == null ? true : Boolean(data.appliesAll),
      applicablePrinciples: Array.isArray(data.applicablePrinciples)
        ? data.applicablePrinciples
        : ['M1','M2','M3','M4','M5','M6','M7']
    };
    setUocs(prev => [...prev, normalized]);
    setSelectedUocId(normalized.id);
    return normalized;
  };

  const isPrincipleApplicable = (principleKey: string): boolean => {
    if (selectedUocId === 'all' || !selectedUoc) return true;
    if (selectedUoc.appliesAll) return true;
    return selectedUoc.applicablePrinciples.includes(principleKey);
  };

  return (
    <UocContext.Provider value={{
      uocs,
      selectedUocId,
      setSelectedUocId,
      selectedUoc,
      updateUocScope,
      addUoc,
      isPrincipleApplicable
    }}>
      {children}
    </UocContext.Provider>
  );
};

export const useUoc = () => {
  const context = useContext(UocContext);
  if (!context) {
    throw new Error('useUoc must be used within a UocProvider');
  }
  return context;
};

export const useUoC = useUoc;
