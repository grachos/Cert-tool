const fields = ['Shipping Announcements', 'Confirmaciones', 'Removes o ajustes', 'Referencia interna', 'Producto', 'Modelo de cadena', 'Volumen', 'Fecha física', 'Fecha límite', 'Estado', 'Soporte documental'];

export default function Prisma() {
  return (
    <div className="flex-col gap-4 animate-fade-in">
      <section className="card prisma-hero"><div><span className="eyebrow">CONTROL INTERNO</span><h2 className="text-2xl font-bold mt-2">PRISMA by RSPO</h2><p className="mt-2">Seguimiento previo y conciliación de operaciones reportables.</p></div><span className="badge badge-pending">Integración pendiente</span></section>
      <div className="integration-note"><strong>Importante:</strong> RSPO TECH apoya el control interno. PRISMA continúa siendo la plataforma oficial de RSPO y cualquier operación oficial debe registrarse y confirmarse allí.</div>
      <section className="card"><div className="flex-between mb-4"><div><h3 className="text-lg font-bold">Estructura preparada</h3><p className="text-secondary text-sm mt-1">No se muestran transacciones simuladas.</p></div></div><div className="prepared-grid">{fields.map(field => <div className="prepared-field" key={field}><span>✓</span>{field}</div>)}</div></section>
      <section className="card"><h3 className="text-lg font-bold">Conexión necesaria</h3><p className="text-secondary mt-2">Se requiere una tabla de operaciones PRISMA, endpoints autenticados, adjuntos documentales, auditoría de cambios y un mecanismo de conciliación con exportaciones o API autorizada por RSPO.</p></section>
    </div>
  );
}
