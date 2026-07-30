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
const btnMesAnterior = document.getElementById('mes-anterior');
const btnMesSiguiente = document.getElementById('mes-siguiente');
const resumenSemanaNavegacion = document.getElementById('resumen-semana-navegacion');
const btnResumenSemanaAnterior = document.getElementById('resumen-semana-anterior');
const btnResumenSemanaSiguiente = document.getElementById('resumen-semana-siguiente');
const resumenMesNavegacion = document.getElementById('resumen-mes-navegacion');
const btnResumenMesAnterior = document.getElementById('resumen-mes-anterior');
const btnResumenMesSiguiente = document.getElementById('resumen-mes-siguiente');
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
let diaSemanaAbierto = null;
let mesGrafico = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let mesResumen = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let semanaResumen = inicioDeSemana(new Date());
let diaGraficoSeleccionado = null;
let categoriaTotalAbierta = null;
let mesCategoriaTotalAbierto = null;
let mesMovimientosTotalAbierto = null;

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

  // Consultar siempre al abrir un panel para reflejar también cambios hechos fuera de la app.
  if (nombre === 'gastos' || nombre === 'graficos') {
    cargarGastos();
  }
}

navTabs.forEach((tab) => {
  tab.addEventListener('click', () => cambiarVista(tab.dataset.view));
});

periodTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const periodoAnterior = periodoActivo;
    periodoActivo = tab.dataset.period;
    if (periodoActivo === 'all' && periodoAnterior !== 'all') {
      categoriaTotalAbierta = null;
      mesCategoriaTotalAbierto = null;
      mesMovimientosTotalAbierto = null;
    }
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

