import React, { createContext, useContext, useState, useEffect } from 'react';

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
  addUoc: (newUoc: UocItem) => void;
  isPrincipleApplicable: (principleKey: string) => boolean;
}

const defaultUocs: UocItem[] = [
  {
    id: 'uoc-1',
    name: 'Finca El Paraíso',
    companyName: 'AgroPalma S.A.',
    country: 'Colombia',
    area: 1200,
    status: 'ACTIVE',
    managerName: 'Juan Torres',
    type: 'PLANTATION',
    appliesAll: false,
    applicablePrinciples: ['M1', 'M2', 'M3', 'M4', 'M6', 'M7'] // M5 (Pequeños productores) is N/A for owned plantation
  },
  {
    id: 'uoc-2',
    name: 'Extractora PalmCol S.A.S.',
    companyName: 'PalmCol Group',
    country: 'Colombia',
    area: 4500.75,
    status: 'ACTIVE',
    managerName: 'Carlos Mendez',
    type: 'MILL',
    appliesAll: false,
    applicablePrinciples: ['M1', 'M2', 'M3', 'M6', 'M7'] // M4 (Tierra/FPIC) and M5 (Pequeños productores) N/A for industrial mill
  },
  {
    id: 'uoc-3',
    name: 'Plantación Hacienda La Palma',
    companyName: 'PalmCol Group',
    country: 'Colombia',
    area: 2300.50,
    status: 'ACTIVE',
    managerName: 'Maria Rojas',
    type: 'MIXED',
    appliesAll: true,
    applicablePrinciples: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']
  }
];

const UocContext = createContext<UocContextType | undefined>(undefined);

export const UocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uocs, setUocs] = useState<UocItem[]>(() => {
    const saved = localStorage.getItem('ctc_uocs');
    return saved ? JSON.parse(saved) : defaultUocs;
  });

  const [selectedUocId, setSelectedUocId] = useState<string>(() => {
    return localStorage.getItem('ctc_selected_uoc_id') || 'all';
  });

  useEffect(() => {
    localStorage.setItem('ctc_uocs', JSON.stringify(uocs));
  }, [uocs]);

  useEffect(() => {
    localStorage.setItem('ctc_selected_uoc_id', selectedUocId);
  }, [selectedUocId]);

  const selectedUoc = selectedUocId === 'all' 
    ? null 
    : uocs.find(u => u.id === selectedUocId) || null;

  const updateUocScope = (id: string, scopeData: Partial<UocItem>) => {
    setUocs(prev => prev.map(u => u.id === id ? { ...u, ...scopeData } : u));
  };

  const addUoc = (newUoc: UocItem) => {
    setUocs(prev => [...prev, newUoc]);
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
