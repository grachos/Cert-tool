import { useState } from 'react';

interface GhgInputs {
  landUseChange: number;
  peatOxidation: number;
  fertilizers: number;
  fuels: number;
  pomeMethane: number;
  sequestration: number;
  energyBiogas: number;
  cpoProduction: number;
  rffProcessed: number;
}

const defaults: GhgInputs = {
  landUseChange: 28500,
  peatOxidation: 0,
  fertilizers: 3850,
  fuels: 1290,
  pomeMethane: 9700,
  sequestration: 6400,
  energyBiogas: 1800,
  cpoProduction: 24380,
  rffProcessed: 118420,
};

const sources = [
  { key: 'landUseChange' as const, label: 'Cambio de uso del suelo', color: '#8B4513' },
  { key: 'peatOxidation' as const, label: 'Oxidación de turba', color: '#4A3728' },
  { key: 'fertilizers' as const, label: 'Fertilizantes', color: '#d97706' },
  { key: 'fuels' as const, label: 'Combustibles', color: '#dc2626' },
  { key: 'pomeMethane' as const, label: 'POME / Metano', color: '#7c3aed' },
];

const creditSources = [
  { key: 'sequestration' as const, label: 'Secuestro en cultivo y conservación', color: '#16a34a' },
  { key: 'energyBiogas' as const, label: 'Energía / Biogás', color: '#2563eb' },
];

