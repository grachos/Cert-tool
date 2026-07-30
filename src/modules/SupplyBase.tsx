import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';

interface SupplySource {
  id: string;
  name: string;
  identifier: string;
  personType?: 'NATURAL' | 'JURIDICAL';
  identifierType?: 'CC' | 'NIT';
  relationshipType?: 'PARTNER' | 'THIRD_PARTY' | 'SMALLHOLDER' | 'OWN';
  sourceType?: string;
  legalRepresentativeName?: string;
  legalRepresentativeId?: string;
  address?: string;
  phone?: string;
  email?: string;
  dataConsentAccepted?: boolean;
  dataConsentHolderName?: string;
  plantationCount?: number;
  plantationArea?: number;
  riskLevel: string;
  eligibilityStatus: string;
  certificationStatus: string;
  status?: string;
  notes?: string;
}

const emptyForm = {
  personType: 'NATURAL',
  relationshipType: 'THIRD_PARTY',
  name: '',
  identifier: '',
  legalRepresentativeName: '',
  legalRepresentativeId: '',
  address: '',
  phone: '',
  email: '',
  riskLevel: 'MEDIUM',
  eligibilityStatus: 'PENDING',
  certificationStatus: 'PENDING',
  notes: '',
  dataConsentAccepted: false,
  dataConsentHolderName: ''
};

const relationshipLabels: Record<string, string> = {
  PARTNER: 'Productor socio',
  THIRD_PARTY: 'Productor tercero',
  SMALLHOLDER: 'Pequeño productor',
  OWN: 'Plantación propia'
};

const legacyRelationship = (sourceType?: string) => ({
  OWN: 'OWN',
  ASSOCIATED: 'PARTNER',
  INDEPENDENT: 'THIRD_PARTY',
  ASSOCIATION: 'PARTNER',
  SMALLHOLDER_GROUP: 'SMALLHOLDER',
  INDIVIDUAL: 'SMALLHOLDER'
}[sourceType || ''] || 'THIRD_PARTY');

