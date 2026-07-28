import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalSoilStudy, parseKmlGeometry } from './kmlSoilAnalysis';

test('extracts a polygon and calculates its geometry', () => {
  const geometry = parseKmlGeometry(`<?xml version="1.0"?><kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
    -74.0000,4.0000,0 -73.9990,4.0000,0 -73.9990,4.0010,0 -74.0000,4.0010,0 -74.0000,4.0000,0
  </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`);
  assert.equal(geometry.polygons.length, 1);
  assert.ok(geometry.areaHa > 1);
  assert.ok(geometry.perimeterKm > 0.4);
  assert.ok(Math.abs(geometry.centroid.latitude - 4.0005) < 0.0001);
});

test('rejects a file without valid KML coordinates', () => {
  assert.throws(() => parseKmlGeometry('<kml><Document /></kml>'), /geometría KML válida/);
});

test('the local study states the scientific limitations', () => {
  const geometry = parseKmlGeometry('<kml><coordinates>-74,4 -73.999,4 -73.999,4.001 -74,4.001</coordinates></kml>');
  const study = buildLocalSoilStudy(geometry);
  assert.match(study.limitations.join(' '), /no mide propiedades/i);
  assert.match(study.disclaimer, /laboratorio/i);
});
