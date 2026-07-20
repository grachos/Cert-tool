import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api';

interface UoCContextType {
  selectedUocId: string;
  selectedUocName: string;
  uocs: { id: string; name: string }[];
  setSelectedUoc: (id: string, name: string) => void;
}

const UoCContext = createContext<UoCContextType>({
  selectedUocId: '',
  selectedUocName: 'Todas las UoCs',
  uocs: [],
  setSelectedUoc: () => {}
});

export const useUoC = () => useContext(UoCContext);

export const UoCProvider = ({ children }: { children: ReactNode }) => {
  const [selectedUocId, setSelectedUocId] = useState('');
  const [selectedUocName, setSelectedUocName] = useState('Todas las UoCs');
  const [uocs, setUocs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchUocs = async () => {
      try {
        const { data } = await api.get('/scc/uocs');
        setUocs(data.map((u: any) => ({ id: u.id, name: u.name })));
      } catch (e) { /* */ }
    };
    fetchUocs();
  }, []);

  const setSelectedUoc = (id: string, name: string) => {
    setSelectedUocId(id);
    setSelectedUocName(name || 'Todas las UoCs');
  };

  return (
    <UoCContext.Provider value={{ selectedUocId, selectedUocName, uocs, setSelectedUoc }}>
      {children}
    </UoCContext.Provider>
  );
};
