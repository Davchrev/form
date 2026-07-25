const SUPABASE_URL = 'https://mffmenufvwyjzcmbcfnz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U4ogYiEDUABL3OxFv-Gocw_D5t3kz8f';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'mis-finanzas-auth',
  },
});

const CATEGORIAS = {
  1: { nombre: 'Comida', color: '#f59e0b', fondo: '#fff5da' },
  2: { nombre: 'Transporte', color: '#2e86de', fondo: '#eaf3fc' },
  3: { nombre: 'Entretenimiento', color: '#8b5cf6', fondo: '#f1ecff' },
  4: { nombre: 'Servicios', color: '#14a38b', fondo: '#e6f8f4' },
  5: { nombre: 'Salud', color: '#ef5b6c', fondo: '#feecef' },
  6: { nombre: 'Otros', color: '#64748b', fondo: '#eef1f4' },
  7: { nombre: 'Delivery', color: '#f97316', fondo: '#fff0e6' },
  8: { nombre: 'Chucherías', color: '#ec4899', fondo: '#fceaf3' },
};

const PERIODOS = {
  today: 'Gastado hoy',
  week: 'Gastado esta semana',
  month: 'Gastado este mes',
  all: 'Gasto total',
};

const formatoMoneda = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

const tipo = document.getElementById('tipo');
const camposGasto = document.getElementById('campos-gasto');
const camposComida = document.getElementById('campos-comida');
const form = document.getElementById('form-registro');
const mensaje = document.getElementById('mensaje');
const btnGuardar = form.querySelector('.btn-guardar');
const navTabs = document.querySelectorAll('.nav-tab');
const periodTabs = document.querySelectorAll('.period-tab');
const gastosLoading = document.getElementById('gastos-loading');
const gastosError = document.getElementById('gastos-error');
const gastosContent = document.getElementById('gastos-content');
const btnActualizar = document.getElementById('actualizar-gastos');
const graficosLoading = document.getElementById('graficos-loading');
const graficosError = document.getElementById('graficos-error');
const graficosContent = document.getElementById('graficos-content');
const btnActualizarGraficos = document.getElementById('actualizar-graficos');
const authLoading = document.getElementById('auth-loading');
const authScreen = document.getElementById('auth-screen');
const appShell = document.getElementById('app-shell');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');
const authMessage = document.getElementById('auth-message');
const btnCerrarSesion = document.getElementById('cerrar-sesion');

let gastos = [];
let gastosCargados = false;
let periodoActivo = 'today';
let sesionActual = null;

function mostrarMensajeAuth(texto, tipoMensaje = 'error') {
  authMessage.textContent = texto;
  authMessage.className = tipoMensaje;
}

function limpiarMensajeAuth() {
  authMessage.textContent = '';
  authMessage.className = '';
}

function traducirErrorAuth(error) {
  const mensajeError = String(error?.message || '').toLowerCase();
  if (mensajeError.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (mensajeError.includes('email not confirmed')) return 'Confirma tu correo antes de ingresar.';
  if (mensajeError.includes('user already registered')) return 'Este correo ya tiene una cuenta. Inicia sesión.';
  if (mensajeError.includes('signup is disabled')) return 'La creación de nuevas cuentas está desactivada.';
  if (mensajeError.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (mensajeError.includes('rate limit')) return 'Espera un momento antes de volver a intentarlo.';
  return 'No pudimos completar el acceso. Intenta nuevamente.';
}

function mostrarSesion(sesion) {
  sesionActual = sesion;
  authLoading.hidden = true;
  const autenticado = Boolean(sesion?.user);
  authScreen.hidden = autenticado;
  appShell.hidden = !autenticado;

  if (autenticado) {
    const email = sesion.user.email || 'Mi cuenta';
    document.getElementById('usuario-email').textContent = email;
    document.getElementById('usuario-inicial').textContent = email.charAt(0).toUpperCase();
    authForm.reset();
    limpiarMensajeAuth();
  } else {
    gastos = [];
    gastosCargados = false;
    limpiarMensajeAuth();
    setTimeout(() => authEmail.focus(), 0);
  }
}

async function inicializarAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    mostrarSesion(data.session);
  } catch (error) {
    console.error(error);
    mostrarSesion(null);
    mostrarMensajeAuth('No pudimos verificar la sesión. Revisa tu conexión.');
  }

  supabaseClient.auth.onAuthStateChange((_evento, sesion) => {
    mostrarSesion(sesion);
  });
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limpiarMensajeAuth();
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;

  if (!email || password.length < 6) {
    mostrarMensajeAuth('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
    return;
  }

  authSubmit.disabled = true;
  authSubmit.textContent = 'Ingresando...';

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    mostrarMensajeAuth(traducirErrorAuth(error));
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = 'Iniciar sesión';
  }
});