function inicioDeSemana(fecha = new Date()) {
  const inicio = inicioDelDia(fecha);
  const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
  return inicio;
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
    const inicio = new Date(semanaResumen);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return { inicio, fin };
  }

  if (periodo === 'month') {
    const inicio = new Date(mesResumen.getFullYear(), mesResumen.getMonth(), 1);
    const fin = new Date(mesResumen.getFullYear(), mesResumen.getMonth() + 1, 1);
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
    return mesResumen.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
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

function resumenTanquesLlenos() {
  const hoy = inicioDelDia();
  const cargas = gastos
    .filter((gasto) => Number(gasto.monto) > 180 && /gasolina/i.test(String(gasto.concepto || '')))
    .map((gasto) => inicioDelDia(new Date(gasto.fecha)))
    .filter((fecha) => !Number.isNaN(fecha.getTime()) && fecha <= hoy)
    .sort((a, b) => a - b);

  if (!cargas.length) return null;

  const ultima = cargas[cargas.length - 1];
  const diasDesdeUltima = Math.max(0, Math.floor((hoy - ultima) / 86400000));
  const textoDesdeUltima = diasDesdeUltima === 0
    ? 'Hoy'
    : `${diasDesdeUltima} ${diasDesdeUltima === 1 ? 'día' : 'días'}`;

  if (cargas.length === 1) {
    return { intervalo: 'Sin intervalo todavía', desdeUltima: textoDesdeUltima };
  }

  const penultima = cargas[cargas.length - 2];
  const ultimoIntervaloDias = Math.max(0, Math.round((ultima - penultima) / 86400000));
  return {
    intervalo: `${ultimoIntervaloDias} ${ultimoIntervaloDias === 1 ? 'día' : 'días'}`,
    desdeUltima: textoDesdeUltima,
  };
}

function renderizarCategorias(lista, total) {
  const contenedor = document.getElementById('categorias-lista');
  const vacio = document.getElementById('categorias-vacio');
  const ayuda = document.getElementById('categorias-ayuda');
  const acumulado = new Map();

  lista.forEach((gasto) => {
    const id = Number(gasto.categoria_id) || 6;
    acumulado.set(id, (acumulado.get(id) || 0) + (Number(gasto.monto) || 0));
  });

  const categorias = [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  if (periodoActivo === 'all' && categoriaTotalAbierta !== null && !acumulado.has(categoriaTotalAbierta)) {
    categoriaTotalAbierta = null;
    mesCategoriaTotalAbierto = null;
  }
  vacio.hidden = categorias.length > 0;
  ayuda.hidden = periodoActivo !== 'all' || categorias.length === 0;
  contenedor.innerHTML = categorias.map(([id, monto]) => {
    const categoria = categoriaDe(id);
    const porcentaje = total > 0 ? (monto / total) * 100 : 0;
    const esInteractiva = periodoActivo === 'all';
    const seleccionada = esInteractiva && categoriaTotalAbierta === id;
    const contenido = `
      <span class="category-row">
        <span class="category-name">
          <span class="category-dot" style="background:${categoria.color}"></span>
          ${categoria.nombre}
        </span>
        <span class="category-value">
          <span class="category-amount">${formatoMoneda.format(monto)} · ${Math.round(porcentaje)}%</span>
          ${esInteractiva ? '<span class="category-chevron" aria-hidden="true">⌄</span>' : ''}
        </span>
      </span>
      <span class="category-bar" aria-label="${categoria.nombre}: ${Math.round(porcentaje)}%">
        <span style="width:${porcentaje}%;background:${categoria.color}"></span>
      </span>`;
    return `
      <div class="category-item${seleccionada ? ' selected' : ''}">
        ${esInteractiva
    ? `<button type="button" class="category-button" data-category="${id}" aria-expanded="${seleccionada}" aria-controls="detalle-categoria-${id}">${contenido}</button>`
    : contenido}
        ${seleccionada ? crearDesgloseCategoria(id, lista) : ''}
      </div>`;
  }).join('');

  contenedor.querySelectorAll('.category-button').forEach((boton) => {
    boton.addEventListener('click', () => {
      const categoriaId = Number(boton.dataset.category);
      categoriaTotalAbierta = categoriaTotalAbierta === categoriaId ? null : categoriaId;
      mesCategoriaTotalAbierto = null;
      renderizarCategorias(lista, total);
    });
  });

  contenedor.querySelectorAll('.category-month-button').forEach((boton) => {
    boton.addEventListener('click', () => {
      mesCategoriaTotalAbierto = mesCategoriaTotalAbierto === boton.dataset.month ? null : boton.dataset.month;
      renderizarCategorias(lista, total);
    });
  });
}

function agruparMovimientosPorMes(lista) {
  const acumulado = new Map();
  lista.forEach((gasto) => {
    const fecha = new Date(gasto.fecha);
    const valida = !Number.isNaN(fecha.getTime());
    const clave = valida
      ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      : 'sin-fecha';
    const mes = acumulado.get(clave) || {
      clave,
      fecha: valida ? new Date(fecha.getFullYear(), fecha.getMonth(), 1) : null,
      monto: 0,
      movimientos: [],
    };
    mes.monto += Number(gasto.monto) || 0;
    mes.movimientos.push(gasto);
    acumulado.set(clave, mes);
  });

  return [...acumulado.values()].sort((a, b) => {
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return b.fecha - a.fecha;
  });
}

function nombreDelMes(mes) {
  return mes.fecha
    ? mes.fecha.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    : 'Sin fecha';
}

function crearDesgloseCategoria(categoriaId, lista) {
  const categoria = categoriaDe(categoriaId);
  const meses = agruparMovimientosPorMes(
    lista.filter((gasto) => (Number(gasto.categoria_id) || 6) === categoriaId),
  );
  const totalCategoria = meses.reduce((suma, mes) => suma + mes.monto, 0);
  const contenido = meses.map((mes) => {
    const abierto = mesCategoriaTotalAbierto === mes.clave;
    const cantidad = mes.movimientos.length;
    const textoCantidad = cantidad === 1 ? '1 operación' : `${cantidad} operaciones`;
    const detalleId = `detalle-categoria-${categoriaId}-${mes.clave}`;
    const operaciones = mes.movimientos.map((gasto) => {
      const concepto = escapeHTML(gasto.concepto || categoria.nombre);
      const metodo = escapeHTML(gasto.metodo_pago || 'Sin método');
      return `
        <div class="category-operation-row">
          <span><strong>${concepto}</strong>${fechaMovimiento(gasto.fecha)} · ${metodo}</span>
          <strong>${formatoMoneda.format(Number(gasto.monto) || 0)}</strong>
        </div>`;
    }).join('');
    const porcentaje = totalCategoria > 0 ? (mes.monto / totalCategoria) * 100 : 0;
    return `
      <div class="category-month-item">
        <button type="button" class="category-month-button" data-month="${mes.clave}" aria-expanded="${abierto}" aria-controls="${detalleId}">
          <span class="category-month-copy">
            <strong>${nombreDelMes(mes)}</strong>
            <span>${textoCantidad}</span>
          </span>
          <span class="category-month-value">
            <strong>${formatoMoneda.format(mes.monto)}</strong>
            <span class="category-chevron" aria-hidden="true">⌄</span>
          </span>
          <span class="category-month-track" aria-hidden="true"><span style="width:${porcentaje}%;background:${categoria.color}"></span></span>
        </button>
        <div id="${detalleId}" class="category-month-detail" ${abierto ? '' : 'hidden'}>
          ${operaciones}
        </div>
      </div>`;
  }).join('');

  return `
    <div id="detalle-categoria-${categoriaId}" class="category-drilldown">
      <p>${categoria.nombre} por mes</p>
      <div class="category-month-list">${contenido}</div>
    </div>`;
}

function crearMovimiento(gasto) {
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
}

function renderizarMovimientos(lista) {
  const contenedor = document.getElementById('movimientos-lista');
  const vacio = document.getElementById('movimientos-vacio');
  document.getElementById('movimientos-cantidad').textContent = lista.length;

  vacio.hidden = lista.length > 0;
  contenedor.hidden = lista.length === 0;
  contenedor.classList.toggle('monthly-transaction-list', periodoActivo === 'all');

  if (periodoActivo !== 'all') {
    contenedor.innerHTML = lista.map(crearMovimiento).join('');
    return;
  }

  const meses = agruparMovimientosPorMes(lista);
  if (mesMovimientosTotalAbierto !== null && !meses.some((mes) => mes.clave === mesMovimientosTotalAbierto)) {
    mesMovimientosTotalAbierto = null;
  }
  contenedor.innerHTML = meses.map((mes) => {
    const abierto = mesMovimientosTotalAbierto === mes.clave;
    const cantidad = mes.movimientos.length;
    const textoCantidad = cantidad === 1 ? '1 operación' : `${cantidad} operaciones`;
    const detalleId = `movimientos-mes-${mes.clave}`;
    return `
      <div class="movement-month-item">
        <button type="button" class="movement-month-button" data-month="${mes.clave}" aria-expanded="${abierto}" aria-controls="${detalleId}">
          <span>
            <strong>${nombreDelMes(mes)}</strong>
            <small>${textoCantidad}</small>
          </span>
          <span class="movement-month-value">
            <strong>${formatoMoneda.format(mes.monto)}</strong>
            <span class="movement-month-chevron" aria-hidden="true">⌄</span>
          </span>
        </button>
        <div id="${detalleId}" class="movement-month-detail" ${abierto ? '' : 'hidden'}>
          ${mes.movimientos.map(crearMovimiento).join('')}
        </div>
      </div>`;
  }).join('');

  contenedor.querySelectorAll('.movement-month-button').forEach((boton) => {
    boton.addEventListener('click', () => {
      mesMovimientosTotalAbierto = mesMovimientosTotalAbierto === boton.dataset.month ? null : boton.dataset.month;
      renderizarMovimientos(lista);
    });
  });
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
    dias.push({ fecha, total, cantidad: movimientos.length, movimientos });
  }

  const maximo = Math.max(...dias.map((dia) => dia.total), 0);
  contenedor.innerHTML = dias.map((dia) => {
    const clave = claveFecha(dia.fecha);
    const nombre = dia.fecha.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '');
    const numero = dia.fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const porcentaje = maximo > 0 ? (dia.total / maximo) * 100 : 0;
    const movimientos = dia.cantidad === 1 ? '1 movimiento' : `${dia.cantidad} movimientos`;
    const abierto = diaSemanaAbierto === clave;
    const detalle = dia.movimientos.length
      ? dia.movimientos.map((gasto) => {
        const categoria = categoriaDe(gasto.categoria_id);
        const concepto = escapeHTML(gasto.concepto || categoria.nombre);
        const metodo = escapeHTML(gasto.metodo_pago || 'Sin método');
        const fecha = new Date(gasto.fecha);
        const hora = Number.isNaN(fecha.getTime())
          ? 'Sin hora'
          : fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="week-detail-row">
            <span><strong>${concepto}</strong>${categoria.nombre} · ${metodo} · ${hora}</span>
            <strong>${formatoMoneda.format(Number(gasto.monto) || 0)}</strong>
          </div>`;
      }).join('')
      : '<p class="week-detail-empty">No registraste gastos este día.</p>';
    return `
      <div class="week-day-item">
        <button type="button" class="week-day" data-day="${clave}" aria-expanded="${abierto}" aria-controls="detalle-${clave}">
          <span class="week-day-label">
            <strong>${nombre}</strong>
            <span>${numero}</span>
          </span>
          <span class="week-day-track" aria-label="${nombre}: ${formatoMoneda.format(dia.total)}">
            <span style="width:${porcentaje}%"></span>
          </span>
          <span class="week-day-value">
            <strong>${formatoMoneda.format(dia.total)}</strong>
            <span>${movimientos}</span>
          </span>
          <span class="week-chevron" aria-hidden="true">⌄</span>
        </button>
        <div id="detalle-${clave}" class="week-day-detail" ${abierto ? '' : 'hidden'}>
          ${detalle}
        </div>
      </div>`;
  }).join('');

  contenedor.querySelectorAll('.week-day').forEach((boton) => {
    boton.addEventListener('click', () => {
      diaSemanaAbierto = diaSemanaAbierto === boton.dataset.day ? null : boton.dataset.day;
      renderizarSemana();
    });
  });
}

function crearFilaDistribucion({ titulo, subtitulo, monto, cantidad, porcentaje }) {
  const movimientos = cantidad === 1 ? '1 movimiento' : `${cantidad} movimientos`;
  return `
    <div class="period-breakdown-item">
      <div class="period-breakdown-row">
        <span class="period-breakdown-label">
          <strong>${titulo}</strong>
          <span>${subtitulo} · ${movimientos}</span>
        </span>
        <strong>${formatoMoneda.format(monto)}</strong>
      </div>
      <div class="period-breakdown-track" aria-label="${titulo}: ${formatoMoneda.format(monto)}">
        <span style="width:${porcentaje}%"></span>
      </div>
    </div>`;
}

function renderizarSemanasDelMes() {
  const seccion = document.getElementById('desglose-mes-semanal');
  const contenedor = document.getElementById('mes-semanal-lista');
  const visible = periodoActivo === 'month';
  seccion.hidden = !visible;
  if (!visible) return;

  const movimientosMes = gastosDelPeriodo();
  const totalMes = movimientosMes.reduce((suma, gasto) => suma + (Number(gasto.monto) || 0), 0);
  const ultimoDia = new Date(mesResumen.getFullYear(), mesResumen.getMonth() + 1, 0).getDate();
  const semanas = [];

  for (let primerDia = 1, numero = 1; primerDia <= ultimoDia; primerDia += 7, numero += 1) {
    const diaFinal = Math.min(primerDia + 6, ultimoDia);
    const inicio = new Date(mesResumen.getFullYear(), mesResumen.getMonth(), primerDia);
    const fin = new Date(mesResumen.getFullYear(), mesResumen.getMonth(), diaFinal + 1);
    const movimientos = movimientosMes.filter((gasto) => {
      const fecha = new Date(gasto.fecha);
      return !Number.isNaN(fecha.getTime()) && fecha >= inicio && fecha < fin;
    });
    const monto = movimientos.reduce((suma, gasto) => suma + (Number(gasto.monto) || 0), 0);
    const mes = inicio.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
    semanas.push({
      titulo: diaFinal - primerDia < 6 ? `Semana del ${primerDia} al ${diaFinal}` : `Semana ${numero}`,
      subtitulo: `${primerDia} al ${diaFinal} de ${mes}`,
      monto,
      cantidad: movimientos.length,
    });
  }

  contenedor.innerHTML = semanas.map((semana) => crearFilaDistribucion({
    ...semana,
    porcentaje: totalMes > 0 ? (semana.monto / totalMes) * 100 : 0,
  })).join('');
}

function renderizarMesesDelTotal() {
  const seccion = document.getElementById('desglose-mensual');
  const contenedor = document.getElementById('mensual-lista');
  const vacio = document.getElementById('mensual-vacio');
  const visible = periodoActivo === 'all';
  seccion.hidden = !visible;
  if (!visible) return;

  const acumulado = new Map();
  gastos.forEach((gasto) => {
    const fecha = new Date(gasto.fecha);
    if (Number.isNaN(fecha.getTime())) return;
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const mes = acumulado.get(clave) || { fecha: new Date(fecha.getFullYear(), fecha.getMonth(), 1), monto: 0, cantidad: 0 };
    mes.monto += Number(gasto.monto) || 0;
    mes.cantidad += 1;
    acumulado.set(clave, mes);
  });

  const meses = [...acumulado.values()].sort((a, b) => b.fecha - a.fecha);
  const total = meses.reduce((suma, mes) => suma + mes.monto, 0);
  vacio.hidden = meses.length > 0;
  contenedor.hidden = meses.length === 0;
  contenedor.innerHTML = meses.map((mes) => crearFilaDistribucion({
    titulo: mes.fecha.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    subtitulo: total > 0 ? `${Math.round((mes.monto / total) * 100)}% del total` : '0% del total',
    monto: mes.monto,
    cantidad: mes.cantidad,
    porcentaje: total > 0 ? (mes.monto / total) * 100 : 0,
  })).join('');
}

function gastosDelMesGrafico() {
  const inicio = new Date(mesGrafico.getFullYear(), mesGrafico.getMonth(), 1);
  const finDelMes = new Date(mesGrafico.getFullYear(), mesGrafico.getMonth() + 1, 1);
  const hoy = inicioDelDia();
  const esMesActual = inicio.getFullYear() === hoy.getFullYear() && inicio.getMonth() === hoy.getMonth();
  const fin = esMesActual ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1) : finDelMes;
  return gastos.filter((gasto) => {
    const fecha = new Date(gasto.fecha);
    return !Number.isNaN(fecha.getTime()) && fecha >= inicio && fecha < fin;
  });
}

function diasDelMesGrafico() {
  const hoy = inicioDelDia();
  const inicio = new Date(mesGrafico.getFullYear(), mesGrafico.getMonth(), 1);
  const esMesActual = inicio.getFullYear() === hoy.getFullYear() && inicio.getMonth() === hoy.getMonth();
  const ultimo = esMesActual
    ? hoy
    : new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  const dias = [];

  for (let cursor = new Date(inicio); cursor <= ultimo; cursor.setDate(cursor.getDate() + 1)) {
    dias.push({
      fecha: new Date(cursor),
      categorias: new Map(),
      total: 0,
      cantidad: 0,
      movimientos: [],
    });
  }

  const porFecha = new Map(dias.map((dia) => [claveFecha(dia.fecha), dia]));
  gastosDelMesGrafico().forEach((gasto) => {
    const fecha = new Date(gasto.fecha);
    if (Number.isNaN(fecha.getTime())) return;
    const dia = porFecha.get(claveFecha(fecha));
    if (!dia) return;

    const categoriaId = Number(gasto.categoria_id) || 6;
    const monto = Number(gasto.monto) || 0;
    dia.categorias.set(categoriaId, (dia.categorias.get(categoriaId) || 0) + monto);
    dia.total += monto;
    dia.cantidad += 1;
    dia.movimientos.push(gasto);
  });

  return dias;
}

function monedaCompacta(valor) {
  if (valor >= 1000) return `S/ ${(valor / 1000).toFixed(valor >= 10000 ? 0 : 1)}k`;
  return `S/ ${Math.round(valor)}`;
}

function renderizarAcumulado(dias, total) {
  const contenedor = document.getElementById('grafico-acumulado');
  const vacio = document.getElementById('acumulado-vacio');
  document.getElementById('acumulado-total').textContent = formatoMoneda.format(total);
  contenedor.hidden = total === 0;
  vacio.hidden = total > 0;

  if (total === 0) {
    contenedor.innerHTML = '';
    return;
  }

  let acumulado = 0;
  const valores = dias.map((dia) => {
    acumulado += dia.total;
    return acumulado;
  });
  const ancho = 640;
  const alto = 220;
  const izquierda = 48;
  const derecha = 18;
  const arriba = 20;
  const abajo = 34;
  const anchoGrafico = ancho - izquierda - derecha;
  const altoGrafico = alto - arriba - abajo;
  const x = (indice) => izquierda + (valores.length === 1 ? 0 : (indice / (valores.length - 1)) * anchoGrafico);
  const y = (valor) => arriba + altoGrafico - (valor / total) * altoGrafico;
  const puntos = valores.map((valor, indice) => `${x(indice)},${y(valor)}`).join(' ');
  const area = `${izquierda},${arriba + altoGrafico} ${puntos} ${x(valores.length - 1)},${arriba + altoGrafico}`;
  const medio = Math.floor((dias.length - 1) / 2);

  contenedor.innerHTML = `
    <svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-labelledby="acumulado-svg-titulo acumulado-svg-desc">
      <title id="acumulado-svg-titulo">Gasto acumulado del mes</title>
      <desc id="acumulado-svg-desc">El gasto acumulado llegó a ${formatoMoneda.format(total)}.</desc>
      <line class="line-grid" x1="${izquierda}" y1="${arriba}" x2="${ancho - derecha}" y2="${arriba}"></line>
      <line class="line-grid" x1="${izquierda}" y1="${arriba + altoGrafico / 2}" x2="${ancho - derecha}" y2="${arriba + altoGrafico / 2}"></line>
      <line class="line-grid" x1="${izquierda}" y1="${arriba + altoGrafico}" x2="${ancho - derecha}" y2="${arriba + altoGrafico}"></line>
      <polygon class="line-area" points="${area}"></polygon>
      <polyline class="line-path" points="${puntos}"></polyline>
      <circle class="line-end" cx="${x(valores.length - 1)}" cy="${y(total)}" r="5"></circle>
      <text class="line-axis-label" x="${izquierda - 7}" y="${arriba + 4}" text-anchor="end">${monedaCompacta(total)}</text>
      <text class="line-axis-label" x="${izquierda - 7}" y="${arriba + altoGrafico + 4}" text-anchor="end">S/ 0</text>
      <text class="line-axis-label" x="${izquierda}" y="${alto - 8}" text-anchor="middle">1</text>
      <text class="line-axis-label" x="${x(medio)}" y="${alto - 8}" text-anchor="middle">${dias[medio].fecha.getDate()}</text>
      <text class="line-axis-label" x="${x(dias.length - 1)}" y="${alto - 8}" text-anchor="middle">${dias[dias.length - 1].fecha.getDate()}</text>
    </svg>`;
}

function renderizarMetodos(movimientos, total) {
  const contenedor = document.getElementById('metodos-lista');
  const vacio = document.getElementById('metodos-vacio');
  const acumulado = new Map();

  movimientos.forEach((gasto) => {
    const metodo = String(gasto.metodo_pago || 'Sin método').trim() || 'Sin método';
    acumulado.set(metodo, (acumulado.get(metodo) || 0) + (Number(gasto.monto) || 0));
  });

  const metodos = [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  vacio.hidden = metodos.length > 0;
  contenedor.hidden = metodos.length === 0;
  contenedor.innerHTML = metodos.map(([metodo, monto]) => {
    const porcentaje = total > 0 ? (monto / total) * 100 : 0;
    return `
      <div class="payment-row">
        <div class="payment-label">
          <strong>${escapeHTML(metodo)}</strong>
          <span>${formatoMoneda.format(monto)} · ${Math.round(porcentaje)}%</span>
        </div>
        <div class="payment-track" aria-label="${escapeHTML(metodo)}: ${Math.round(porcentaje)}%">
          <span style="width:${porcentaje}%"></span>
        </div>
      </div>`;
  }).join('');
}

function renderizarDetalleDiaGrafico(dia) {
  const detalle = document.getElementById('grafico-dia-detalle');
  const lista = document.getElementById('grafico-dia-lista');

  if (!dia) {
    detalle.hidden = true;
    lista.innerHTML = '';
    return;
  }

  detalle.hidden = false;
  document.getElementById('grafico-dia-titulo').textContent = dia.fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  document.getElementById('grafico-dia-total').textContent = formatoMoneda.format(dia.total);

  if (!dia.movimientos.length) {
    lista.innerHTML = '<p class="chart-day-empty">No registraste gastos este día.</p>';
    return;
  }

  lista.innerHTML = dia.movimientos.map((gasto) => {
    const categoria = categoriaDe(gasto.categoria_id);
    const concepto = escapeHTML(gasto.concepto || categoria.nombre);
    const metodo = escapeHTML(gasto.metodo_pago || 'Sin método');
    const fecha = new Date(gasto.fecha);
    const hora = Number.isNaN(fecha.getTime())
      ? 'Sin hora'
      : fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `
      <article class="transaction-item">
        <span class="transaction-icon" style="color:${categoria.color};background:${categoria.fondo}" aria-hidden="true">${categoria.nombre.charAt(0)}</span>
        <div class="transaction-info">
          <strong>${concepto}</strong>
          <span>${categoria.nombre} · ${metodo} · ${hora}</span>
        </div>
        <strong class="transaction-amount">− ${formatoMoneda.format(Number(gasto.monto) || 0)}</strong>
      </article>`;
  }).join('');
}

function renderizarGraficos() {
  const dias = diasDelMesGrafico();
  const movimientosMes = gastosDelMesGrafico();
  const total = dias.reduce((suma, dia) => suma + dia.total, 0);
  const diasConGastos = dias.filter((dia) => dia.cantidad > 0).length;
  const promedioDiario = total / dias.length;
  const maximo = Math.max(...dias.map((dia) => dia.total), 0);
  const categoriasUsadas = new Set();

  dias.forEach((dia) => dia.categorias.forEach((_, id) => categoriasUsadas.add(id)));

  const hoy = inicioDelDia();
  const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const esMesActual = mesGrafico.getTime() === inicioMesActual.getTime();
  document.getElementById('mes-grafico-label').textContent = mesGrafico.toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  });
  btnMesSiguiente.disabled = esMesActual;
  document.getElementById('grafico-total').textContent = formatoMoneda.format(total);
  document.getElementById('grafico-dias').textContent = `${diasConGastos} de ${dias.length}`;
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

  grafico.innerHTML = dias.map((dia) => {
    const clave = claveFecha(dia.fecha);
    const altoTotal = maximo > 0 ? (dia.total / maximo) * 82 : 0;
    const segmentos = [...dia.categorias.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, monto]) => {
        const categoria = categoriaDe(id);
        const alto = maximo > 0 ? (monto / maximo) * 82 : 0;
        return `<span class="stacked-segment" style="height:${alto}%;background:${categoria.color}" title="${categoria.nombre}: ${formatoMoneda.format(monto)}"></span>`;
      }).join('');
    const etiqueta = dia.fecha.getDate();
    const fechaCompleta = dia.fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const totalEtiqueta = dia.total > 0 ? `<span class="bar-total">${Math.round(dia.total)}</span>` : '';
    const esHoy = clave === claveFecha(hoy) ? ' today' : '';
    const seleccionado = clave === diaGraficoSeleccionado ? ' selected' : '';
    return `
      <button type="button" class="chart-column${esHoy}${seleccionado}" data-day="${clave}" style="--bar-height:${altoTotal}%" aria-label="${fechaCompleta}: ${formatoMoneda.format(dia.total)}, ${dia.cantidad} movimientos" aria-pressed="${Boolean(seleccionado)}">
        <span class="stacked-bar">
          ${segmentos}
          ${totalEtiqueta}
        </span>
        <span class="bar-label">${etiqueta}</span>
      </button>`;
  }).join('');

  grafico.querySelectorAll('.chart-column').forEach((boton) => {
    boton.addEventListener('click', () => {
      diaGraficoSeleccionado = boton.dataset.day;
      grafico.querySelectorAll('.chart-column').forEach((columna) => {
        const seleccionado = columna === boton;
        columna.classList.toggle('selected', seleccionado);
        columna.setAttribute('aria-pressed', String(seleccionado));
      });
      renderizarDetalleDiaGrafico(dias.find((dia) => claveFecha(dia.fecha) === diaGraficoSeleccionado));
    });
  });

  if (!sinDatos) {
    requestAnimationFrame(() => { scroll.scrollLeft = 0; });
  }

  const diaSeleccionado = dias.find((dia) => claveFecha(dia.fecha) === diaGraficoSeleccionado);
  renderizarDetalleDiaGrafico(sinDatos ? null : diaSeleccionado);

  renderizarAcumulado(dias, total);
  renderizarMetodos(movimientosMes, total);
}

function renderizarResumen() {
  const lista = gastosDelPeriodo();
  const total = lista.reduce((suma, gasto) => suma + (Number(gasto.monto) || 0), 0);
  const indicadorGasolina = document.getElementById('gasolina-indicador');
  const resumenGasolina = periodoActivo === 'today' ? resumenTanquesLlenos() : null;
  const hoy = new Date();
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const esVistaMensual = periodoActivo === 'month';
  const esVistaSemanal = periodoActivo === 'week';

  resumenSemanaNavegacion.hidden = !esVistaSemanal;
  resumenMesNavegacion.hidden = !esVistaMensual;
  if (esVistaSemanal) {
    const inicioSemanaActual = inicioDeSemana(hoy);
    const finSemana = new Date(semanaResumen);
    finSemana.setDate(finSemana.getDate() + 6);
    const desde = semanaResumen.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const hasta = finSemana.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('resumen-semana-label').textContent = `${desde} – ${hasta}`;
    btnResumenSemanaSiguiente.disabled = semanaResumen.getTime() === inicioSemanaActual.getTime();
  }
  if (esVistaMensual) {
    document.getElementById('resumen-mes-label').textContent = mesResumen.toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric',
    });
    btnResumenMesSiguiente.disabled = mesResumen.getTime() === mesActual.getTime();
  }

  document.getElementById('periodo-label').textContent = esVistaMensual
    ? 'Gastado en el mes'
    : esVistaSemanal
      ? 'Gastado en la semana'
      : PERIODOS[periodoActivo];
  document.getElementById('periodo-fechas').textContent = etiquetaFechas();
  document.getElementById('gasto-total').textContent = formatoMoneda.format(total);
  document.getElementById('gasto-movimientos').textContent = lista.length;
  indicadorGasolina.hidden = !resumenGasolina;
  if (resumenGasolina) {
    document.getElementById('gasolina-intervalo').textContent = resumenGasolina.intervalo;
    document.getElementById('gasolina-desde').textContent = resumenGasolina.desdeUltima;
  }

  renderizarCategorias(lista, total);
  renderizarSemana();
  renderizarSemanasDelMes();
  renderizarMesesDelTotal();
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
btnMesAnterior.addEventListener('click', () => {
  mesGrafico = new Date(mesGrafico.getFullYear(), mesGrafico.getMonth() - 1, 1);
  diaGraficoSeleccionado = null;
  renderizarGraficos();
});
btnMesSiguiente.addEventListener('click', () => {
  const siguiente = new Date(mesGrafico.getFullYear(), mesGrafico.getMonth() + 1, 1);
  const hoy = new Date();
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  if (siguiente <= mesActual) {
    mesGrafico = siguiente;
    diaGraficoSeleccionado = null;
    renderizarGraficos();
  }
});
btnResumenMesAnterior.addEventListener('click', () => {
  mesResumen = new Date(mesResumen.getFullYear(), mesResumen.getMonth() - 1, 1);
  renderizarResumen();
});
btnResumenMesSiguiente.addEventListener('click', () => {
  const siguiente = new Date(mesResumen.getFullYear(), mesResumen.getMonth() + 1, 1);
  const hoy = new Date();
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  if (siguiente <= mesActual) {
    mesResumen = siguiente;
    renderizarResumen();
  }
});
btnResumenSemanaAnterior.addEventListener('click', () => {
  semanaResumen = new Date(semanaResumen.getFullYear(), semanaResumen.getMonth(), semanaResumen.getDate() - 7);
  diaSemanaAbierto = null;
  renderizarResumen();
});
btnResumenSemanaSiguiente.addEventListener('click', () => {
  const siguiente = new Date(semanaResumen.getFullYear(), semanaResumen.getMonth(), semanaResumen.getDate() + 7);
  const semanaActual = inicioDeSemana(new Date());
  if (siguiente <= semanaActual) {
    semanaResumen = siguiente;
    diaSemanaAbierto = null;
    renderizarResumen();
  }
});
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
    if (tabla === 'gastos_david') {
      gastosCargados = false;
      try {
        await cargarGastos();
      } catch (errorSincronizacion) {
        console.error(errorSincronizacion);
        gastosCargados = false;
      }
    }
  } catch (error) {
    console.error(error);
    mostrarMensaje('No se pudo guardar. Intenta de nuevo.', 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar registro';
  }
});

inicializarAuth();