export default function GhgCalculator() {
  const [inputs, setInputs] = useState<GhgInputs>(defaults);
  const [showPlan, setShowPlan] = useState(false);

  const grossEmissions = sources.reduce((s, src) => s + inputs[src.key], 0);
  const credits = creditSources.reduce((s, src) => s + inputs[src.key], 0);
  const netEmissions = grossEmissions - credits;
  const cpoIntensity = inputs.cpoProduction > 0 ? netEmissions / inputs.cpoProduction : 0;
  const rffIntensity = inputs.rffProcessed > 0 ? netEmissions / inputs.rffProcessed : 0;
  const maxVal = Math.max(...sources.map(s => inputs[s.key]), ...creditSources.map(s => inputs[s.key]));

  const update = (key: keyof GhgInputs, value: string) => {
    setInputs({ ...inputs, [key]: parseFloat(value) || 0 });
  };

  const Bar = ({ value, color, max, label }: { value: number; color: string; max: number; label: string }) => (
    <div className="flex items-center gap-2 mb-2 flex-wrap sm:flex-nowrap">
      <span className="text-xs text-secondary" style={{ width: '100px', flexShrink: 0, textAlign: 'left' }}>{label}</span>
      <div className="flex-1 bg-surface-2 h-4 rounded-full overflow-hidden" style={{ minWidth: '40px' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ width: '92px', flexShrink: 0, whiteSpace: 'nowrap' }}>{value.toLocaleString()} tCO₂e</span>
    </div>
  );

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Emisiones Brutas</div><div className="flex items-end justify-between mt-3 flex-wrap gap-2"><span className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{grossEmissions.toLocaleString()}</span><span className="text-sm text-muted">tCO₂e/año</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Créditos</div><div className="flex items-end justify-between mt-3 flex-wrap gap-2"><span className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>{credits.toLocaleString()}</span><span className="text-sm text-muted">tCO₂e/año</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Emisiones Netas</div><div className="flex items-end justify-between mt-3 flex-wrap gap-2"><span className="text-3xl font-bold text-primary">{netEmissions.toLocaleString()}</span><span className="text-sm text-muted">tCO₂e/año</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Intensidad CPO</div><div className="flex items-end justify-between mt-3 flex-wrap gap-2"><span className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>{cpoIntensity.toFixed(2)}</span><span className="text-sm text-muted">tCO₂e/t CPO</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Intensidad RFF</div><div className="flex items-end justify-between mt-3 flex-wrap gap-2"><span className="text-3xl font-bold text-secondary">{rffIntensity.toFixed(2)}</span><span className="text-sm text-muted">tCO₂e/t RFF</span></div></div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}>
        <div className="card">
          <h3 className="text-base font-bold text-primary mb-4">Fuentes de Emisión</h3>
          <div className="flex-col gap-3">
            {sources.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <label className="text-sm text-secondary" style={{ flex: 1, minWidth: 0 }}>{s.label}</label>
                <input type="number" className="form-input" style={{ width: '120px', textAlign: 'right', flexShrink: 0 }}
                  value={inputs[s.key]} onChange={e => update(s.key, e.target.value)} />
                <span className="text-xs text-muted">tCO₂e/año</span>
              </div>
            ))}
            <div className="border-t pt-3 mt-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between text-sm flex-wrap gap-2"><span className="font-bold">Total Emisiones Brutas</span><span className="font-bold" style={{ color: 'var(--accent-red)' }}>{grossEmissions.toLocaleString()} tCO₂e/año</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-bold text-primary mb-4">Créditos y Captura</h3>
          <div className="flex-col gap-3">
            {creditSources.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <label className="text-sm text-secondary" style={{ flex: 1, minWidth: 0 }}>{s.label}</label>
                <input type="number" className="form-input" style={{ width: '120px', textAlign: 'right', flexShrink: 0 }}
                  value={inputs[s.key]} onChange={e => update(s.key, e.target.value)} />
                <span className="text-xs text-muted">tCO₂e/año</span>
              </div>
            ))}
            <div className="border-t pt-3 mt-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between text-sm flex-wrap gap-2"><span className="font-bold">Total Créditos</span><span className="font-bold" style={{ color: 'var(--accent-green)' }}>{credits.toLocaleString()} tCO₂e/año</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-bold text-primary mb-4">Datos de Producción</h3>
          <div className="flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary" style={{ flex: 1, minWidth: 0 }}>Producción CPO</label>
              <input type="number" className="form-input" style={{ width: '120px', textAlign: 'right', flexShrink: 0 }}
                value={inputs.cpoProduction} onChange={e => update('cpoProduction', e.target.value)} />
              <span className="text-xs text-muted">t/año</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary" style={{ flex: 1, minWidth: 0 }}>RFF procesada</label>
              <input type="number" className="form-input" style={{ width: '120px', textAlign: 'right', flexShrink: 0 }}
                value={inputs.rffProcessed} onChange={e => update('rffProcessed', e.target.value)} />
              <span className="text-xs text-muted">t/año</span>
            </div>
            <div className="border-t pt-3 mt-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between text-sm mb-2 flex-wrap gap-2"><span>Intensidad CPO</span><span className="font-bold" style={{ color: 'var(--accent-blue)' }}>{cpoIntensity.toFixed(2)} tCO₂e/t CPO</span></div>
              <div className="flex justify-between text-sm flex-wrap gap-2"><span>Intensidad RFF</span><span className="font-bold text-secondary">{rffIntensity.toFixed(2)} tCO₂e/t RFF</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-primary mb-4">Contribución por Fuente</h3>
        <div className="flex-col">
          {[...sources, ...creditSources].map(s => (
            <Bar key={s.key} value={inputs[s.key]} color={s.color} max={maxVal || 1} label={s.label} />
          ))}
        </div>
      </div>

      <div>
        <button className="btn btn-primary" onClick={() => setShowPlan(!showPlan)}>
          {showPlan ? 'Ocultar Plan de Reducción' : 'Simular Plan de Reducción'}
        </button>
      </div>

      {showPlan && (
        <div className="card animate-slide-up">
          <h3 className="text-base font-bold text-primary mb-4">Plan de Reducción de Emisiones</h3>
          <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--accent-blue-light)', border: '1px dashed var(--accent-blue)' }}>
            <p className="text-sm text-secondary">
              Este es un prediagnóstico preliminar. No reemplaza RSPO PalmGHG ni constituye un reporte oficial.
              En producción deben validarse metodología, factores de emisión, límites organizacionales y correspondencia con la herramienta oficial vigente.
            </p>
          </div>
          <div className="flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap"><span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Meta 1</span><span className="text-sm">Reducir emisiones de POME/Metano en 30% mediante captura de biogás</span><span className="text-sm font-mono text-secondary ml-auto">-2,910 tCO₂e</span></div>
            <div className="flex items-center gap-2 flex-wrap"><span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Meta 2</span><span className="text-sm">Optimizar uso de fertilizantes nitrogenados (-15%)</span><span className="text-sm font-mono text-secondary ml-auto">-578 tCO₂e</span></div>
            <div className="flex items-center gap-2 flex-wrap"><span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Meta 3</span><span className="text-sm">Transición a combustibles de menor emisión en flota (-20%)</span><span className="text-sm font-mono text-secondary ml-auto">-258 tCO₂e</span></div>
            <div className="border-t pt-3 mt-2 flex justify-between flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
              <span className="font-bold text-sm">Reducción total proyectada</span>
              <span className="font-bold" style={{ color: 'var(--accent-green)' }}>-3,746 tCO₂e/año</span>
            </div>
            <div className="border-t pt-3 mt-2 flex justify-between flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
              <span className="font-bold text-sm">Nuevas emisiones netas estimadas</span>
              <span className="font-bold text-primary">{Math.round(netEmissions - 3746).toLocaleString()} tCO₂e/año</span>
            </div>
            <div className="flex justify-between text-sm flex-wrap gap-2">
              <span>Nueva intensidad CPO</span>
              <span className="font-medium" style={{ color: 'var(--accent-blue)' }}>{((netEmissions - 3746) / (inputs.cpoProduction || 1)).toFixed(2)} tCO₂e/t CPO</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