btnCerrarSesion.addEventListener('click', async () => {
  btnCerrarSesion.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (error) {
    console.error(error);
  } finally {
    btnCerrarSesion.disabled = false;
  }
});

tipo.addEventListener('change', () => {
  camposGasto.style.display = tipo.value === 'gasto' ? 'block' : 'none';
  camposComida.style.display = tipo.value === 'comida' ? 'block' : 'none';
  mensaje.className = '';
});

function mostrarMensaje(texto, tipoMensaje) {
  mensaje.textContent = texto;
  mensaje.className = tipoMensaje;
}

function cambiarVista(nombre) {
  navTabs.forEach((tab) => {
    const activa = tab.dataset.view === nombre;
    tab.classList.toggle('active', activa);
    tab.setAttribute('aria-selected', String(activa));
  });

  document.querySelectorAll('.app-view').forEach((vista) => {
    const activa = vista.id === `vista-${nombre}`;
    vista.classList.toggle('active', activa);
    vista.hidden = !activa;
  });

  if ((nombre === 'gastos' || nombre === 'graficos') && !gastosCargados) {
    cargarGastos();
  }
}

navTabs.forEach((tab) => {
  tab.addEventListener('click', () => cambiarVista(tab.dataset.view));
});

periodTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    periodoActivo = tab.dataset.period;
    periodTabs.forEach((item) => {
      const activa = item === tab;
      item.classList.toggle('active', activa);
      item.setAttribute('aria-selected', String(activa));
    });
    renderizarResumen();
  });
});

function inicioDelDia(fecha = new Date()) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function claveFecha(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function rangoPeriodo(periodo) {
  const ahora = new Date();

  if (periodo === 'today') {
    const inicio = inicioDelDia(ahora);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);
    return { inicio, fin };
  }

  if (periodo === 'week') {
    const inicio = inicioDelDia(ahora);
    const dia = inicio.getDay();
    inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return { inicio, fin };
  }

  if (periodo === 'month') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    return { inicio, fin };
  }

  return { inicio: null, fin: null };
}

function gastosDelPeriodo() {
  const { inicio, fin } = rangoPeriodo(periodoActivo);
  if (!inicio) return gastos;

  return gastos.filter((gasto) => {
    const fecha = new Date(gasto.fecha);
    return !Number.isNaN(fecha.getTime()) && fecha >= inicio && fecha < fin;
  });
}

