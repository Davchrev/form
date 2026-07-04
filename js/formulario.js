// Configura tu proyecto de Supabase aquí
const SUPABASE_URL = 'https://mffmenufvwyjzcmbcfnz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U4ogYiEDUABL3OxFv-Gocw_D5t3kz8f';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tipo = document.getElementById('tipo');
const camposGasto = document.getElementById('campos-gasto');
const camposComida = document.getElementById('campos-comida');
const form = document.getElementById('form-registro');
const mensaje = document.getElementById('mensaje');
const btnGuardar = form.querySelector('.btn-guardar');

tipo.addEventListener('change', () => {
  camposGasto.style.display = tipo.value === 'gasto' ? 'block' : 'none';
  camposComida.style.display = tipo.value === 'comida' ? 'block' : 'none';
  mensaje.className = '';
});

function mostrarMensaje(texto, tipoMensaje) {
  mensaje.textContent = texto;
  mensaje.className = tipoMensaje;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.className = '';

  let tabla, payload;

  if (tipo.value === 'gasto') {
    tabla = 'gastos_david';
    payload = {
      concepto: document.getElementById('gasto-concepto').value,
      monto: parseFloat(document.getElementById('gasto-monto').value),
      categoria_id: parseInt(document.getElementById('gasto-categoria').value, 10),
      metodo_pago: document.getElementById('gasto-metodo-pago').value,
      es_recurrente: document.getElementById('gasto-recurrente').checked,
      notas: document.getElementById('gasto-notas').value || null,
    };
    const fecha = document.getElementById('gasto-fecha').value;
    if (fecha) payload.fecha = fecha;
  } else if (tipo.value === 'comida') {
    tabla = 'comida';
    payload = {
      concepto: document.getElementById('comida-concepto').value,
      calorias: parseInt(document.getElementById('comida-calorias').value, 10),
      proteinas: parseFloat(document.getElementById('comida-proteinas').value),
      nombre: document.getElementById('comida-nombre').value,
    };
    const fecha = document.getElementById('comida-fecha').value;
    if (fecha) payload.fecha = fecha;
  } else {
    mostrarMensaje('Selecciona un tipo de registro.', 'error');
    return;
  }

  btnGuardar.disabled = true;
  try {
    const { error } = await supabaseClient.from(tabla).insert(payload);
    if (error) throw error;

    mostrarMensaje('Guardado correctamente.', 'ok');
    form.reset();
    camposGasto.style.display = 'none';
    camposComida.style.display = 'none';
  } catch (err) {
    console.error(err);
    mostrarMensaje('No se pudo guardar. Intenta de nuevo.', 'error');
  } finally {
    btnGuardar.disabled = false;
  }
});