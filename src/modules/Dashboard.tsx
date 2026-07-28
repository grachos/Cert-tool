import { useEffect, useMemo, useState } from 'react';
import { useUoc } from '../components/UoCContext';
import api from '../api';

interface DashboardProps {
  onNavigate: (module: 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'users' | 'scc' | 'stakeholders' | 'alerts' | 'plant' | 'ghg' | 'supply' | 'plantations' | 'audits' | 'traceability' | 'prisma' | 'actionPlans' | 'findings') => void;
}

interface Stats {
  overallCompliance: number;
  pendingReviews: number;
  activeRisks: number;
  criticalRisks: number;
  overdueActions: number;
  openFindings: number;
  closedFindings: number;
  averagePlansProgress: number;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user: string;
  standard: string | null;
}

interface StandardCompliance {
  standardId: string;
  totalRequirements: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  pending: number;
  overallScore: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value || 0)));

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { selectedUoc, selectedUocId, uocs } = useUoc();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [complianceStatuses, setComplianceStatuses] = useState<StandardCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [statsRes, activitiesRes, complianceRes] = await Promise.all([
          api.get('/dashboard/stats', { params: { uocId: selectedUocId } }),
          api.get('/dashboard/activities', { params: { uocId: selectedUocId } }),
          api.get('/compliance/standards')
        ]);
        setStats(statsRes.data);
        setActivities(activitiesRes.data);
        setComplianceStatuses(complianceRes.data);
      } catch (error) {
        console.error('Error al cargar datos del dashboard', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedUocId]);

  const rspo = useMemo(
    () => complianceStatuses.find((status) => status.standardId.toUpperCase().includes('RSPO')),
    [complianceStatuses]
  );
  const score = clamp(
    (stats?.overallCompliance ?? 0) > 0
      ? stats?.overallCompliance ?? 0
      : rspo?.overallScore ?? 0
  );
  const compliant = rspo?.compliant ?? 0;
  const partial = rspo?.partial ?? 0;
  const nonCompliant = rspo?.nonCompliant ?? 0;
  const totalRequirements = rspo?.totalRequirements ?? 0;
  const scopeName = selectedUocId === 'all'
    ? `${uocs.length} unidades de certificación`
    : selectedUoc?.name || 'Unidad de certificación';
  const priorityActivities = activities.slice(0, 3);

  if (isLoading) {
    return <div className="nexo-loading">Preparando su resumen…</div>;
  }

  return (
    <div className="nexo-dashboard animate-fade-in">
      <section className="nexo-cover" aria-label="Portada RSPO TECH">
        <img src="/palm_plantation_hero.jpg" alt="Plantación sostenible de palma" />
        <div className="nexo-cover-badge">
          <span>RSPO TECH · GESTIÓN INTELIGENTE RSPO</span>
          <strong>La sostenibilidad se gestiona mejor cuando toda la operación está conectada.</strong>
        </div>
      </section>

      <header className="nexo-welcome">
        <div>
          <p className="nexo-eyebrow">RESUMEN EJECUTIVO · {scopeName.toUpperCase()}</p>
          <h1>Hola, Viviana.</h1>
          <p>Este es el estado actual de su operación y las prioridades que requieren atención.</p>
        </div>
        <div className="nexo-harvest" aria-hidden="true">
          <span>GESTIÓN SOSTENIBLE<br /><strong>PALMA DE ACEITE</strong></span>
          <div className="nexo-fruit">●<i>●</i><b>●</b></div>
        </div>
      </header>

      <section className="nexo-hero-grid">
        <article className="nexo-cert-card">
          <div className="nexo-card-top">
            <span className="nexo-pill">CERTIFICACIÓN ACTIVA</span>
            <button onClick={() => onNavigate('compliance')}>Ver cumplimiento →</button>
          </div>
          <div className="nexo-cert-body">
            <div className="nexo-ring" style={{ '--score': `${score}%` } as React.CSSProperties}>
              <div><strong>{score}%</strong><small>cumplimiento</small></div>
            </div>
            <div className="nexo-cert-copy">
              <p className="nexo-eyebrow">ESTÁNDAR RSPO P&C 2024</p>
              <h2>Avance de certificación</h2>
              <p>Evaluación consolidada con la información registrada para {scopeName}.</p>
              <div className="nexo-cert-meta">
                <span><i className="nexo-dot green" />{compliant}<small>Cumplen</small></span>
                <span><i className="nexo-dot amber" />{partial}<small>Parciales</small></span>
                <span><i className="nexo-dot red" />{nonCompliant}<small>No cumplen</small></span>
              </div>
              <div className="nexo-progress"><i style={{ width: `${score}%` }} /></div>
              {totalRequirements > 0 && <small className="nexo-progress-note">{totalRequirements} requisitos evaluados</small>}
            </div>
          </div>
        </article>

        <article className="nexo-audit-card">
          <div className="nexo-audit-photo">
            <span className="nexo-pill light">PRÓXIMA AUDITORÍA</span>
            <div>
              <h3>Auditoría por programar</h3>
              <p>Prepare el alcance y el equipo auditor.</p>
            </div>
          </div>
          <div className="nexo-audit-info">
            <div className="nexo-calendar"><span>RSPO</span><b>✓</b></div>
            <div><strong>Agenda de auditorías</strong><small>Consulte y programe la próxima revisión</small></div>
            <button onClick={() => onNavigate('audits')} aria-label="Abrir auditorías">→</button>
          </div>
        </article>
      </section>

      <section className="nexo-metrics" aria-label="Indicadores principales">
        <div><span className="nexo-metric-icon">◉</span><p>UNIDADES<small>Alcance actual</small></p><strong>{uocs.length}</strong></div>
        <div><span className="nexo-metric-icon gold">▤</span><p>EVIDENCIAS<small>Pendientes de revisión</small></p><strong>{stats?.pendingReviews ?? 0}</strong></div>
        <div><span className="nexo-metric-icon blue">✓</span><p>HALLAZGOS<small>Abiertos</small></p><strong>{stats?.openFindings ?? 0}</strong></div>
        <div><span className="nexo-metric-icon redish">!</span><p>ACCIONES<small>Vencidas</small></p><strong className={(stats?.overdueActions ?? 0) > 0 ? 'warn' : ''}>{stats?.overdueActions ?? 0}</strong></div>
      </section>

      <section className="nexo-lower-grid">
        <article className="nexo-panel">
          <div className="nexo-panel-head">
            <div><p className="nexo-eyebrow">SEGUIMIENTO</p><h3>Acciones prioritarias</h3></div>
            <button onClick={() => onNavigate('alerts')}>Ver todas →</button>
          </div>
          {priorityActivities.length > 0 ? priorityActivities.map((activity, index) => (
            <div className="nexo-action-row" key={activity.id}>
              <i className={index === 0 ? 'red' : 'amber'} />
              <div>
                <small>{activity.standard || 'RSPO'}</small>
                <strong>{activity.action}</strong>
                <span>{activity.description} · {activity.timestamp}</span>
              </div>
              <button onClick={() => onNavigate('alerts')} aria-label="Ver acción">→</button>
            </div>
          )) : (
            <div className="nexo-empty">No hay actividades pendientes registradas.</div>
          )}
        </article>

        <article className="nexo-panel">
          <div className="nexo-panel-head">
            <div><p className="nexo-eyebrow">DESEMPEÑO</p><h3>Avance por área</h3></div>
            <button onClick={() => onNavigate('compliance')}>Detalle →</button>
          </div>
          <ProgressRow label="Cumplimiento RSPO" value={score} />
          <ProgressRow label="Planes de acción" value={clamp(stats?.averagePlansProgress ?? 0)} />
          <ProgressRow
            label="Cierre de hallazgos"
            value={clamp(((stats?.closedFindings ?? 0) / Math.max(1, (stats?.openFindings ?? 0) + (stats?.closedFindings ?? 0))) * 100)}
          />
          <div className="nexo-tip">
            <span>✦</span>
            <p><strong>Recomendación</strong>Priorice las acciones vencidas y los hallazgos abiertos antes de programar la auditoría.</p>
            <button onClick={() => onNavigate('actionPlans')}>Revisar</button>
          </div>
        </article>
      </section>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="nexo-bar">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="nexo-progress"><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}
