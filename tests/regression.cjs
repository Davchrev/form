const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '', textContent: '', hidden: false, disabled: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, cb) { this[type] = cb; },
    querySelector() { return element(id + '-button'); },
    showModal() { this.open = true; }, close() { this.open = false; },
  });
  return elements.get(id);
}
let response;
let patch;
const filters = [];
const client = { from() { return {
  update(value) { patch = value; return this; },
  eq(key, value) { filters.push([key, value]); return this; },
  select() { return this; }, single: async () => response,
}; } };
const ctx = vm.createContext({
  window: { supabase: { createClient: () => client } },
  document: { getElementById: element, querySelectorAll: () => [], addEventListener() {} },
  console: { error() {} }, Intl, Date, setTimeout,
});
const source = readFileSync(__dirname + '/../js/formulario.js', 'utf8').replace(/inicializarAuth\(\);\s*$/, '');
vm.runInContext(source, ctx);
vm.runInContext(`
  renderizarResumen = () => {};
  renderizarGraficos = () => {};
  sesionActual = { user: { id: 'owner' } };
  gastos = [
    { id: 1, concepto: 'GASOLINA', monto: 200, fecha: '2026-01-01T12:00:00-05:00' },
    { id: 2, concepto: 'Gasolina', monto: 210, fecha: '2026-02-03T12:00:00-05:00' },
    { id: 3, concepto: 'gasolina', monto: 220, fecha: '2026-02-28T12:00:00-05:00' },
    { id: 4, concepto: 'gasolina', monto: 50, fecha: '2026-02-10T12:00:00-05:00' },
  ];
`, ctx);
assert.equal(vm.runInContext('JSON.stringify(obtenerDatosIntervalos(esRegistroGasolina).intervalos.map(i => i.dias))', ctx), '[25,33]');
assert.equal(vm.runInContext("esRegistroWD({ concepto: 'WD', notas: '1ZT' })", ctx), true);
assert.equal(vm.runInContext("esRegistroWD({ concepto: 'WD', notas: '1Z' })", ctx), true);
assert.equal(vm.runInContext("esRegistroWD({ concepto: 'WD', notas: '2Z' })", ctx), false);
(async () => {
  vm.runInContext('abrirDetalleGasto(gastos[2])', ctx);
  element('gasto-detalle-fecha').value = '2026-03-01T12:34:56';
  response = { data: { id: 3, fecha: new Date('2026-03-01T12:34:56').toISOString() } };
  const event = { preventDefault() {}, currentTarget: element('editar-fecha-gasto') };
  await element('editar-fecha-gasto').submit(event);
  assert.equal(patch.fecha, response.data.fecha);
  assert.deepEqual(filters, [['id', 3], ['user_id', 'owner']]);
  assert.equal(vm.runInContext('gastos[0].id', ctx), 3);
  assert.equal(vm.runInContext('obtenerDatosIntervalos(esRegistroGasolina).intervalos[0].dias', ctx), 26);
  assert.equal(element('gasto-fecha-mensaje').textContent, 'Fecha actualizada.');
  response = { error: new Error('permission denied') };
  element('gasto-detalle-fecha').value = '2026-03-15T12:00:00';
  await element('editar-fecha-gasto').submit(event);
  assert.equal(vm.runInContext('obtenerDatosIntervalos(esRegistroGasolina).intervalos[0].dias', ctx), 26);
  assert.match(element('gasto-fecha-mensaje').textContent, /No se pudo/);
  assert.equal(element('editar-fecha-gasto-button').disabled, false);
  console.log('OK: intervalos separados, WD, edición de fecha, propietario y error sin cambio local');
})().catch(error => { console.error(error); process.exitCode = 1; });
