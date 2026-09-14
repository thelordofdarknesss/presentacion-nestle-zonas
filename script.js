let datos = [];
let ordenCol = 'PNV_2025_CLP';
let ordenAsc = false;

const elCentro = document.getElementById('f-centro');
const elRegion = document.getElementById('f-region');
const elCiudad = document.getElementById('f-ciudad');
const elCanal = document.getElementById('f-canal');
const elBuscar = document.getElementById('f-buscar');
const elCuerpo = document.getElementById('cuerpo-tabla');
const elContador = document.getElementById('contador');

function formatoNumero(n) {
  return Math.round(Number(n) || 0).toLocaleString('es-CL');
}

function pintarKPIs(kpis) {
  if (!kpis) return;
  document.getElementById('kpi-clientes').textContent = kpis.clientes_unicos || '—';
  document.getElementById('kpi-centros').textContent = kpis.centros || '—';
  document.getElementById('kpi-regiones').textContent = kpis.regiones || '—';
  document.getElementById('kpi-pnv').textContent = '$' + formatoNumero(kpis.pnv_total);
}

function pintarBarras(contenedorId, filas, columnaEtiqueta, columnaValor) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || !Array.isArray(filas) || filas.length === 0) return;

  const maximo = Math.max(...filas.map(f => Number(f[columnaValor]) || 0));
  contenedor.innerHTML = filas.map(f => {
    const val = Number(f[columnaValor]) || 0;
    const anchoPct = maximo ? Math.round((val / maximo) * 1000) / 10 : 0;
    return `
      <div class="barra-fila">
        <span class="barra-etiqueta">${f[columnaEtiqueta] || '—'}</span>
        <div class="barra-pista">
          <div class="barra-valor" style="width:${anchoPct}%"></div>
        </div>
        <span class="barra-numero">${formatoNumero(val)}</span>
      </div>`;
  }).join('');
}

// Protección con Array.isArray para evitar fallas por undefined
function poblarSelect(elSelect, opciones) {
  if (!elSelect || !Array.isArray(opciones)) return;
  opciones.forEach(op => {
    const option = document.createElement('option');
    option.value = op;
    option.textContent = op;
    elSelect.appendChild(option);
  });
}

function render() {
  const busqueda = (elBuscar ? elBuscar.value : '').toLowerCase().trim();

  let filas = datos.filter(f =>
    (!elCentro || !elCentro.value || f.Centro_Origen === elCentro.value) &&
    (!elRegion || !elRegion.value || f.Region_Zona === elRegion.value) &&
    (!elCiudad || !elCiudad.value || f.Ciudad === elCiudad.value) &&
    (!elCanal || !elCanal.value || f.Canal_L4 === elCanal.value) &&
    (!busqueda ||
      (f.Cliente && f.Cliente.toLowerCase().includes(busqueda)) ||
      (f.Canal_L4 && f.Canal_L4.toLowerCase().includes(busqueda)) ||
      (f.Ciudad && f.Ciudad.toLowerCase().includes(busqueda)))
  );

  filas.sort((a, b) => {
    let va = a[ordenCol] ?? '', vb = b[ordenCol] ?? '';
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return ordenAsc ? -1 : 1;
    if (va > vb) return ordenAsc ? 1 : -1;
    return 0;
  });

  elContador.textContent = `${filas.length} de ${datos.length} registros`;
  elCuerpo.innerHTML = filas.map(f => `
    <tr>
      <td>${f.Centro_Origen || '—'}</td>
      <td>${f.Region_Zona || '—'}</td>
      <td>${f.Ciudad || '—'}</td>
      <td>${f.Canal_L4 || '—'}</td>
      <td>${f.Cliente || '—'}</td>
      <td class="num">${f.Meses_Con_Venta || 0}</td>
      <td class="num">${formatoNumero(f.Cajas_2025)}</td>
      <td class="num">${formatoNumero(f.PNV_2025_CLP)}</td>
    </tr>`).join('');
}

function iniciarEventos() {
  [elCentro, elRegion, elCiudad, elCanal].forEach(el => {
    if (el) el.addEventListener('change', render);
  });
  if (elBuscar) elBuscar.addEventListener('input', render);

  document.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (ordenCol === col) { ordenAsc = !ordenAsc; }
      else { ordenCol = col; ordenAsc = true; }
      render();
    });
  });
}

fetch('datos_dashboard.json')
  .then(resp => {
    if (!resp.ok) throw new Error(`No se pudo cargar datos_dashboard.json (HTTP ${resp.status})`);
    return resp.json();
  })
  .then(payload => {
    datos = Array.isArray(payload.tabla) ? payload.tabla : [];

    pintarKPIs(payload.kpis);
    pintarBarras('barras-region', payload.por_region, 'Region_Zona', 'Cantidad_Clientes');
    pintarBarras('barras-centro', payload.por_centro, 'Centro_Origen', 'Cantidad_Clientes');

    if (payload.opciones) {
      poblarSelect(elCentro, payload.opciones.centros);
      poblarSelect(elRegion, payload.opciones.regiones);
      poblarSelect(elCiudad, payload.opciones.ciudades);
      poblarSelect(elCanal, payload.opciones.canales);
    }

    iniciarEventos();
    render();
  })
  .catch(err => {
    elContador.textContent = 'Error cargando datos: ' + err.message;
    console.error(err);
  });
