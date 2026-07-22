import { useState, useEffect } from 'react';
import api from '../api';
import { useUoc, type UocType, type UocItem } from '../components/UoCContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

interface SccTransaction { id: string; uocId: string; type: string; productType: string; supplyModel: string; volumeMt: number; batchRef: string; counterparty: string; documentRef: string; greenhouseGas: number; transactionDate: string; notes: string; }
interface SccDashboard { uocCount: number; volumes: { type: string; productType: string; supplyModel: string; totalVolume: number }[]; stock: { productType: string; supplyModel: string; balance: number }[]; }

type SccTab = 'dashboard' | 'reception' | 'production' | 'sales' | 'stock' | 'prisma' | 'control' | 'checklist' | 'uocs';
const supplyModelLabels: Record<string, string> = { IP: 'Identity Preserved', SG: 'Segregated', MB: 'Mass Balance', BC: 'Book & Claim' };
const productLabels: Record<string, string> = { RFF: 'RFF (Fruto)', CPO: 'CPO (Aceite Crudo)', PK: 'PK (Almendra)', PKO: 'PKO (Aceite Almendra)', PKE: 'PKE (Expeller)', RBDPO: 'RBDPO (Aceite Refinado)', RBDPL: 'RBDPL (Oleína)', PFAD: 'PFAD' };
const modelColors: Record<string, string> = { IP: '#2563eb', SG: '#16a34a', MB: '#d97706', BC: '#9333ea' };

const ALL_PRINCIPLES = [
  { id: 'M1', label: 'M1: Gobierno, ética y DD. HH.' },
  { id: 'M2', label: 'M2: Cumplimiento legal y terceros' },
  { id: 'M3', label: 'M3: Estrategia, operación y trazabilidad' },
  { id: 'M4', label: 'M4: Tierra, FPIC y comunidades' },
  { id: 'M5', label: 'M5: Pequeños productores' },
  { id: 'M6', label: 'M6: Trabajo decente y SST' },
  { id: 'M7', label: 'M7: Ambiente, clima y biodiversidad' },
];

