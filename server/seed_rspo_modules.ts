import { v4 as uuidv4 } from 'uuid';
import db from './src/db';

const uocs = [
  { name: 'Extractora PalmCol S.A.S.', companyName: 'PalmCol Group', country: 'Colombia', area: 4500.75, managerName: 'Carlos Mendez', managerEmail: 'cmendez@palmcol.com.co' },
  { name: 'Plantación Hacienda La Palma', companyName: 'PalmCol Group', country: 'Colombia', area: 2300.50, managerName: 'Maria Rojas', managerEmail: 'mrojas@palmcol.com.co' },
  { name: 'Finca El Paraíso', companyName: 'AgroPalma S.A.', country: 'Colombia', area: 1200.00, managerName: 'Juan Torres', managerEmail: 'jtorres@agropalma.com' },
];

const sccTransactions = [
  { type: 'RECEPTION', productType: 'RFF', supplyModel: 'MB', volumeMt: 1250.500, batchRef: 'LOTE-2026-001', counterparty: 'AgroPalma S.A.', documentRef: 'REM-001' },
  { type: 'RECEPTION', productType: 'RFF', supplyModel: 'SG', volumeMt: 850.300, batchRef: 'LOTE-2026-002', counterparty: 'Finca El Paraiso', documentRef: 'REM-002' },
  { type: 'RECEPTION', productType: 'RFF', supplyModel: 'IP', volumeMt: 320.100, batchRef: 'LOTE-2026-003', counterparty: 'Hacienda La Palma', documentRef: 'REM-003' },
  { type: 'PRODUCTION', productType: 'CPO', supplyModel: 'MB', volumeMt: 262.500, batchRef: 'PROD-001', counterparty: 'Planta Extractora', documentRef: 'PROD-001' },
  { type: 'PRODUCTION', productType: 'PK', supplyModel: 'MB', volumeMt: 62.500, batchRef: 'PROD-002', counterparty: 'Planta Extractora', documentRef: 'PROD-002' },
  { type: 'PRODUCTION', productType: 'CPO', supplyModel: 'SG', volumeMt: 178.500, batchRef: 'PROD-003', counterparty: 'Planta Extractora', documentRef: 'PROD-003' },
  { type: 'PRODUCTION', productType: 'CPO', supplyModel: 'IP', volumeMt: 67.200, batchRef: 'PROD-004', counterparty: 'Planta Extractora', documentRef: 'PROD-004' },
  { type: 'SALE', productType: 'CPO', supplyModel: 'MB', volumeMt: 200.000, batchRef: 'VENTA-001', counterparty: 'Oleoflores S.A.', documentRef: 'FACT-001' },
  { type: 'SALE', productType: 'CPO', supplyModel: 'SG', volumeMt: 150.000, batchRef: 'VENTA-002', counterparty: 'C.I. Biocosta', documentRef: 'FACT-002' },
  { type: 'SALE', productType: 'CPO', supplyModel: 'IP', volumeMt: 50.000, batchRef: 'VENTA-003', counterparty: 'Naturaceites S.A.', documentRef: 'FACT-003' },
  { type: 'SALE', productType: 'PK', supplyModel: 'MB', volumeMt: 45.000, batchRef: 'VENTA-004', counterparty: 'Aceites S.A.', documentRef: 'FACT-004' },
  { type: 'RECEPTION', productType: 'RFF', supplyModel: 'BC', volumeMt: 500.000, batchRef: 'LOTE-2026-004', counterparty: 'Pequenos Productores', documentRef: 'REM-004' },
  { type: 'PRODUCTION', productType: 'CPO', supplyModel: 'BC', volumeMt: 100.000, batchRef: 'PROD-005', counterparty: 'Planta Extractora', documentRef: 'PROD-005' },
  { type: 'SALE', productType: 'CPO', supplyModel: 'BC', volumeMt: 80.000, batchRef: 'VENTA-005', counterparty: 'Distribuidora Palm', documentRef: 'FACT-005' },
];

