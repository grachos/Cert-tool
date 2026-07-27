import { useEffect, useState } from 'react';
import api from '../api';

interface Transaction {
  id: string;
  transactionDate: string;
  batchRef?: string;
  counterparty?: string;
  documentRef?: string;
  volumeMt: number;
  supplyModel: string;
}

export default function Traceability() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/scc/transactions', { params: { type: 'RECEPTION' } })
      .then(({ data }) => setRows(data.filter((row: Transaction & { productType: string }) => row.productType === 'RFF')))
      .catch(() => setError('No fue posible consultar las recepciones RFF.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-col gap-4 animate-fade-in">
      <div className="card traceability-summary">
        <div><span className="eyebrow">CONTROL DE ORIGEN</span><h2 className="text-2xl font-bold mt-2">Trazabilidad RFF</h2><p className="text-secondary mt-2">Recepciones conectadas al libro transaccional SCC existente.</p></div>
        <div className="status-panel"><span className="status-dot success" /><div><strong>{rows.length}</strong><small> recepciones consultadas</small></div></div>
      </div>
      <div className="integration-note"><strong>Alcance actual:</strong> lote, fecha, tiquete/documento, volumen, contraparte y modelo se leen del backend. Vehículo, peso de báscula, elegibilidad predial y comparación producción–entrega requieren ampliar el modelo de datos.</div>
      <div className="card p-0 overflow-hidden"><div className="table-responsive"><table className="w-full text-left min-w-[820px]">
        <thead><tr className="bg-surface-1 border-b"><th className="p-4">Fecha</th><th className="p-4">Plantación / origen</th><th className="p-4">Lote</th><th className="p-4">Tiquete</th><th className="p-4">Peso neto (TM)</th><th className="p-4">Condición</th><th className="p-4">Elegibilidad</th></tr></thead>
        <tbody>
          {loading && <tr><td className="p-6 text-center" colSpan={7}>Cargando trazabilidad…</td></tr>}
          {error && <tr><td className="p-6 text-center text-secondary" colSpan={7}>{error}</td></tr>}
          {!loading && !error && rows.map(row => <tr key={row.id} className="border-b"><td className="p-4">{new Date(row.transactionDate).toLocaleDateString('es-CO')}</td><td className="p-4 font-semibold">{row.counterparty || 'Sin registrar'}</td><td className="p-4 mono">{row.batchRef || '—'}</td><td className="p-4">{row.documentRef || '—'}</td><td className="p-4 font-bold">{Number(row.volumeMt).toLocaleString('es-CO')}</td><td className="p-4"><span className="badge badge-success">{row.supplyModel}</span></td><td className="p-4"><span className="badge badge-pending">Pendiente de dato</span></td></tr>)}
          {!loading && !error && rows.length === 0 && <tr><td className="p-6 text-center text-secondary" colSpan={7}>No hay recepciones RFF registradas.</td></tr>}
        </tbody>
      </table></div></div>
    </div>
  );
}