export default function Scc() {
  const { uocs, addUoc, updateUocScope, selectedUocId, setSelectedUocId } = useUoc();
  const { t, language } = useThemeLanguage();
  const [activeTab, setActiveTab] = useState<SccTab>('dashboard');
  const [dashboard, setDashboard] = useState<SccDashboard | null>(null);
  const [transactions, setTransactions] = useState<SccTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [selectedUocFilter] = useState(selectedUocId === 'all' ? '' : selectedUocId);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'UOC' | 'TRANSACTION'>('TRANSACTION');
  const [editingUoc, setEditingUoc] = useState<UocItem | null>(null);

  // UOC Scope Form State
  const [uocType, setUocType] = useState<UocType>('MIXED');
  const [uocAppliesAll, setUocAppliesAll] = useState(true);
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']);

  const fetchAll = async () => {
    try {
      const [d, t] = await Promise.all([
        api.get('/scc/dashboard'),
        api.get('/scc/transactions', { params: { uocId: selectedUocFilter || undefined, type: filterType || undefined } })
      ]);
      setDashboard(d.data);
      setTransactions(t.data);
    } catch (e) { /* */ }
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, [selectedUocFilter, filterType]);

  const openUocForm = (targetUoc?: UocItem) => {
    setFormMode('UOC');
    if (targetUoc) {
      setEditingUoc(targetUoc);
      setUocType(targetUoc.type);
      setUocAppliesAll(targetUoc.appliesAll);
      setSelectedPrinciples(targetUoc.applicablePrinciples || ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']);
    } else {
      setEditingUoc(null);
      setUocType('MIXED');
      setUocAppliesAll(true);
      setSelectedPrinciples(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']);
    }
    setShowForm(true);
  };

  const handleTogglePrinciple = (pId: string) => {
    if (selectedPrinciples.includes(pId)) {
      if (selectedPrinciples.length === 1) return; // keep at least 1
      setSelectedPrinciples(selectedPrinciples.filter(p => p !== pId));
    } else {
      setSelectedPrinciples([...selectedPrinciples, pId]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));

    if (formMode === 'UOC') {
      const uocData: UocItem = {
        id: editingUoc ? editingUoc.id : `uoc-${Date.now()}`,
        name: data.name as string,
        companyName: data.companyName as string,
        country: (data.country as string) || 'Colombia',
        area: parseFloat(data.area as string) || 0,
        status: 'ACTIVE',
        managerName: data.managerName as string,
        type: uocType,
        appliesAll: uocAppliesAll,
        applicablePrinciples: uocAppliesAll ? ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'] : selectedPrinciples
      };

      if (editingUoc) {
        updateUocScope(editingUoc.id, uocData);
      } else {
        addUoc(uocData);
      }
      setShowForm(false);
      return;
    }

    try {
      const body = {
        ...data,
        volumeMt: parseFloat(data.volumeMt as string),
        greenhouseGas: parseFloat(data.greenhouseGas as string) || 0
      };
      await api.post('/scc/transactions', body);
      setShowForm(false);
      fetchAll();
    } catch (err) { alert(language === 'es' ? 'Error al guardar transacción' : 'Error saving transaction'); }
  };

  const vols = dashboard?.volumes || [];
  const stockData = dashboard?.stock || [];
  const sumVol = (type: string, model?: string) => vols.filter(v => v.type === type && (!model || v.supplyModel === model)).reduce((s, v) => s + Number(v.totalVolume), 0);

  const tabs: { id: SccTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reception', label: language === 'es' ? 'Recepción' : 'Reception' },
    { id: 'production', label: language === 'es' ? 'Producción' : 'Production' },
    { id: 'sales', label: language === 'es' ? 'Ventas' : 'Sales' },
    { id: 'stock', label: language === 'es' ? 'Balance' : 'Stock' },
    { id: 'prisma', label: 'Prisma' },
    { id: 'control', label: language === 'es' ? 'Control' : 'Control' },
    { id: 'checklist', label: language === 'es' ? 'Checklist' : 'Checklist' },
    { id: 'uocs', label: 'UoCs' },
  ];

  const filteredTxs = transactions.filter(tx => {
    if (activeTab === 'reception') return tx.type === 'RECEPTION';
    if (activeTab === 'production') return tx.type === 'PRODUCTION';
    if (activeTab === 'sales') return tx.type === 'SALE';
    return true;
  });

  const getTypeBadge = (type: string) => {
    const map: Record<string, { c: string; l: string }> = { RECEPTION: { c: 'var(--accent-green-bg)', l: 'var(--accent-green)' }, PRODUCTION: { c: 'var(--accent-blue-light)', l: 'var(--accent-blue)' }, SALE: { c: 'var(--accent-red-bg)', l: 'var(--accent-red)' }, TRANSFER: { c: '#f3e8ff', l: '#9333ea' } };
    const s = map[type] || { c: '#f1f5f9', l: 'var(--text-muted)' };
    return <span className="badge" style={{ background: s.c, color: s.l }}>{type === 'RECEPTION' ? (language === 'es' ? 'Recepción' : 'Reception') : type === 'PRODUCTION' ? (language === 'es' ? 'Prod.' : 'Prod.') : type === 'SALE' ? (language === 'es' ? 'Venta' : 'Sale') : (language === 'es' ? 'Transf.' : 'Transf.')}</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLIANT' || status === 'OK') return <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{language === 'es' ? 'Cumple' : 'Compliant'}</span>;
    if (status === 'PARTIAL' || status === 'WARN') return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>{language === 'es' ? 'Parcial' : 'Partial'}</span>;
    return <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}>{language === 'es' ? 'Pendiente' : 'Pending'}</span>;
  };

  if (loading) return <div className="text-center text-muted" style={{ padding: '3rem' }}>{language === 'es' ? 'Cargando datos SCC...' : 'Loading SCC data...'}</div>;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex gap-1 flex-wrap overflow-x-auto" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id}
            className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: activeTab === tab.id ? 'none' : undefined }}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="flex-col gap-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('scc.uocCount')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{dashboard?.uocCount || 0}</span><span className="text-sm text-accent-green font-medium">{language === 'es' ? 'Activas' : 'Active'}</span></div></div>
            <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{language === 'es' ? 'Transacciones' : 'Transactions'}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{transactions.length}</span><span className="text-sm text-muted font-medium">{language === 'es' ? 'Total' : 'Total'}</span></div></div>
            <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('scc.receptionTab')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{sumVol('RECEPTION').toFixed(0)}</span><span className="text-sm text-muted font-medium">RFF + CPO</span></div></div>
            <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('scc.salesTab')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{sumVol('SALE').toFixed(0)}</span><span className="text-sm text-muted font-medium">CPO + PK</span></div></div>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-surface-1"><h3 className="text-base font-bold text-primary">{language === 'es' ? 'Resumen por Modelo de Suministro' : 'Supply Model Summary'}</h3></div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[600px]">
                <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Modelo' : 'Model'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Recibido' : 'Received'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Producido' : 'Produced'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Vendido' : 'Sold'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Balance' : 'Balance'}</th></tr></thead>
                <tbody>
                  {Object.entries(supplyModelLabels).map(([m, l]) => { const bal = stockData.filter(s => s.supplyModel === m).reduce((a, s) => a + Number(s.balance), 0); return (<tr key={m} className="border-b border-gray-100 hover:bg-surface-1"><td className="p-4"><span className="font-semibold" style={{ color: modelColors[m] }}>{l}</span></td><td className="p-4">{sumVol('RECEPTION', m).toLocaleString()}</td><td className="p-4">{sumVol('PRODUCTION', m).toLocaleString()}</td><td className="p-4">{sumVol('SALE', m).toLocaleString()}</td><td className="p-4 font-bold" style={{ color: bal < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{bal.toLocaleString()}</td></tr>); })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STOCK */}
      {activeTab === 'stock' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-surface-1"><h3 className="text-base font-bold text-primary">{t('scc.stockBalance')}</h3></div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[500px]"><thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Producto' : 'Product'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Modelo' : 'Model'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Balance (TM)' : 'Stock (MT)'}</th></tr></thead><tbody>
              {stockData.map((s, i) => <tr key={i} className="border-b hover:bg-surface-1"><td className="p-4">{productLabels[s.productType] || s.productType}</td><td className="p-4"><span style={{ color: modelColors[s.supplyModel] }} className="font-semibold">{supplyModelLabels[s.supplyModel]}</span></td><td className="p-4 font-bold" style={{ color: Number(s.balance) < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{Number(s.balance).toLocaleString()}</td></tr>)}
              {stockData.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted">{language === 'es' ? 'Sin datos de inventario' : 'No inventory data'}</td></tr>}
            </tbody></table>
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      {(activeTab === 'reception' || activeTab === 'production' || activeTab === 'sales') && (
        <div className="flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <select value={selectedUocId} onChange={e => setSelectedUocId(e.target.value)} className="form-input" style={{ width: '220px', maxWidth: '100%' }}><option value="all">{language === 'es' ? 'Todas las UoCs' : 'All UoCs'}</option>{uocs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-input" style={{ width: '160px', maxWidth: '100%' }}><option value="">{language === 'es' ? 'Todos los tipos' : 'All Types'}</option><option value="RECEPTION">{language === 'es' ? 'Recepción' : 'Reception'}</option><option value="PRODUCTION">{language === 'es' ? 'Producción' : 'Production'}</option><option value="SALE">{language === 'es' ? 'Venta' : 'Sale'}</option><option value="TRANSFER">{language === 'es' ? 'Transferencia' : 'Transfer'}</option></select>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormMode('TRANSACTION'); }}>{language === 'es' ? '+ Nueva Transacción' : '+ New Transaction'}</button>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]"><thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Fecha' : 'Date'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Tipo' : 'Type'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Producto' : 'Product'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Modelo' : 'Model'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Vol. (TM)' : 'Vol. (MT)'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Lote' : 'Batch'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Contraparte' : 'Counterparty'}</th></tr></thead><tbody>
              {filteredTxs.map(tx => <tr key={tx.id} className="border-b hover:bg-surface-1"><td className="p-4 text-sm text-secondary">{new Date(tx.transactionDate).toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US')}</td><td className="p-4">{getTypeBadge(tx.type)}</td><td className="p-4 text-sm">{productLabels[tx.productType] || tx.productType}</td><td className="p-4"><span className="font-semibold text-sm" style={{ color: modelColors[tx.supplyModel] }}>{tx.supplyModel}</span></td><td className="p-4 text-sm font-mono">{Number(tx.volumeMt).toLocaleString()}</td><td className="p-4 text-sm text-secondary">{tx.batchRef || '—'}</td><td className="p-4 text-sm text-secondary">{tx.counterparty || '—'}</td></tr>)}
              {filteredTxs.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted">{language === 'es' ? 'Sin transacciones' : 'No transactions'}</td></tr>}
            </tbody></table>
            </div>
          </div>
        </div>
      )}

      {/* PRISMA */}
      {activeTab === 'prisma' && (
        <div className="flex-col gap-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {[
              { m: 'IP', l: 'Identity Preserved', a: 1250, s: 320, p: 0, c: 'RSPO-IP-2026-001' },
              { m: 'SG', l: 'Segregated', a: 850, s: 500, p: 100, c: 'RSPO-SG-2026-002' },
              { m: 'MB', l: 'Mass Balance', a: 2100, s: 1800, p: 300, c: 'RSPO-MB-2026-003' },
              { m: 'BC', l: 'Book & Claim', a: 500, s: 200, p: 0, c: 'RSPO-BC-2026-004' },
            ].map(cr => {
              const bal = cr.a + cr.p - cr.s;
              return (
                <div key={cr.m} className="card" style={{ borderLeft: `4px solid ${modelColors[cr.m]}` }}>
                  <div className="flex justify-between items-start mb-2"><div><h4 className="font-bold text-base" style={{ color: modelColors[cr.m] }}>{cr.l}</h4><span className="text-xs text-muted font-mono">{cr.c}</span></div><span className="text-2xl font-bold" style={{ color: modelColors[cr.m] }}>{bal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-secondary mt-2"><span>{language === 'es' ? 'Disponible:' : 'Available:'} <b>{cr.a.toLocaleString()} TM</b></span><span>{language === 'es' ? 'Vendido:' : 'Sold:'} <b style={{ color: 'var(--accent-red)' }}>{cr.s.toLocaleString()} TM</b></span></div>
                  {cr.p > 0 && <div className="text-sm text-secondary mt-1">{language === 'es' ? 'Comprado:' : 'Purchased:'} <b style={{ color: 'var(--accent-green)' }}>{cr.p.toLocaleString()} TM</b></div>}
                  <div className="flex gap-2 mt-4"><button className="btn btn-secondary btn-sm">{language === 'es' ? 'Registrar Venta' : 'Log Sale'}</button><button className="btn btn-secondary btn-sm">{language === 'es' ? 'Registrar Compra' : 'Log Purchase'}</button></div>
                </div>
              );
            })}
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b bg-surface-1"><h3 className="text-base font-bold text-primary">{language === 'es' ? 'Certificados RSPO' : 'RSPO Certificates'}</h3></div>
            <table className="w-full text-left"><thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Modelo' : 'Model'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Certificado' : 'Certificate'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Disponible' : 'Available'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Vendido' : 'Sold'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Balance' : 'Balance'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead><tbody>
            {[
              { m: 'IP', l: 'Identity Preserved', a: 1250, s: 320, p: 0, c: 'RSPO-IP-2026-001' },
              { m: 'SG', l: 'Segregated', a: 850, s: 500, p: 100, c: 'RSPO-SG-2026-002' },
              { m: 'MB', l: 'Mass Balance', a: 2100, s: 1800, p: 300, c: 'RSPO-MB-2026-003' },
              { m: 'BC', l: 'Book & Claim', a: 500, s: 200, p: 0, c: 'RSPO-BC-2026-004' },
            ].map(cr => <tr key={cr.m} className="border-b hover:bg-surface-1"><td className="p-4"><span className="font-semibold" style={{ color: modelColors[cr.m] }}>{cr.l}</span></td><td className="p-4 text-sm font-mono text-secondary">{cr.c}</td><td className="p-4">{cr.a.toLocaleString()}</td><td className="p-4" style={{ color: 'var(--accent-red)' }}>{cr.s.toLocaleString()}</td><td className="p-4 font-bold">{((cr.a + cr.p - cr.s)).toLocaleString()}</td><td className="p-4"><span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{language === 'es' ? 'Activo' : 'Active'}</span></td></tr>)}
          </tbody></table>
          </div>
        </div>
      )}

      {/* CONTROL */}
      {activeTab === 'control' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b bg-surface-1"><h3 className="text-base font-bold text-primary">{language === 'es' ? 'Control Interno — Verificación SCC' : 'Internal Control — SCC Verification'}</h3></div>
          <table className="w-full text-left"><thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Item de Control' : 'Control Item'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Frecuencia' : 'Frequency'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead><tbody>
            {[
              { i: language === 'es' ? 'Verificar conciliación de entradas RFF vs salidas CPO' : 'Verify FFB input vs CPO output reconciliation', f: language === 'es' ? 'Diario' : 'Daily', s: 'OK' },
              { i: language === 'es' ? 'Validar trazabilidad de lotes en todas las transacciones' : 'Validate batch traceability across all transactions', f: language === 'es' ? 'Diario' : 'Daily', s: 'OK' },
              { i: language === 'es' ? 'Confirmar volúmenes vendidos no exceden créditos disponibles' : 'Confirm sold volumes do not exceed available credits', f: language === 'es' ? 'Semanal' : 'Weekly', s: 'WARN' },
              { i: language === 'es' ? 'Revisar GEI declarado vs calculado' : 'Review declared vs calculated GHG', f: language === 'es' ? 'Mensual' : 'Monthly', s: 'OK' },
              { i: language === 'es' ? 'Auditar documentos de respaldo (REMs, facturas, certificados)' : 'Audit supporting documents (waybills, invoices, certificates)', f: language === 'es' ? 'Mensual' : 'Monthly', s: 'PENDING' },
              { i: language === 'es' ? 'Validar registro de UoCs en PalmTrace' : 'Validate UoC registration in PalmTrace', f: language === 'es' ? 'Trimestral' : 'Quarterly', s: 'OK' },
              { i: language === 'es' ? 'Verificar todas las transacciones tienen supplyModel' : 'Verify all transactions have supplyModel', f: language === 'es' ? 'Diario' : 'Daily', s: 'OK' },
            ].map(c => <tr key={c.i} className="border-b hover:bg-surface-1"><td className="p-4 text-sm">{c.i}</td><td className="p-4 text-sm text-secondary">{c.f}</td><td className="p-4">{getStatusBadge(c.s)}</td></tr>)}
          </tbody></table>
        </div>
      )}

      {/* CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Checklist Pre-Auditoría SCC' : 'SCC Pre-Audit Checklist'}</h3>
            <span className="text-base font-bold" style={{ color: 'var(--accent-green)' }}>9/12 {language === 'es' ? 'completados' : 'completed'}</span>
          </div>
          <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: '75%', background: 'var(--accent-green)' }} /></div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left"><thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Área' : 'Area'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Item de Verificación' : 'Verification Item'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Obligatorio' : 'Mandatory'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead><tbody>
            {[
              { a: language === 'es' ? 'Documentación' : 'Documentation', i: language === 'es' ? 'Certificados RSPO vigentes para todos los modelos' : 'Valid RSPO certificates for all supply models', r: true, d: true },
              { a: language === 'es' ? 'Documentación' : 'Documentation', i: language === 'es' ? 'Procedimiento SCC documentado y aprobado' : 'Documented and approved SCC SOP', r: true, d: true },
              { a: language === 'es' ? 'Documentación' : 'Documentation', i: language === 'es' ? 'Registros de capacitación del personal en SCC' : 'Staff SCC training records', r: true, d: true },
              { a: language === 'es' ? 'Trazabilidad' : 'Traceability', i: language === 'es' ? 'Sistema de trazabilidad implementado (lotes, documentos)' : 'Implemented traceability system (batches, docs)', r: true, d: true },
              { a: language === 'es' ? 'Trazabilidad' : 'Traceability', i: language === 'es' ? 'Balance de masa por modelo sin déficits' : 'Mass balance per model without deficit', r: true, d: true },
              { a: 'PalmTrace', i: language === 'es' ? 'Registro activo en PalmTrace / Prisma' : 'Active registration in PalmTrace / Prisma', r: true, d: true },
              { a: 'PalmTrace', i: language === 'es' ? 'Transacciones de créditos registradas al día' : 'Up-to-date credit transaction records', r: false, d: true },
              { a: language === 'es' ? 'Ventas' : 'Sales', i: language === 'es' ? 'Facturas con declaración RSPO (modelo de suministro)' : 'Invoices carrying RSPO claim (supply model)', r: true, d: true },
              { a: language === 'es' ? 'Ventas' : 'Sales', i: language === 'es' ? 'Contratos con compradores incluyen cláusula RSPO' : 'Buyer contracts include RSPO clause', r: false, d: true },
              { a: language === 'es' ? 'Auditoría' : 'Audit', i: language === 'es' ? 'Auditoría interna SCC en últimos 12 meses' : 'Internal SCC audit within last 12 months', r: true, d: false },
              { a: language === 'es' ? 'Auditoría' : 'Audit', i: language === 'es' ? 'No conformidades anteriores cerradas' : 'Previous NCs fully closed', r: true, d: false },
              { a: language === 'es' ? 'Ambiental' : 'Environment', i: language === 'es' ? 'Cálculo de GEI para todas las transacciones' : 'GHG calculation for all transactions', r: false, d: false },
            ].map((it, i) => <tr key={i} className="border-b hover:bg-surface-1" style={{ opacity: it.d ? 1 : 0.5 }}><td className="p-4 text-sm text-secondary">{it.a}</td><td className="p-4 text-sm">{it.i}</td><td className="p-4">{it.r ? <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>{language === 'es' ? 'Sí' : 'Yes'}</span> : <span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{language === 'es' ? 'No' : 'No'}</span>}</td><td className="p-4">{it.d ? <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{language === 'es' ? 'Listo' : 'Ready'}</span> : <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>{language === 'es' ? 'Pendiente' : 'Pending'}</span>}</td></tr>)}
          </tbody></table>
          </div>
        </div>
      )}

      {/* UOCs */}
      {activeTab === 'uocs' && (
        <div className="flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Unidades de Certificación (UoCs) y Definición de Alcance' : 'Certification Units (UoCs) & Scope Definition'}</h3>
              <p className="text-xs text-secondary mt-0.5">{language === 'es' ? 'Gestione las UoCs creadas y configure si aplica el 100% de la norma o alcance específico por unidad' : 'Manage created UoCs and configure full vs selective standard applicability per unit'}</p>
            </div>
            <button className="btn btn-primary" onClick={() => openUocForm()}>{language === 'es' ? '+ Nueva UoC' : '+ New UoC'}</button>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-surface-1 border-b">
                    <th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Nombre / UoC' : 'Name / UoC'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Tipo de Unidad' : 'Unit Type'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Empresa / País' : 'Company / Country'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Área (ha)' : 'Area (ha)'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Alcance RSPO 2024' : 'RSPO 2024 Scope'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Acciones' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {uocs.map(u => {
                    const typeLabels: Record<string, string> = {
                      MIXED: language === 'es' ? 'Plantación + Extractora' : 'Plantation & Mill',
                      PLANTATION: language === 'es' ? 'Solo Plantación / Finca' : 'Plantation Only',
                      MILL: language === 'es' ? 'Solo Planta Extractora' : 'Mill Only',
                      SMALLHOLDERS: language === 'es' ? 'Pequeños Productores' : 'Smallholders Group'
                    };
                    return (
                      <tr key={u.id} className="border-b hover:bg-surface-1">
                        <td className="p-4">
                          <div className="flex-col">
                            <span className="font-semibold text-primary">{u.name}</span>
                            <span className="text-xs text-secondary">{u.managerName || (language === 'es' ? 'Sin responsable' : 'No manager')}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
                            {typeLabels[u.type] || u.type}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-secondary">{u.companyName} ({u.country})</td>
                        <td className="p-4 text-sm font-mono">{u.area.toLocaleString()} ha</td>
                        <td className="p-4">
                          {u.appliesAll ? (
                            <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                              {language === 'es' ? '✓ Aplica 100% (M1-M7)' : '✓ Applies 100% (M1-M7)'}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>
                              {language === 'es' ? `⚙ Personalizado (${u.applicablePrinciples?.length || 0} de 7)` : `⚙ Customized (${u.applicablePrinciples?.length || 0} of 7)`}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <button className="btn btn-secondary btn-sm" onClick={() => openUocForm(u)}>
                            {language === 'es' ? '⚙ Configurar Alcance' : '⚙ Scope Config'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {uocs.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted">{language === 'es' ? 'Sin UoCs registradas' : 'No registered UoCs'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {showForm && (
        <div className="modal-overlay flex-center" onClick={() => setShowForm(false)}>
          <div className="modal card max-w-xl w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary">
                {formMode === 'UOC' 
                  ? (editingUoc ? `${language === 'es' ? 'Configurar Alcance —' : 'Configure Scope —'} ${editingUoc.name}` : (language === 'es' ? 'Nueva Unidad de Certificación' : 'New Certification Unit')) 
                  : (language === 'es' ? 'Nueva Transacción SCC' : 'New SCC Transaction')}
              </h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-col gap-4">
              {formMode === 'UOC' ? (<>
                <div className="form-group flex-col gap-1">
                  <label className="form-label font-semibold">{language === 'es' ? 'Nombre de la UoC' : 'UoC Name'}</label>
                  <input name="name" className="form-input" defaultValue={editingUoc?.name} required />
                </div>
                
                <div className="flex gap-2">
                  <div className="form-group flex-col gap-1 flex-1">
                    <label className="form-label font-semibold">{language === 'es' ? 'Empresa / Razón Social' : 'Company / Entity'}</label>
                    <input name="companyName" className="form-input" defaultValue={editingUoc?.companyName} required />
                  </div>
                  <div className="form-group flex-col gap-1 flex-1">
                    <label className="form-label font-semibold">{language === 'es' ? 'Tipo de Unidad' : 'Unit Type'}</label>
                    <select 
                      className="form-input" 
                      value={uocType} 
                      onChange={e => setUocType(e.target.value as UocType)}
                    >
                      <option value="MIXED">{language === 'es' ? 'Plantación y Extractora (Mixta)' : 'Plantation & Mill (Mixed)'}</option>
                      <option value="PLANTATION">{language === 'es' ? 'Solo Plantación / Finca' : 'Plantation Only'}</option>
                      <option value="MILL">{language === 'es' ? 'Solo Planta Extractora' : 'Mill Only'}</option>
                      <option value="SMALLHOLDERS">{language === 'es' ? 'Grupo de Pequeños Productores' : 'Smallholders Group'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="form-group flex-col gap-1 flex-1">
                    <label className="form-label font-semibold">{language === 'es' ? 'País' : 'Country'}</label>
                    <input name="country" className="form-input" defaultValue={editingUoc?.country || 'Colombia'} />
                  </div>
                  <div className="form-group flex-col gap-1 flex-1">
                    <label className="form-label font-semibold">{language === 'es' ? 'Área Certificada (ha)' : 'Certified Area (ha)'}</label>
                    <input name="area" className="form-input" type="number" step="0.01" defaultValue={editingUoc?.area} />
                  </div>
                </div>

                <div className="form-group flex-col gap-1">
                  <label className="form-label font-semibold">{language === 'es' ? 'Responsable de UoC' : 'UoC Manager'}</label>
                  <input name="managerName" className="form-input" defaultValue={editingUoc?.managerName} />
                </div>

                {/* ALCANCE DE CERTIFICACIÓN RSPO */}
                <div className="p-4 rounded-lg border flex-col gap-3 mt-2" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-primary">{language === 'es' ? '¿Aplica el 100% de la Certificación RSPO 2024?' : 'Does 100% RSPO 2024 apply?'}</h4>
                      <p className="text-xs text-secondary">{language === 'es' ? 'Si desmarca esta opción, podrá seleccionar cuáles Principios aplican a esta UoC específica y cuáles se marcan N/A' : 'If unchecked, you can select which Principles apply specifically to this UoC and which are N/A'}</p>
                    </div>
                    <input 
                      type="checkbox" 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      checked={uocAppliesAll} 
                      onChange={e => {
                        setUocAppliesAll(e.target.checked);
                        if (e.target.checked) {
                          setSelectedPrinciples(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']);
                        }
                      }}
                    />
                  </div>

                  {!uocAppliesAll && (
                    <div className="flex-col gap-2 mt-2 pt-3 border-t border-gray-200">
                      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Seleccione los Principios Aplicables a esta UoC:' : 'Select Applicable Principles for this UoC:'}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {ALL_PRINCIPLES.map(p => {
                          const isChecked = selectedPrinciples.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer text-xs" style={{ background: isChecked ? 'var(--surface-1)' : 'transparent', borderColor: isChecked ? 'var(--accent-blue)' : 'var(--border-color)' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => handleTogglePrinciple(p.id)} 
                              />
                              <span className="font-semibold text-primary">{p.label}</span>
                              {!isChecked && <span className="badge ml-auto text-[10px]" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>N/A (No Aplica)</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>) : (<>
                <div className="form-group flex-col gap-1"><label className="form-label font-semibold">UoC</label><select name="uocId" className="form-input" required><option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>{uocs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                <div className="flex gap-2"><div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Tipo' : 'Type'}</label><select name="type" className="form-input" required><option value="">{language === 'es' ? 'Tipo...' : 'Type...'}</option><option value="RECEPTION">{language === 'es' ? 'Recepción' : 'Reception'}</option><option value="PRODUCTION">{language === 'es' ? 'Producción' : 'Production'}</option><option value="SALE">{language === 'es' ? 'Venta' : 'Sale'}</option><option value="TRANSFER">{language === 'es' ? 'Transferencia' : 'Transfer'}</option></select></div><div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Producto' : 'Product'}</label><select name="productType" className="form-input" required><option value="">{language === 'es' ? 'Producto...' : 'Product...'}</option><option value="RFF">RFF</option><option value="CPO">CPO</option><option value="PK">PK</option><option value="PKO">PKO</option><option value="RBDPO">RBDPO</option></select></div></div>
                <div className="flex gap-2"><div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Modelo' : 'Model'}</label><select name="supplyModel" className="form-input" required><option value="">{language === 'es' ? 'Modelo...' : 'Model...'}</option><option value="IP">IP</option><option value="SG">SG</option><option value="MB">MB</option><option value="BC">BC</option></select></div><div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Volumen (TM)' : 'Volume (MT)'}</label><input name="volumeMt" className="form-input" type="number" step="0.001" required /></div></div>
                <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Lote' : 'Batch'}</label><input name="batchRef" className="form-input" /></div>
                <div className="flex gap-2"><div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Contraparte' : 'Counterparty'}</label><input name="counterparty" className="form-input" /></div><div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Doc. Ref.</label><input name="documentRef" className="form-input" /></div></div>
                <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Fecha' : 'Date'}</label><input name="transactionDate" className="form-input" type="date" /></div>
                <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Notas' : 'Notes'}</label><textarea name="notes" className="form-input" rows={2} /></div>
              </>)}
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{language === 'es' ? 'Cancelar' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary">{language === 'es' ? 'Guardar Configuración' : 'Save Settings'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
