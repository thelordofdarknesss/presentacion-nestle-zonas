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
  return Math.round(n).toLocaleString('es-CL');
}

function pintarKPIs(kpis) {
  document.getElementById('kpi-clientes').textContent = kpis.clientes_unicos;
  document.getElementById('kpi-centros').textContent = kpis.centros;
  document.getElementById('kpi-regiones').textContent = kpis.regiones;
  document.getElementById('kpi-pnv').textContent = '$' + formatoNumero(kpis.pnv_total);
}

function pintarBarras(contenedorId, filas, columnaEtiqueta, columnaValor) {
  const contenedor = document.getElementById(contenedorId);
  const maximo = Math.max(...filas.map(f => f[columnaValor]));
  contenedor.innerHTML = filas.map(f => {
    const anchoPct = maximo ? Math.round((f[columnaValor] / maximo) * 1000) / 10 : 0;
    return `
      <div class="barra-fila">
        <span class="barra-etiqueta">${f[columnaEtiqueta]}</span>
        <div class="barra-pista">
          <div class="barra-valor" style="width:${anchoPct}%"></div>
        </div>
        <span class="barra-numero">${formatoNumero(f[columnaValor])}</span>
      </div>`;
  }).join('');
}

function poblarSelect(elSelect, opciones) {
  opciones.forEach(op => {
    const option = document.createElement('option');
    option.value = op;
    option.textContent = op;
    elSelect.appendChild(option);
  });
}

function render() {
  const busqueda = elBuscar.value.toLowerCase().trim();

  let filas = datos.filter(f =>
    (!elCentro.value || f.Centro_Origen === elCentro.value) &&
    (!elRegion.value || f.Region_Zona === elRegion.value) &&
    (!elCiudad.value || f.Ciudad === elCiudad.value) &&
    (!elCanal.value || f.Canal_L4 === elCanal.value) &&
    (!busqueda ||
      f.Cliente.toLowerCase().includes(busqueda) ||
      f.Canal_L4.toLowerCase().includes(busqueda) ||
      f.Ciudad.toLowerCase().includes(busqueda))
  );

  filas.sort((a, b) => {
    let va = a[ordenCol], vb = b[ordenCol];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return ordenAsc ? -1 : 1;
    if (va > vb) return ordenAsc ? 1 : -1;
    return 0;
  });

  elContador.textContent = `${filas.length} de ${datos.length} registros`;
  elCuerpo.innerHTML = filas.map(f => `
    <tr>
      <td>${f.Centro_Origen}</td>
      <td>${f.Region_Zona}</td>
      <td>${f.Ciudad}</td>
      <td>${f.Canal_L4}</td>
      <td>${f.Cliente}</td>
      <td class="num">${f.Meses_Con_Venta}</td>
      <td class="num">${formatoNumero(f.Cajas_2025)}</td>
      <td class="num">${formatoNumero(f.PNV_2025_CLP)}</td>
    </tr>`).join('');
}

function iniciarEventos() {
  [elCentro, elRegion, elCiudad, elCanal].forEach(el => el.addEventListener('change', render));
  elBuscar.addEventListener('input', render);

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
    datos = payload.tabla;

    pintarKPIs(payload.kpis);
    pintarBarras('barras-region', payload.por_region, 'Region_Zona', 'Cantidad_Clientes');
    pintarBarras('barras-centro', payload.por_centro, 'Centro_Origen', 'Cantidad_Clientes');

    poblarSelect(elCentro, payload.opciones.centros);
    poblarSelect(elRegion, payload.opciones.regiones);
    poblarSelect(elCiudad, payload.opciones.ciudades);
    poblarSelect(elCanal, payload.opciones.canales);

    iniciarEventos();
    render();
  })
  .catch(err => {
    elContador.textContent = 'Error cargando datos: ' + err.message;
    console.error(err);
  });