function etiquetaFechas() {
  const ahora = new Date();
  const { inicio, fin } = rangoPeriodo(periodoActivo);

  if (periodoActivo === 'today') {
    return ahora.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  if (periodoActivo === 'week') {
    const ultimoDia = new Date(fin);
    ultimoDia.setDate(ultimoDia.getDate() - 1);
    const desde = inicio.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const hasta = ultimoDia.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    return `${desde} – ${hasta}`;
  }

  if (periodoActivo === 'month') {
    return ahora.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  }

  return gastos.length ? 'Todos tus registros' : 'Sin registros todavía';
}

function categoriaDe(id) {
  return CATEGORIAS[Number(id)] || CATEGORIAS[6];
}

function escapeHTML(valor) {
  const elemento = document.createElement('div');
  elemento.textContent = valor == null ? '' : String(valor);
  return elemento.innerHTML;
}

function fechaMovimiento(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';

  const hoy = inicioDelDia();
  const dia = inicioDelDia(fecha);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  const hora = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (dia.getTime() === hoy.getTime()) return `Hoy · ${hora}`;
  if (dia.getTime() === ayer.getTime()) return `Ayer · ${hora}`;
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderizarCategorias(lista, total) {
  const contenedor = document.getElementById('categorias-lista');
  const vacio = document.getElementById('categorias-vacio');
  const acumulado = new Map();

  lista.forEach((gasto) => {
    const id = Number(gasto.categoria_id) || 6;
    acumulado.set(id, (acumulado.get(id) || 0) + (Number(gasto.monto) || 0));
  });

  const categorias = [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  vacio.hidden = categorias.length > 0;
  contenedor.innerHTML = categorias.map(([id, monto]) => {
    const categoria = categoriaDe(id);
    const porcentaje = total > 0 ? (monto / total) * 100 : 0;
    return `
      <div class="category-item">
        <div class="category-row">
          <span class="category-name">
            <span class="category-dot" style="background:${categoria.color}"></span>
            ${categoria.nombre}
          </span>
          <span class="category-amount">${formatoMoneda.format(monto)} · ${Math.round(porcentaje)}%</span>
        </div>
        <div class="category-bar" aria-label="${categoria.nombre}: ${Math.round(porcentaje)}%">
          <span style="width:${porcentaje}%;background:${categoria.color}"></span>
        </div>
      </div>`;
  }).join('');
}

function renderizarMovimientos(lista) {
  const contenedor = document.getElementById('movimientos-lista');
  const vacio = document.getElementById('movimientos-vacio');
  document.getElementById('movimientos-cantidad').textContent = lista.length;

  vacio.hidden = lista.length > 0;
  contenedor.hidden = lista.length === 0;
  contenedor.innerHTML = lista.map((gasto) => {
    const categoria = categoriaDe(gasto.categoria_id);
    const inicial = categoria.nombre.charAt(0);
    const concepto = escapeHTML(gasto.concepto || categoria.nombre);
    const metodo = escapeHTML(gasto.metodo_pago || 'Sin método');
    return `
      <article class="transaction-item">
        <span class="transaction-icon" style="color:${categoria.color};background:${categoria.fondo}" aria-hidden="true">${inicial}</span>
        <div class="transaction-info">
          <strong>${concepto}</strong>
          <span>${categoria.nombre} · ${metodo} · ${fechaMovimiento(gasto.fecha)}</span>
        </div>
        <strong class="transaction-amount">− ${formatoMoneda.format(Number(gasto.monto) || 0)}</strong>
      </article>`;
  }).join('');
}

function renderizarSemana() {
  const seccion = document.getElementById('desglose-semanal');
  seccion.hidden = periodoActivo !== 'week';
  if (periodoActivo !== 'week') return;

  const contenedor = document.getElementById('semana-lista');
  const { inicio, fin } = rangoPeriodo('week');
  const hoy = inicioDelDia();
  const gastosSemana = gastosDelPeriodo();
  const dias = [];

  for (let cursor = new Date(inicio); cursor < fin && cursor <= hoy; cursor.setDate(cursor.getDate() + 1)) {
    const fecha = new Date(cursor);
    const clave = claveFecha(fecha);
    const movimientos = gastosSemana.filter((gasto) => {
      const fechaGasto = new Date(gasto.fecha);
      return !Number.isNaN(fechaGasto.getTime()) && claveFecha(fechaGasto) === clave;
    });
    const total = movimientos.reduce((suma, gasto) => suma + (Number(gasto.monto) || 0), 0);
    dias.push({ fecha, total, cantidad: movimientos.length });
  }

  const maximo = Math.max(...dias.map((dia) => dia.total), 0);
  contenedor.innerHTML = dias.map((dia) => {
    const nombre = dia.fecha.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '');
    const numero = dia.fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const porcentaje = maximo > 0 ? (dia.total / maximo) * 100 : 0;
    const movimientos = dia.cantidad === 1 ? '1 movimiento' : `${dia.cantidad} movimientos`;
    return `
      <div class="week-day">
        <div class="week-day-label">
          <strong>${nombre}</strong>
          <span>${numero}</span>
        </div>
        <div class="week-day-track" aria-label="${nombre}: ${formatoMoneda.format(dia.total)}">
          <span style="width:${porcentaje}%"></span>
        </div>
        <div class="week-day-value">
          <strong>${formatoMoneda.format(dia.total)}</strong>
          <span>${movimientos}</span>
        </div>
      </div>`;
  }).join('');
}

function diasUltimosTreinta() {
  const hoy = inicioDelDia();
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - 29);
  const dias = [];

  for (let cursor = new Date(inicio); cursor <= hoy; cursor.setDate(cursor.getDate() + 1)) {
    dias.push({
      fecha: new Date(cursor),
      categorias: new Map(),
      total: 0,
      cantidad: 0,
    });
  }

  const porFecha = new Map(dias.map((dia) => [claveFecha(dia.fecha), dia]));
  gastos.forEach((gasto) => {
    const fecha = new Date(gasto.fecha);
    if (Number.isNaN(fecha.getTime())) return;
    const dia = porFecha.get(claveFecha(fecha));
    if (!dia) return;

    const categoriaId = Number(gasto.categoria_id) || 6;
    const monto = Number(gasto.monto) || 0;
    dia.categorias.set(categoriaId, (dia.categorias.get(categoriaId) || 0) + monto);
    dia.total += monto;
    dia.cantidad += 1;
  });

  return dias;
}

function renderizarGraficos() {
  const dias = diasUltimosTreinta();
  const total = dias.reduce((suma, dia) => suma + dia.total, 0);
  const diasConGastos = dias.filter((dia) => dia.cantidad > 0).length;
  const promedioDiario = total / dias.length;
  const maximo = Math.max(...dias.map((dia) => dia.total), 0);
  const categoriasUsadas = new Set();

  dias.forEach((dia) => dia.categorias.forEach((_, id) => categoriasUsadas.add(id)));

  document.getElementById('grafico-total').textContent = formatoMoneda.format(total);
  document.getElementById('grafico-dias').textContent = `${diasConGastos} de 30`;
  document.getElementById('grafico-promedio').textContent = `Prom. ${formatoMoneda.format(promedioDiario)}`;

  const leyenda = document.getElementById('grafico-leyenda');
  leyenda.innerHTML = [...categoriasUsadas]
    .sort((a, b) => a - b)
    .map((id) => {
      const categoria = categoriaDe(id);
      return `<span class="legend-item"><span style="background:${categoria.color}"></span>${categoria.nombre}</span>`;
    }).join('');

  const grafico = document.getElementById('grafico-barras');
  const scroll = document.getElementById('grafico-scroll');
  const vacio = document.getElementById('grafico-vacio');
  const sinDatos = total === 0;
  scroll.hidden = sinDatos;
  leyenda.hidden = sinDatos;
  vacio.hidden = !sinDatos;

  grafico.innerHTML = dias.map((dia, indice) => {
    const altoTotal = maximo > 0 ? (dia.total / maximo) * 100 : 0;
    const segmentos = [...dia.categorias.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, monto]) => {
        const categoria = categoriaDe(id);
        const alto = maximo > 0 ? (monto / maximo) * 100 : 0;
        return `<span class="stacked-segment" style="height:${alto}%;background:${categoria.color}" title="${categoria.nombre}: ${formatoMoneda.format(monto)}"></span>`;
      }).join('');
    const etiqueta = dia.fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '');
    const fechaCompleta = dia.fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const totalEtiqueta = dia.total > 0 ? `<span class="bar-total">${Math.round(dia.total)}</span>` : '';
    const esHoy = indice === dias.length - 1 ? ' today' : '';
    return `
      <div class="chart-column${esHoy}" style="--bar-height:${altoTotal}%" aria-label="${fechaCompleta}: ${formatoMoneda.format(dia.total)}, ${dia.cantidad} movimientos">
        <div class="stacked-bar">
          ${segmentos}
          ${totalEtiqueta}
        </div>
        <span class="bar-label">${etiqueta}</span>
      </div>`;
  }).join('');

  if (!sinDatos) {
    requestAnimationFrame(() => { scroll.scrollLeft = scroll.scrollWidth; });
  }
}

