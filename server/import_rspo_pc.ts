import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import db from './src/db';

const OFFICIAL_SOURCE = 'https://rspo.org/wp-content/uploads/ENG-2024-RSPO-Principles-and-Criteria-%E2%80%93-Version-4.2.pdf';

type ParsedIndicator = {
  clause: string;
  principleCode: string;
  criterionCode: string;
  officialText: string;
  isCritical: boolean;
  sortOrder: number;
};

const processMap: Record<string, string[]> = {
  P1: ['Gerencia','Gestión documental','Auditoría interna'],
  P2: ['Gerencia','Base de suministro','Compras','Contratistas'],
  P3: ['Planta extractora','Producción','Mantenimiento','Laboratorio','Cadena de suministro'],
  P4: ['Comunidades','Derechos humanos','Gestión social'],
  P5: ['Base de suministro','Productores externos','Plantaciones'],
  P6: ['Gestión humana','Seguridad y salud en el trabajo','Contratistas'],
  P7: ['Gestión ambiental','Plantaciones','Planta extractora']
};

const evidenceMap: Record<string, string[]> = {
  P1: ['Política o procedimiento aprobado','Registro de divulgación','Acta o registro de seguimiento'],
  P2: ['Matriz legal','Contrato o acuerdo','Registro de verificación de proveedor'],
  P3: ['Procedimiento operativo','Registro de control','Informe de auditoría interna'],
  P4: ['Acta de consulta','Mapa o soporte de tenencia','Registro de quejas'],
  P5: ['Contrato de suministro','Registro de capacitación','Evaluación de productor'],
  P6: ['Política laboral','Registro de trabajadores','Inspección o capacitación SST'],
  P7: ['Plan de manejo','Mapa o estudio técnico','Registro de monitoreo ambiental']
};

function cleanIndicatorText(block: string) {
  const criterionStart = block.search(/\n[1-7]\.\d+\s+[A-Z]/);
  const scoped = criterionStart >= 0 ? block.slice(0, criterionStart) : block;
  return scoped
    .replace(/\f/g, '\n')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line =>
      line &&
      !/^\d+$/.test(line) &&
      !/^-- \d+ of \d+ --$/.test(line) &&
      line !== 'Adopted 13 Nov 2024' &&
      !/^Principle \d /.test(line) &&
      !/^Criteria\s+Indicator$/.test(line)
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseRspoIndicators(text: string): ParsedIndicator[] {
  const isControlledVersion =
    /Document Title\s+2024 Principles & Criteria/i.test(text) &&
    /Document Code\s+RSPO-STD-T01-001/i.test(text) &&
    /Version\s+4\.2/i.test(text);
  if (!isControlledVersion) {
    throw new Error('El archivo no corresponde al estándar oficial RSPO P&C 2024 v4.2.');
  }
  const start = text.search(/Principle 1[^\n]*\nImpact Goals/);
  const end = text.indexOf('\nV. Annexes', start);
  if (start < 0 || end < 0) throw new Error('No fue posible ubicar la matriz oficial dentro del PDF.');
  const section = text.slice(start, end);
  const expression = /^([1-7]\.\d+\.\d+)\s*(\(C\))?\s+[\t ]*/gm;
  const matches = [...section.matchAll(expression)];
  const seen = new Set<string>();
  const indicators: ParsedIndicator[] = [];
  matches.forEach((match, index) => {
    const clause = match[1];
    if (seen.has(clause)) return;
    seen.add(clause);
    const next = matches[index + 1]?.index ?? section.length;
    const officialText = cleanIndicatorText(section.slice((match.index || 0) + match[0].length, next));
    if (!officialText) throw new Error(`El indicador ${clause} no tiene texto extraíble.`);
    const [principle, criterion, indicator] = clause.split('.').map(Number);
    indicators.push({
      clause,
      principleCode: `P${principle}`,
      criterionCode: `${principle}.${criterion}`,
      officialText,
      isCritical: Boolean(match[2]),
      sortOrder: principle * 10000 + criterion * 100 + indicator
    });
  });
  if (indicators.length !== 162) {
    throw new Error(`Se esperaban 162 indicadores oficiales y se extrajeron ${indicators.length}. No se realizaron cambios.`);
  }
  return indicators;
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    throw new Error('Uso: npm run import:rspo-pc -- "ruta/al/archivo-oficial.pdf"');
  }
  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const indicators = parseRspoIndicators(parsed.text);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE Requirement SET active=FALSE WHERE standardId='RSPO'");
    for (const indicator of indicators) {
      const [existingRows] = await connection.query(
        `SELECT r.id
         FROM Requirement r
         LEFT JOIN PcEvaluation pe ON pe.requirementId=r.id
         LEFT JOIN Evidence e ON e.requirementId=r.id
         WHERE r.standardId='RSPO' AND r.clause=?
         GROUP BY r.id
         ORDER BY (COUNT(DISTINCT pe.id)+COUNT(DISTINCT e.id)) DESC,r.id
         LIMIT 1`,
        [indicator.clause]
      );
      const id = (existingRows as any[])[0]?.id || uuidv4();
      const values = [
        `Indicador ${indicator.clause}`, indicator.officialText, indicator.principleCode,
        indicator.criterionCode, indicator.officialText, indicator.officialText, OFFICIAL_SOURCE,
        'English', indicator.isCritical, JSON.stringify(evidenceMap[indicator.principleCode] || []),
        JSON.stringify(processMap[indicator.principleCode] || []), indicator.sortOrder
      ];
      if ((existingRows as any[]).length) {
        await connection.query(
          `UPDATE Requirement SET title=?,description=?,principleCode=?,criterionCode=?,indicatorText=?,
           officialText=?,officialSourceUrl=?,sourceLanguage=?,officialImportedAt=NOW(),standardVersion='4.2',
           isCritical=?,expectedEvidence=?,processCodes=?,active=TRUE,sortOrder=? WHERE id=?`,
          [...values, id]
        );
      } else {
        await connection.query(
          `INSERT INTO Requirement
           (id,clause,title,description,status,evidenceCount,standardId,principleCode,criterionCode,
            indicatorText,officialText,officialSourceUrl,sourceLanguage,officialImportedAt,standardVersion,
            isCritical,expectedEvidence,processCodes,active,sortOrder)
           VALUES (?,?,?,?,'PENDING',0,'RSPO',?,?,?,?,?,?,NOW(),'4.2',?,?,?,TRUE,?)`,
          [id,indicator.clause,...values]
        );
      }
      await connection.query(
        "UPDATE Requirement SET active=FALSE WHERE standardId='RSPO' AND clause=? AND id<>?",
        [indicator.clause,id]
      );
    }
    await connection.commit();
    console.log(JSON.stringify({
      imported: indicators.length,
      critical: indicators.filter(item => item.isCritical).length,
      standard: 'RSPO P&C 2024 v4.2',
      language: 'English',
      source: OFFICIAL_SOURCE
    }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
