export type Coordinate = { longitude: number; latitude: number };

export type KmlGeometry = {
  polygons: Coordinate[][];
  areaHa: number;
  perimeterKm: number;
  centroid: Coordinate;
  bounds: { north: number; south: number; east: number; west: number };
};

export type SoilStudy = {
  title: string;
  scope: string;
  geometricSummary: string;
  preliminaryRisks: string[];
  samplingPlan: string[];
  laboratoryTests: string[];
  fieldObservations: string[];
  limitations: string[];
  disclaimer: string;
};

const EARTH_RADIUS_M = 6371008.8;

const decodeXml = (value: string) => value
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

export function parseKmlGeometry(kml: string): KmlGeometry {
  if (!/<kml[\s>]/i.test(kml) || !/<coordinates[\s>]/i.test(kml)) {
    throw new Error('El archivo no contiene geometría KML válida.');
  }
  const blocks = [...kml.matchAll(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi)];
  const polygons = blocks.map(match => decodeXml(match[1]).trim().split(/\s+/).map(tuple => {
    const [longitude, latitude] = tuple.split(',').map(Number);
    return { longitude, latitude };
  }).filter(point => Number.isFinite(point.longitude) && Number.isFinite(point.latitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180))
    .filter(points => points.length >= 3);
  if (!polygons.length) throw new Error('No se encontró un polígono con al menos tres coordenadas válidas.');

  const all = polygons.flat();
  const latitude0 = all.reduce((sum, point) => sum + point.latitude, 0) / all.length;
  const latitude0Rad = latitude0 * Math.PI / 180;
  const project = (point: Coordinate) => ({
    x: EARTH_RADIUS_M * point.longitude * Math.PI / 180 * Math.cos(latitude0Rad),
    y: EARTH_RADIUS_M * point.latitude * Math.PI / 180
  });

  let totalSignedArea = 0;
  let totalPerimeter = 0;
  let weightedX = 0;
  let weightedY = 0;
  for (const ring of polygons) {
    const projected = ring.map(project);
    let twiceArea = 0;
    let centroidX = 0;
    let centroidY = 0;
    for (let index = 0; index < projected.length; index += 1) {
      const current = projected[index];
      const next = projected[(index + 1) % projected.length];
      const cross = current.x * next.y - next.x * current.y;
      twiceArea += cross;
      centroidX += (current.x + next.x) * cross;
      centroidY += (current.y + next.y) * cross;
      totalPerimeter += Math.hypot(next.x - current.x, next.y - current.y);
    }
    const signedArea = twiceArea / 2;
    const absoluteArea = Math.abs(signedArea);
    totalSignedArea += absoluteArea;
    if (Math.abs(twiceArea) > 0) {
      weightedX += (centroidX / (3 * twiceArea)) * absoluteArea;
      weightedY += (centroidY / (3 * twiceArea)) * absoluteArea;
    }
  }
  if (totalSignedArea <= 0) throw new Error('El polígono KML no tiene un área calculable.');
  const centroidX = weightedX / totalSignedArea;
  const centroidY = weightedY / totalSignedArea;
  return {
    polygons,
    areaHa: Number((totalSignedArea / 10000).toFixed(3)),
    perimeterKm: Number((totalPerimeter / 1000).toFixed(3)),
    centroid: {
      longitude: Number((centroidX / (EARTH_RADIUS_M * Math.cos(latitude0Rad)) * 180 / Math.PI).toFixed(7)),
      latitude: Number((centroidY / EARTH_RADIUS_M * 180 / Math.PI).toFixed(7))
    },
    bounds: {
      north: Math.max(...all.map(point => point.latitude)),
      south: Math.min(...all.map(point => point.latitude)),
      east: Math.max(...all.map(point => point.longitude)),
      west: Math.min(...all.map(point => point.longitude))
    }
  };
}

export function buildLocalSoilStudy(geometry: KmlGeometry, context = ''): SoilStudy {
  const sampleCount = Math.max(3, Math.ceil(geometry.areaHa / 10));
  return {
    title: 'Diagnóstico preliminar de suelo y plan de muestreo',
    scope: 'Análisis preliminar basado en la geometría del lote y en la información de campo suministrada.',
    geometricSummary: `Polígono de ${geometry.areaHa.toLocaleString('es-CO')} ha, perímetro aproximado de ${geometry.perimeterKm.toLocaleString('es-CO')} km y centroide ${geometry.centroid.latitude}, ${geometry.centroid.longitude}.`,
    preliminaryRisks: [
      'Verificar en campo pendientes, erosión, compactación, drenaje deficiente y cercanía a cuerpos de agua.',
      context.trim() ? `Observación reportada para contrastar en campo: ${context.trim()}` : 'No se suministraron observaciones de suelo o relieve; deben levantarse en campo.'
    ],
    samplingPlan: [
      `Dividir el lote en unidades homogéneas y tomar como mínimo ${sampleCount} muestras compuestas.`,
      'Georreferenciar los puntos, excluir bordes, vías, canales, montículos y zonas atípicas.',
      'Muestrear por separado las áreas con diferencias de relieve, drenaje, edad del cultivo o manejo.'
    ],
    laboratoryTests: ['pH y conductividad eléctrica', 'materia orgánica y textura', 'P, K, Ca, Mg, S y capacidad de intercambio catiónico', 'micronutrientes según historial y síntomas'],
    fieldObservations: ['pendiente y evidencias de erosión', 'drenaje e inundación', 'compactación y profundidad efectiva', 'cobertura y residuos vegetales'],
    limitations: ['El KML describe ubicación y geometría; no mide propiedades físicas, químicas ni biológicas del suelo.', 'Las recomendaciones de fertilización requieren resultados de laboratorio, edad del cultivo, rendimiento objetivo e historial de manejo.'],
    disclaimer: 'Resultado orientativo. Debe ser validado por un profesional agrónomo y por análisis de laboratorio antes de tomar decisiones de fertilización o manejo.'
  };
}

export async function buildAiSoilStudy(geometry: KmlGeometry, context = ''): Promise<{ study: SoilStudy; mode: 'AI' | 'LOCAL'; model: string | null }> {
  const fallback = buildLocalSoilStudy(geometry, context);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { study: fallback, mode: 'LOCAL', model: null };
  const model = process.env.OPENAI_SOIL_MODEL || 'gpt-5.6-sol';
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: 'Eres un agrónomo especializado en palma de aceite y RSPO. No inventes propiedades del suelo. El KML solo aporta geometría y ubicación. Entrega un diagnóstico preliminar, un plan de muestreo y las pruebas necesarias. Escribe en español.',
        input: JSON.stringify({ geometry: { areaHa: geometry.areaHa, perimeterKm: geometry.perimeterKm, centroid: geometry.centroid, bounds: geometry.bounds }, fieldContext: context || 'No suministrado' }),
        text: {
          format: {
            type: 'json_schema',
            name: 'soil_study',
            strict: true,
            schema: {
              type: 'object', additionalProperties: false,
              properties: {
                title: { type: 'string' }, scope: { type: 'string' }, geometricSummary: { type: 'string' },
                preliminaryRisks: { type: 'array', items: { type: 'string' } },
                samplingPlan: { type: 'array', items: { type: 'string' } },
                laboratoryTests: { type: 'array', items: { type: 'string' } },
                fieldObservations: { type: 'array', items: { type: 'string' } },
                limitations: { type: 'array', items: { type: 'string' } },
                disclaimer: { type: 'string' }
              },
              required: ['title','scope','geometricSummary','preliminaryRisks','samplingPlan','laboratoryTests','fieldObservations','limitations','disclaimer']
            }
          }
        }
      })
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const data: any = await response.json();
    const outputText = data.output_text || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
    if (!outputText) throw new Error('Respuesta sin contenido');
    return { study: JSON.parse(outputText), mode: 'AI', model };
  } catch {
    return { study: fallback, mode: 'LOCAL', model: null };
  }
}