export default function SupplyBase() {
  const { selectedUocId } = useUoc();
  const { user } = useAuth();
  const [rows, setRows] = useState<SupplySource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isJuridical = form.personType === 'JURIDICAL';

  const load = () => {
    if (!selectedUocId || selectedUocId === 'all') { setRows([]); return; }
    setLoading(true);
    api.get('/rspo/supply-sources', { params: { uocId: selectedUocId } })
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(e => { setRows([]); setError(e.response?.data?.error || 'No fue posible cargar los productores.'); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [selectedUocId]);

  const safeRows = Array.isArray(rows) ? rows : [];

  const stats = useMemo(() => ({
    plantations: safeRows.reduce((sum, row) => sum + Number(row.plantationCount || 0), 0),
    area: safeRows.reduce((sum, row) => sum + Number(row.plantationArea || 0), 0),
    eligible: safeRows.filter(row => row.eligibilityStatus === 'ELIGIBLE').length
  }), [safeRows]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setShowForm(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const body = {
        ...form,
        uocId: selectedUocId,
        identifierType: isJuridical ? 'NIT' : 'CC',
        totalArea: 0,
        plantedArea: 0,
        certifiedArea: 0
      };
      if (editingId) await api.put(`/rspo/supply-sources/${editingId}`, body);
      else await api.post('/rspo/supply-sources', body);
      resetForm();
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'No fue posible guardar el productor.');
    }
  };

  const edit = (row: SupplySource) => {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      personType: row.personType || (row.legalRepresentativeName ? 'JURIDICAL' : 'NATURAL'),
      relationshipType: row.relationshipType || legacyRelationship(row.sourceType),
      name: row.name || '',
      identifier: row.identifier || '',
      legalRepresentativeName: row.legalRepresentativeName || '',
      legalRepresentativeId: row.legalRepresentativeId || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      riskLevel: row.riskLevel || 'MEDIUM',
      eligibilityStatus: row.eligibilityStatus || 'PENDING',
      certificationStatus: row.certificationStatus || 'PENDING',
      notes: row.notes || '',
      dataConsentAccepted: Boolean(row.dataConsentAccepted),
      dataConsentHolderName: row.dataConsentHolderName || row.legalRepresentativeName || row.name || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const archive = async (row: SupplySource) => {
    try {
      await api.put(`/rspo/supply-sources/${row.id}`, { status: row.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' });
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'No fue posible cambiar el estado.');
    }
  };

  if (!selectedUocId || selectedUocId === 'all') {
    return <div className="empty-state card"><h3>Seleccione una UoC</h3><p>Los productores siempre se consultan dentro de una unidad autorizada.</p></div>;
  }

  return <div className="flex-col gap-5 animate-fade-in">
    <div className="stats-grid">
      <div className="card"><small>Productores registrados</small><div className="stat-value-lg">{safeRows.length}</div></div>
      <div className="card"><small>Plantaciones vinculadas</small><div className="stat-value-lg">{stats.plantations}</div></div>
      <div className="card"><small>Área de plantaciones</small><div className="stat-value-lg">{stats.area.toLocaleString('es-CO')} ha</div></div>
      <div className="card"><small>Productores elegibles</small><div className="stat-value-lg">{stats.eligible}</div></div>
    </div>

    <div className="flex-between gap-4 flex-wrap">
      <div>
        <h2 className="text-xl font-bold">Productores y razones sociales</h2>
        <p className="text-secondary text-sm">Socios, terceros, pequeños productores y plantaciones propias del núcleo palmero.</p>
      </div>
      {canEdit && <button className="btn btn-primary" onClick={() => showForm ? resetForm() : setShowForm(true)}>
        {showForm ? 'Cancelar' : '+ Nuevo productor'}
      </button>}
    </div>

    {error && <div className="integration-note">{error}</div>}

    {showForm && <form className="card flex-col gap-5" onSubmit={submit}>
      <div>
        <span className="text-xs font-bold uppercase text-secondary">Ficha general</span>
        <h3>{editingId ? 'Editar productor o razón social' : 'Nuevo productor o razón social'}</h3>
      </div>

      <section className="form-grid">
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Tipo de persona</label>
          <select className="form-select" value={form.personType} onChange={e => setForm({
            ...form,
            personType: e.target.value,
            legalRepresentativeName: e.target.value === 'NATURAL' ? '' : form.legalRepresentativeName,
            legalRepresentativeId: e.target.value === 'NATURAL' ? '' : form.legalRepresentativeId
          })}>
            <option value="NATURAL">Persona natural</option>
            <option value="JURIDICAL">Persona jurídica</option>
          </select>
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Vínculo con la extractora</label>
          <select className="form-select" value={form.relationshipType} onChange={e => setForm({ ...form, relationshipType: e.target.value })}>
            {Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">{isJuridical ? 'Razón social' : 'Nombre completo del productor'}</label>
          <input required className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">{isJuridical ? 'NIT' : 'Cédula'}</label>
          <input required className="form-input" value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} />
        </div>
        {isJuridical && <>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Representante legal</label>
            <input required className="form-input" value={form.legalRepresentativeName} onChange={e => setForm({ ...form, legalRepresentativeName: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Cédula del representante legal</label>
            <input required className="form-input" value={form.legalRepresentativeId} onChange={e => setForm({ ...form, legalRepresentativeId: e.target.value })} />
          </div>
        </>}
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Dirección</label>
          <input required className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Teléfono</label>
          <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Correo electrónico</label>
          <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Elegibilidad</label>
          <select className="form-select" value={form.eligibilityStatus} onChange={e => setForm({ ...form, eligibilityStatus: e.target.value })}>
            <option value="PENDING">Pendiente</option><option value="ELIGIBLE">Elegible</option>
            <option value="CONDITIONAL">Condicionada</option><option value="INELIGIBLE">No elegible</option>
          </select>
        </div>
        <div className="form-group flex-col gap-1">
          <label className="form-label font-semibold">Nivel de riesgo</label>
          <select className="form-select" value={form.riskLevel} onChange={e => setForm({ ...form, riskLevel: e.target.value })}>
            <option value="LOW">Bajo</option><option value="MEDIUM">Medio</option>
            <option value="HIGH">Alto</option><option value="CRITICAL">Crítico</option>
          </select>
        </div>
        <div className="form-group flex-col gap-1" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label font-semibold">Observaciones</label>
          <textarea rows={3} className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </section>

      <section className="privacy-consent">
        <h4>Autorización para el tratamiento de datos personales</h4>
        <p>
          Autorizo de manera previa, expresa e informada la recolección, almacenamiento, uso,
          actualización y consulta de los datos consignados en esta ficha para la gestión agrícola,
          trazabilidad y cumplimiento RSPO. Declaro conocer los derechos de consultar, actualizar,
          rectificar, solicitar prueba de la autorización, revocar la autorización y solicitar la
          supresión de los datos cuando legalmente proceda, conforme a la Ley 1581 de 2012 y sus
          normas reglamentarias. El tratamiento estará sujeto a la política de protección de datos de la UoC.
        </p>
        <div className="form-grid mt-3">
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Nombre de quien autoriza</label>
            <input required className="form-input" value={form.dataConsentHolderName} onChange={e => setForm({ ...form, dataConsentHolderName: e.target.value })} />
          </div>
          <label className="consent-check">
            <input required type="checkbox" checked={form.dataConsentAccepted} onChange={e => setForm({ ...form, dataConsentAccepted: e.target.checked })} />
            <span>Acepto y autorizo el tratamiento de los datos personales.</span>
          </label>
        </div>
      </section>

      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-primary" type="submit">{editingId ? 'Guardar cambios' : 'Guardar productor'}</button>
        <button className="btn btn-secondary" type="button" onClick={resetForm}>Cancelar</button>
      </div>
    </form>}

    {loading ? <div className="card">Cargando…</div> : safeRows.length === 0 ?
      <div className="empty-state card">
        <h3>No hay productores registrados</h3>
        <p>Cree la primera ficha general antes de relacionar sus plantaciones.</p>
        {canEdit && <button className="btn btn-primary" onClick={() => setShowForm(true)}>Crear primer productor</button>}
      </div> :
      <section className="nexo-plant-grid">
        {safeRows.map(row => <article className="nexo-plant-unit" key={row.id}>
          <div>
            <span className="nexo-palm-avatar">{row.personType === 'JURIDICAL' ? '▦' : '♙'}</span>
            <em className="nexo-risk low">{row.status === 'ARCHIVED' ? 'Archivado' : 'Activo'}</em>
          </div>
          <h3>{row.name}</h3>
          <p><strong>{row.personType === 'JURIDICAL' ? 'NIT' : 'CC'}:</strong> {row.identifier}</p>
          <small>{relationshipLabels[row.relationshipType || legacyRelationship(row.sourceType)]}</small>
          {row.personType === 'JURIDICAL' && <small className="block mt-1">Representante: {row.legalRepresentativeName || 'Pendiente'}</small>}
          <div className="nexo-plant-score">
            <strong>{Number(row.plantationCount || 0)}</strong>
            <span>plantaciones · {Number(row.plantationArea || 0).toLocaleString('es-CO')} ha</span>
          </div>
          {canEdit && <div className="nexo-plant-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => edit(row)}>✎ Editar ficha</button>
            <button className="btn btn-secondary btn-sm" onClick={() => archive(row)}>{row.status === 'ARCHIVED' ? 'Activar' : 'Archivar'}</button>
          </div>}
        </article>)}
      </section>}
  </div>;
}
