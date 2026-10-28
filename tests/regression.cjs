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
let operation;
const filters = [];
const client = { from() { return {
  update(value) { operation = 'update'; patch = value; return this; },
  delete() { operation = 'delete'; return this; },
  eq(key, value) { filters.push([key, value]); return this; },
  select() { return this; }, single: async () => response,
}; } };
const ctx = vm.createContext({
  window: { supabase: { createClient: () => client }, confirm: () => true },
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
assert.equal(vm.runInContext("fechaLocalParaBase('2026-10-26T20:30')", ctx), '2026-10-26T20:30');
(async () => {
  vm.runInContext('abrirDetalleGasto(gastos[2])', ctx);
  element('gasto-detalle-fecha').value = '2026-03-01T12:34:56';
  response = { data: { id: 3, fecha: '2026-03-01T12:34:56' } };
  const event = { preventDefault() {}, currentTarget: element('editar-fecha-gasto') };
  await element('editar-fecha-gasto').submit(event);
  assert.equal(operation, 'update');
  assert.equal(patch.fecha, response.data.fecha);
  assert.deepEqual(filters, [['id', 3], ['user_id', 'owner']]);
  assert.equal(vm.runInContext('gastos[0].id', ctx), 3);
  assert.equal(vm.runInContext('obtenerDatosIntervalos(esRegistroGasolina).intervalos[0].dias', ctx), 26);
  assert.equal(element('gasto-fecha-mensaje').textContent, 'Fecha actualizada.');
  response = { error: new Error('permission denied') };
  filters.length = 0;
  element('gasto-detalle-fecha').value = '2026-03-15T12:00:00';
  await element('editar-fecha-gasto').submit(event);
  assert.equal(vm.runInContext('obtenerDatosIntervalos(esRegistroGasolina).intervalos[0].dias', ctx), 26);
  assert.match(element('gasto-fecha-mensaje').textContent, /No se pudo/);
  assert.equal(element('editar-fecha-gasto-button').disabled, false);
  filters.length = 0;
  response = { data: { id: 3 } };
  await element('eliminar-gasto').click();
  assert.equal(operation, 'delete');
  assert.deepEqual(filters, [['id', 3], ['user_id', 'owner']]);
  assert.equal(vm.runInContext('gastos.some(gasto => gasto.id === 3)', ctx), false);
  assert.equal(element('gasto-detalle-dialog').open, false);
  console.log('OK: intervalos, fecha local, edición, eliminación, propietario y errores');
})().catch(error => { console.error(error); process.exitCode = 1; });