const stakeholders = [
  { name: 'Junta de Acción Comunal Vereda El Palmar', type: 'COMMUNITY', location: 'Vereda El Palmar, Magdalena', interest: 'Empleo local, protección de fuentes hídricas, inversión social', influence: 'HIGH', engagementChannel: 'Reuniones trimestrales', lastEngagement: '2026-06-15', responsibleName: 'Ana Martinez', responsibleEmail: 'amartinez@palmcol.com.co' },
  { name: 'Corporación Autónoma Regional', type: 'GOVERNMENT', location: 'Santa Marta, Magdalena', interest: 'Cumplimiento ambiental, licencias, monitoreo de efluentes', influence: 'HIGH', engagementChannel: 'Informes semestrales', lastEngagement: '2026-05-20', responsibleName: 'Luis Garcia', responsibleEmail: 'lgarcia@palmcol.com.co' },
  { name: 'Sindicato Nacional de Trabajadores Agroindustriales', type: 'WORKER', location: 'Zona Bananera, Magdalena', interest: 'Condiciones laborales, salario digno, negociación colectiva', influence: 'HIGH', engagementChannel: 'Mesas de diálogo bimestrales', lastEngagement: '2026-07-01', responsibleName: 'Diana Lopez', responsibleEmail: 'dlopez@palmcol.com.co' },
  { name: 'Fundación ProPalma Sostenible', type: 'NGO', location: 'Bogotá D.C.', interest: 'Sostenibilidad, conservación AVC, pequeños productores', influence: 'MEDIUM', engagementChannel: 'Correo electrónico y videollamadas', lastEngagement: '2026-04-10', responsibleName: 'Ana Martinez', responsibleEmail: 'amartinez@palmcol.com.co' },
  { name: 'C.I. Biocosta S.A.S.', type: 'BUYER', location: 'Barranquilla, Atlántico', interest: 'Calidad CPO, certificación RSPO SG, precios competitivos', influence: 'MEDIUM', engagementChannel: 'Reuniones comerciales trimestrales', lastEngagement: '2026-06-28', responsibleName: 'Pedro Ramirez', responsibleEmail: 'pramirez@palmcol.com.co' },
  { name: 'AgroPalma S.A.', type: 'SUPPLIER', location: 'Aracataca, Magdalena', interest: 'Acuerdos de compra RFF, precios justos, asistencia técnica', influence: 'MEDIUM', engagementChannel: 'Contratos y visitas de campo', lastEngagement: '2026-07-10', responsibleName: 'Pedro Ramirez', responsibleEmail: 'pramirez@palmcol.com.co' },
  { name: 'Universidad del Magdalena', type: 'ACADEMIC', location: 'Santa Marta, Magdalena', interest: 'Investigación en palma sostenible, prácticas estudiantiles', influence: 'LOW', engagementChannel: 'Convenios de cooperación', lastEngagement: '2026-03-15', responsibleName: 'Luis Garcia', responsibleEmail: 'lgarcia@palmcol.com.co' },
  { name: 'Ministerio de Agricultura y Desarrollo Rural', type: 'GOVERNMENT', location: 'Bogotá D.C.', interest: 'Políticas sectoriales, estadísticas de producción, formalización', influence: 'MEDIUM', engagementChannel: 'Reportes anuales y comunicaciones oficiales', lastEngagement: '2026-02-20', responsibleName: 'Carlos Mendez', responsibleEmail: 'cmendez@palmcol.com.co' },
].map((s, i) => ({
  ...s,
  lastEngagement: new Date(s.lastEngagement).toISOString().split('T')[0],
  nextEngagement: i < 5 ? new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
}));

async function seed() {
  // Seed Certification Units
  const [existingUocs] = await db.query('SELECT COUNT(*) as cnt FROM CertificationUnit');
  if ((existingUocs as any[])[0].cnt === 0) {
    for (const u of uocs) {
      const id = uuidv4();
      await db.query(
        'INSERT INTO CertificationUnit (id, name, companyName, country, area, managerName, managerEmail) VALUES (?,?,?,?,?,?,?)',
        [id, u.name, u.companyName, u.country, u.area, u.managerName, u.managerEmail]
      );
    }
    console.log(`✅ ${uocs.length} UoCs seeded`);
  } else {
    console.log('ℹ️ UoCs already exist');
  }

  // Get UoC IDs
  const [uocRows]: any = await db.query('SELECT id, name FROM CertificationUnit');
  const uocMap: Record<string, string> = {};
  (uocRows as any[]).forEach((u: any) => { uocMap[u.name] = u.id; });

  // Seed SCC Transactions
  const [existingTxs] = await db.query('SELECT COUNT(*) as cnt FROM SccTransaction');
  if ((existingTxs as any[])[0].cnt === 0 && Object.keys(uocMap).length > 0) {
    const dates = ['2026-07-01', '2026-07-05', '2026-07-08', '2026-07-10', '2026-07-12', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-01', '2026-07-05', '2026-07-12'];
    for (let i = 0; i < sccTransactions.length; i++) {
      const tx = sccTransactions[i];
      const uocName = i < 11 ? 'Extractora PalmCol S.A.S.' : i < 13 ? 'Plantación Hacienda La Palma' : 'Finca El Paraíso';
      const uocId = uocMap[uocName];
      if (!uocId) continue;
      const id = uuidv4();
      await db.query(
        'INSERT INTO SccTransaction (id, uocId, type, productType, supplyModel, volumeMt, batchRef, counterparty, documentRef, greenhouseGas, transactionDate) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, uocId, tx.type, tx.productType, tx.supplyModel, tx.volumeMt, tx.batchRef, tx.counterparty, tx.documentRef, tx.productType === 'RFF' ? 0 : tx.volumeMt * 1.5, new Date(dates[i])]
      );
    }
    console.log(`✅ ${sccTransactions.length} SCC transactions seeded`);
  } else {
    console.log('ℹ️ SCC transactions already exist or no UoCs found');
  }

  // Seed Stakeholders
  const [existingSt] = await db.query('SELECT COUNT(*) as cnt FROM Stakeholder');
  if ((existingSt as any[])[0].cnt === 0) {
    for (const s of stakeholders) {
      const id = uuidv4();
      await db.query(
        'INSERT INTO Stakeholder (id, name, type, location, interest, influence, engagementChannel, lastEngagement, nextEngagement, responsibleName, responsibleEmail) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, s.name, s.type, s.location, s.interest, s.influence, s.engagementChannel, s.lastEngagement, s.nextEngagement, s.responsibleName, s.responsibleEmail]
      );
    }
    console.log(`✅ ${stakeholders.length} stakeholders seeded`);
  } else {
    console.log('ℹ️ Stakeholders already exist');
  }
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.end(); });