function renderizarResumen() {
  const lista = gastosDelPeriodo();
  const total = lista.reduce((suma, gasto) => suma + (Number(gasto.monto) || 0), 0);
  const promedio = lista.length ? total / lista.length : 0;

  document.getElementById('periodo-label').textContent = PERIODOS[periodoActivo];
  document.getElementById('periodo-fechas').textContent = etiquetaFechas();
  document.getElementById('gasto-total').textContent = formatoMoneda.format(total);
  document.getElementById('gasto-movimientos').textContent = lista.length;
  document.getElementById('gasto-promedio').textContent = formatoMoneda.format(promedio);

  renderizarCategorias(lista, total);
  renderizarSemana();
  renderizarMovimientos(lista);
}

async function cargarGastos() {
  if (!sesionActual?.user) return;

  [gastosLoading, graficosLoading].forEach((elemento) => { elemento.hidden = false; });
  [gastosError, graficosError].forEach((elemento) => { elemento.hidden = true; });
  [gastosContent, graficosContent].forEach((elemento) => { elemento.hidden = true; });
  [btnActualizar, btnActualizarGraficos].forEach((boton) => {
    boton.classList.add('loading');
    boton.disabled = true;
  });

  try {
    const { data, error } = await supabaseClient
      .from('gastos_david')
      .select('*')
      .eq('user_id', sesionActual.user.id)
      .order('fecha', { ascending: false });

    if (error) throw error;
    gastos = Array.isArray(data) ? data : [];
    gastosCargados = true;
    renderizarResumen();
    renderizarGraficos();
    [gastosLoading, graficosLoading].forEach((elemento) => { elemento.hidden = true; });
    [gastosContent, graficosContent].forEach((elemento) => { elemento.hidden = false; });
  } catch (error) {
    console.error(error);
    gastosCargados = false;
    [gastosLoading, graficosLoading].forEach((elemento) => { elemento.hidden = true; });
    [gastosError, graficosError].forEach((elemento) => { elemento.hidden = false; });
  } finally {
    [btnActualizar, btnActualizarGraficos].forEach((boton) => {
      boton.classList.remove('loading');
      boton.disabled = false;
    });
  }
}

btnActualizar.addEventListener('click', cargarGastos);
btnActualizarGraficos.addEventListener('click', cargarGastos);
document.getElementById('reintentar-gastos').addEventListener('click', cargarGastos);
document.getElementById('reintentar-graficos').addEventListener('click', cargarGastos);
document.getElementById('ir-a-registrar').addEventListener('click', () => {
  cambiarVista('registro');
  tipo.value = 'gasto';
  tipo.dispatchEvent(new Event('change'));
  document.getElementById('gasto-concepto').focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  mensaje.className = '';

  if (!sesionActual?.user) {
    mostrarMensaje('Tu sesión terminó. Inicia sesión nuevamente.', 'error');
    mostrarSesion(null);
    return;
  }

  let tabla;
  let payload;

  if (tipo.value === 'gasto') {
    const concepto = document.getElementById('gasto-concepto').value.trim();
    const monto = Number(document.getElementById('gasto-monto').value);
    const categoria = Number(document.getElementById('gasto-categoria').value);
    const metodoPago = document.getElementById('gasto-metodo-pago').value;

    if (!concepto || !Number.isFinite(monto) || monto <= 0 || !categoria || !metodoPago) {
      mostrarMensaje('Completa concepto, monto, categoría y método de pago.', 'error');
      return;
    }

    tabla = 'gastos_david';
    payload = {
      concepto,
      monto,
      user_id: sesionActual.user.id,
      categoria_id: categoria,
      metodo_pago: metodoPago,
      es_recurrente: document.getElementById('gasto-recurrente').checked,
      notas: document.getElementById('gasto-notas').value.trim() || null,
    };
    const fecha = document.getElementById('gasto-fecha').value;
    if (fecha) payload.fecha = fecha;
  } else if (tipo.value === 'comida') {
    const concepto = document.getElementById('comida-concepto').value.trim();
    const calorias = Number(document.getElementById('comida-calorias').value);
    const proteinas = Number(document.getElementById('comida-proteinas').value);
    const nombre = document.getElementById('comida-nombre').value.trim();

    if (!concepto || !Number.isFinite(calorias) || !Number.isFinite(proteinas) || !nombre) {
      mostrarMensaje('Completa todos los datos de la comida.', 'error');
      return;
    }

    tabla = 'comida';
    payload = { concepto, calorias, proteinas, nombre, user_id: sesionActual.user.id };
    const fecha = document.getElementById('comida-fecha').value;
    if (fecha) payload.fecha = fecha;
  } else {
    mostrarMensaje('Selecciona un tipo de registro.', 'error');
    return;
  }

  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    const { error } = await supabaseClient.from(tabla).insert(payload);
    if (error) throw error;

    mostrarMensaje('Guardado correctamente.', 'ok');
    form.reset();
    camposGasto.style.display = 'none';
    camposComida.style.display = 'none';
    if (tabla === 'gastos_david') gastosCargados = false;
  } catch (error) {
    console.error(error);
    mostrarMensaje('No se pudo guardar. Intenta de nuevo.', 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar registro';
  }
});

inicializarAuth();
