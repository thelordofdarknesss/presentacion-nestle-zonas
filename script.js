// ============================================================
// DASHBOARD CLIENTES HELADOS — NESTLÉ CHILE
// Script principal
// ============================================================

let datos = [];
let datosMensuales = [];

let ordenCol = 'PNV_2025_CLP';
let ordenAsc = false;

let paginaActual = 1;
const FILAS_POR_PAGINA = 15;


// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const elCentro = document.getElementById('f-centro');
const elRegion = document.getElementById('f-region');
const elCiudad = document.getElementById('f-ciudad');
const elCanal = document.getElementById('f-canal');
const elBuscar = document.getElementById('f-buscar');

const elCuerpo = document.getElementById('cuerpo-tabla');
const elContador = document.getElementById('contador');

const elPageInfo = document.getElementById('page-info');
const elPrevPage = document.getElementById('prev-page');
const elNextPage = document.getElementById('next-page');

const elFilterCount = document.getElementById('filter-count');

const elTooltip = document.getElementById('tooltip');

const elInsightRegion = document.getElementById('insight-region');
const elInsightRegionDetail = document.getElementById('insight-region-detail');

const elInsightCentro = document.getElementById('insight-centro');
const elInsightCentroDetail = document.getElementById('insight-centro-detail');

const elInsightMonth = document.getElementById('insight-month');
const elInsightMonthDetail = document.getElementById('insight-month-detail');

const elChartMonthly = document.getElementById('chart-monthly');
const elTopClientes = document.getElementById('top-clientes');

const elReset = document.getElementById('btn-reset');
const elPdf = document.getElementById('btn-pdf');


// ============================================================
// FORMATEADORES
// ============================================================

function formatoNumero(numero) {
  return Math.round(Number(numero) || 0)
    .toLocaleString('es-CL');
}


function formatoCompacto(numero) {
  const n = Number(numero) || 0;

  if (Math.abs(n) >= 1000000000) {
    return (
      (n / 1000000000)
        .toFixed(1)
        .replace('.', ',') + ' MM'
    );
  }

  if (Math.abs(n) >= 1000000) {
    return (
      (n / 1000000)
        .toFixed(1)
        .replace('.', ',') + ' M'
    );
  }

  if (Math.abs(n) >= 1000) {
    return (
      (n / 1000)
        .toFixed(1)
        .replace('.', ',') + ' K'
    );
  }

  return formatoNumero(n);
}


function formatoCLP(numero) {
  return '$' + formatoNumero(numero);
}


function escaparHTML(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ============================================================
// CIUDAD
// ============================================================

function extraerCiudad(regionZona) {

  if (!regionZona) {
    return '—';
  }

  const valor = String(regionZona).trim();

  if (valor.includes(' - ')) {
    return valor.split(' - ')[1].trim();
  }

  if (valor.includes('-')) {
    return valor.split('-')[1].trim();
  }

  return valor;
}


// ============================================================
// ANIMACIÓN DE KPIs
// ============================================================

function animarNumero(elemento, valor, duracion = 900) {

  if (!elemento) {
    return;
  }

  const destino = Number(valor) || 0;
  const inicio = 0;

  const tiempoInicio = performance.now();

  function actualizar(tiempoActual) {

    const progreso = Math.min(
      (tiempoActual - tiempoInicio) / duracion,
      1
    );

    const suavizado =
      1 - Math.pow(1 - progreso, 3);

    const actual =
      inicio +
      (destino - inicio) *
      suavizado;

    elemento.textContent =
      Math.round(actual).toLocaleString('es-CL');

    if (progreso < 1) {
      requestAnimationFrame(actualizar);
    }
  }

  requestAnimationFrame(actualizar);
}


// ============================================================
// KPIs
// ============================================================

function pintarKPIs(kpis) {

  if (!kpis) {
    return;
  }

  const clientes =
    document.getElementById('kpi-clientes');

  const centros =
    document.getElementById('kpi-centros');

  const regiones =
    document.getElementById('kpi-regiones');

  const pnv =
    document.getElementById('kpi-pnv');


  animarNumero(
    clientes,
    kpis.clientes_unicos
  );


  animarNumero(
    centros,
    kpis.centros
  );


  animarNumero(
    regiones,
    kpis.regiones
  );


  if (pnv) {

    const destino =
      Number(kpis.pnv_total) || 0;

    const inicio =
      performance.now();

    function animarPNV(tiempo) {

      const progreso =
        Math.min(
          (tiempo - inicio) / 1000,
          1
        );

      const suavizado =
        1 - Math.pow(1 - progreso, 3);

      const actual =
        destino * suavizado;

      pnv.textContent =
        formatoCLP(actual);

      if (progreso < 1) {
        requestAnimationFrame(animarPNV);
      }
    }

    requestAnimationFrame(animarPNV);
  }
}


// ============================================================
// BARRAS
// ============================================================

function pintarBarras(
  contenedorId,
  filas,
  columnaEtiqueta,
  columnaValor
) {

  const contenedor =
    document.getElementById(contenedorId);

  if (
    !contenedor ||
    !Array.isArray(filas) ||
    filas.length === 0
  ) {
    return;
  }


  const maximo =
    Math.max(
      ...filas.map(
        f => Number(f[columnaValor]) || 0
      )
    );


  contenedor.innerHTML =
    filas.map(f => {

      const val =
        Number(f[columnaValor]) || 0;

      const anchoPct =
        maximo
          ? Math.round(
              (val / maximo) * 1000
            ) / 10
          : 0;

      const etiqueta =
        escaparHTML(
          f[columnaEtiqueta] || '—'
        );


      return `
        <div
          class="barra-fila barra-interactiva"
          data-valor="${etiqueta}"
          title="Haz clic para filtrar"
        >

          <span class="barra-etiqueta">
            ${etiqueta}
          </span>

          <div class="barra-pista">

            <div
              class="barra-valor"
              style="width:${anchoPct}%"
            ></div>

          </div>

          <span class="barra-numero">
            ${formatoNumero(val)}
          </span>

        </div>
      `;

    }).join('');


  // ==========================================================
  // CLICK EN BARRAS
  // ==========================================================

  const barras =
    contenedor.querySelectorAll(
      '.barra-interactiva'
    );


  barras.forEach(barra => {

    barra.addEventListener(
      'click',
      () => {

        const valor =
          barra.dataset.valor;

        if (contenedorId === 'barras-region') {

          if (elRegion) {
            elRegion.value = valor;
          }

        }


        if (contenedorId === 'barras-centro') {

          if (elCentro) {
            elCentro.value = valor;
          }

        }

        paginaActual = 1;

        render();

      }
    );

  });
}


// ============================================================
// SELECTS
// ============================================================

function poblarSelect(
  elSelect,
  opciones
) {

  if (
    !elSelect ||
    !Array.isArray(opciones)
  ) {
    return;
  }


  opciones.forEach(op => {

    const option =
      document.createElement('option');

    option.value = op;
    option.textContent = op;

    elSelect.appendChild(option);

  });
}


// ============================================================
// FILTRADO
// ============================================================

function obtenerFilasFiltradas() {

  const busqueda =
    (
      elBuscar
        ? elBuscar.value
        : ''
    )
      .toLowerCase()
      .trim();


  let filas =
    datos.filter(f => {

      const coincideCentro =
        !elCentro ||
        !elCentro.value ||
        f.Centro_Origen ===
          elCentro.value;


      const coincideRegion =
        !elRegion ||
        !elRegion.value ||
        f.Region_Zona ===
          elRegion.value;


      const coincideCiudad =
        !elCiudad ||
        !elCiudad.value ||
        f.Ciudad ===
          elCiudad.value;


      const coincideCanal =
        !elCanal ||
        !elCanal.value ||
        f.Canal_L4 ===
          elCanal.value;


      const texto =
        [
          f.Cliente,
          f.Canal_L4,
          f.Ciudad,
          f.Region_Zona,
          f.Centro_Origen
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();


      const coincideBusqueda =
        !busqueda ||
        texto.includes(busqueda);


      return (
        coincideCentro &&
        coincideRegion &&
        coincideCiudad &&
        coincideCanal &&
        coincideBusqueda
      );

    });


  // ==========================================================
  // ORDENAMIENTO
  // ==========================================================

  filas.sort((a, b) => {

    let va =
      a[ordenCol] ?? '';

    let vb =
      b[ordenCol] ?? '';


    const numeroA =
      Number(va);

    const numeroB =
      Number(vb);


    if (
      !Number.isNaN(numeroA) &&
      !Number.isNaN(numeroB) &&
      va !== '' &&
      vb !== ''
    ) {

      va = numeroA;
      vb = numeroB;

    } else {

      va =
        String(va).toLowerCase();

      vb =
        String(vb).toLowerCase();

    }


    if (va < vb) {
      return ordenAsc ? -1 : 1;
    }


    if (va > vb) {
      return ordenAsc ? 1 : -1;
    }


    return 0;

  });


  return filas;
}


// ============================================================
// TABLA
// ============================================================

function render() {

  if (!elCuerpo) {
    return;
  }


  const filas =
    obtenerFilasFiltradas();


  const total =
    filas.length;


  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        total / FILAS_POR_PAGINA
      )
    );


  if (paginaActual > totalPaginas) {
    paginaActual = totalPaginas;
  }


  const inicio =
    (paginaActual - 1) *
    FILAS_POR_PAGINA;


  const fin =
    inicio +
    FILAS_POR_PAGINA;


  const filasPagina =
    filas.slice(
      inicio,
      fin
    );


  // ==========================================================
  // CONTADORES
  // ==========================================================

  if (elContador) {

    elContador.textContent =
      `${total.toLocaleString('es-CL')} de ` +
      `${datos.length.toLocaleString('es-CL')} registros`;

  }


  if (elFilterCount) {

    elFilterCount.textContent =
      `${total.toLocaleString('es-CL')} resultados`;

  }


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  if (elPageInfo) {

    elPageInfo.textContent =
      `Página ${paginaActual} de ${totalPaginas}`;

  }


  if (elPrevPage) {

    elPrevPage.disabled =
      paginaActual <= 1;

  }


  if (elNextPage) {

    elNextPage.disabled =
      paginaActual >= totalPaginas;

  }


  // ==========================================================
  // TABLA
  // ==========================================================

  elCuerpo.innerHTML =
    filasPagina.map(f => {

      return `
        <tr>

          <td>
            ${escaparHTML(
              f.Centro_Origen || '—'
            )}
          </td>

          <td>
            ${escaparHTML(
              f.Region_Zona || '—'
            )}
          </td>

          <td>
            ${escaparHTML(
              f.Ciudad || '—'
            )}
          </td>

          <td>
            ${escaparHTML(
              f.Canal_L4 || '—'
            )}
          </td>

          <td>
            ${escaparHTML(
              f.Cliente || '—'
            )}
          </td>

          <td class="num">
            ${formatoNumero(
              f.Meses_Con_Venta
            )}
          </td>

          <td class="num">
            ${formatoNumero(
              f.Cajas_2025
            )}
          </td>

          <td class="num">
            ${formatoCLP(
              f.PNV_2025_CLP
            )}
          </td>

        </tr>
      `;

    }).join('');


  // ==========================================================
  // ACTUALIZAR INFORMACIÓN
  // ==========================================================

  actualizarResumenFiltrado(filas);

}


// ============================================================
// RESUMEN DINÁMICO SEGÚN FILTROS
// ============================================================

function actualizarResumenFiltrado(filas) {

  if (!filas || filas.length === 0) {
    return;
  }


  const pnv =
    filas.reduce(
      (total, fila) =>
        total +
        (Number(fila.PNV_2025_CLP) || 0),
      0
    );


  const cajas =
    filas.reduce(
      (total, fila) =>
        total +
        (Number(fila.Cajas_2025) || 0),
      0
    );


  // Si existen elementos para estos datos
  const filtroPNV =
    document.getElementById(
      'filter-pnv'
    );

  const filtroCajas =
    document.getElementById(
      'filter-cajas'
    );


  if (filtroPNV) {
    filtroPNV.textContent =
      formatoCLP(pnv);
  }


  if (filtroCajas) {
    filtroCajas.textContent =
      formatoNumero(cajas);
  }

}


// ============================================================
// INSIGHTS
// ============================================================

function pintarInsights(
  porRegion,
  porCentro,
  porMes
) {

  // ==========================================================
  // MEJOR REGIÓN
  // ==========================================================

  if (
    elInsightRegion &&
    Array.isArray(porRegion) &&
    porRegion.length > 0
  ) {

    const mejor =
      porRegion[0];

    elInsightRegion.textContent =
      mejor.Region_Zona || '—';


    if (elInsightRegionDetail) {

      elInsightRegionDetail.textContent =
        `${formatoNumero(
          mejor.Cantidad_Clientes
        )} clientes`;

    }

  }


  // ==========================================================
  // MEJOR CENTRO
  // ==========================================================

  if (
    elInsightCentro &&
    Array.isArray(porCentro) &&
    porCentro.length > 0
  ) {

    const mejor =
      porCentro[0];

    elInsightCentro.textContent =
      mejor.Centro_Origen || '—';


    if (elInsightCentroDetail) {

      elInsightCentroDetail.textContent =
        `${formatoNumero(
          mejor.Cantidad_Clientes
        )} clientes`;

    }

  }


  // ==========================================================
  // MEJOR MES
  // ==========================================================

  if (
    elInsightMonth &&
    Array.isArray(porMes) &&
    porMes.length > 0
  ) {

    const mejor =
      [...porMes].sort(
        (a, b) =>
          Number(b.PNV_2025_CLP || 0) -
          Number(a.PNV_2025_CLP || 0)
      )[0];


    elInsightMonth.textContent =
      mejor.Mes || '—';


    if (elInsightMonthDetail) {

      elInsightMonthDetail.textContent =
        formatoCLP(
          mejor.PNV_2025_CLP
        );

    }

  }

}


// ============================================================
// TOP 10 CLIENTES
// ============================================================

function pintarTopClientes() {

  if (!elTopClientes) {
    return;
  }


  const clientes = [
    ...datos
  ]
    .sort(
      (a, b) =>
        Number(b.PNV_2025_CLP || 0) -
        Number(a.PNV_2025_CLP || 0)
    )
    .slice(0, 10);


  if (clientes.length === 0) {

    elTopClientes.innerHTML =
      '<p>No hay datos disponibles.</p>';

    return;
  }


  const maximo =
    Number(
      clientes[0].PNV_2025_CLP
    ) || 1;


  elTopClientes.innerHTML =
    clientes.map(
      (cliente, index) => {

        const pnv =
          Number(
            cliente.PNV_2025_CLP
          ) || 0;


        const porcentaje =
          (
            pnv / maximo
          ) * 100;


        return `
          <div class="top-cliente">

            <div class="top-cliente-cabecera">

              <span class="top-ranking">
                #${index + 1}
              </span>

              <span class="top-nombre">
                ${escaparHTML(
                  cliente.Cliente || '—'
                )}
              </span>

              <span class="top-valor">
                ${formatoCLP(pnv)}
              </span>

            </div>

            <div class="top-pista">

              <div
                class="top-barra"
                style="width:${porcentaje}%"
              ></div>

            </div>

          </div>
        `;

      }
    ).join('');

}


// ============================================================
// GRÁFICO MENSUAL DE PNV
// ============================================================

function pintarGraficoMensual() {

  if (!elChartMonthly) {
    return;
  }


  // ==========================================================
  // VALIDACIÓN
  // ==========================================================

  if (
    !Array.isArray(datosMensuales) ||
    datosMensuales.length === 0
  ) {

    elChartMonthly.innerHTML = `
      <div class="chart-vacio">
        <strong>No hay datos mensuales disponibles.</strong>
        <span>
          Verifica que generar_dashboard.py
          haya generado "por_mes" en el JSON.
        </span>
      </div>
    `;

    return;
  }


  // ==========================================================
  // ORDENAR POR MES
  // ==========================================================

  const meses =
    [...datosMensuales].sort(
      (a, b) =>
        Number(a.Mes_Numero || 0) -
        Number(b.Mes_Numero || 0)
    );


  // ==========================================================
  // DIMENSIONES
  // ==========================================================

  const ancho =
    Math.max(
      700,
      elChartMonthly.clientWidth || 700
    );


  const alto = 320;

  const margenIzq = 65;
  const margenDer = 25;
  const margenSup = 25;
  const margenInf = 55;


  const anchoGrafico =
    ancho -
    margenIzq -
    margenDer;


  const altoGrafico =
    alto -
    margenSup -
    margenInf;


  // ==========================================================
  // VALORES
  // ==========================================================

  const valores =
    meses.map(
      mes =>
        Number(
          mes.PNV_2025_CLP
        ) || 0
    );


  const maximo =
    Math.max(...valores, 1);


  // ==========================================================
  // COORDENADAS
  // ==========================================================

  function x(i) {

    if (meses.length === 1) {
      return margenIzq +
        anchoGrafico / 2;
    }

    return (
      margenIzq +
      (
        i /
        (meses.length - 1)
      ) *
      anchoGrafico
    );

  }


  function y(valor) {

    return (
      margenSup +
      altoGrafico -
      (
        valor /
        maximo
      ) *
      altoGrafico
    );

  }


  // ==========================================================
  // LÍNEA
  // ==========================================================

  const puntos =
    meses.map(
      (mes, i) =>
        `${x(i)},${y(
          Number(
            mes.PNV_2025_CLP
          ) || 0
        )}`
    ).join(' ');


  // ==========================================================
  // GRID
  // ==========================================================

  let grid = '';

  const cantidadLineas = 4;


  for (
    let i = 0;
    i <= cantidadLineas;
    i++
  ) {

    const valor =
      (
        maximo /
        cantidadLineas
      ) * i;


    const posicion =
      y(valor);


    grid += `
      <line
        x1="${margenIzq}"
        y1="${posicion}"
        x2="${ancho - margenDer}"
        y2="${posicion}"
        class="chart-grid"
      />

      <text
        x="${margenIzq - 10}"
        y="${posicion + 4}"
        text-anchor="end"
        class="chart-label"
      >
        ${escaparHTML(
          formatoCompacto(valor)
        )}
      </text>
    `;

  }


  // ==========================================================
  // ETIQUETAS DE MESES
  // ==========================================================

  let etiquetasMeses = '';


  meses.forEach(
    (mes, i) => {

      etiquetasMeses += `
        <text
          x="${x(i)}"
          y="${alto - 18}"
          text-anchor="middle"
          class="chart-label"
        >
          ${escaparHTML(
            String(mes.Mes || '')
              .substring(0, 3)
          )}
        </text>
      `;

    }
  );


  // ==========================================================
  // PUNTOS
  // ==========================================================

  let puntosSVG = '';


  meses.forEach(
    (mes, i) => {

      const valor =
        Number(
          mes.PNV_2025_CLP
        ) || 0;


      puntosSVG += `
        <circle
          cx="${x(i)}"
          cy="${y(valor)}"
          r="5"
          class="chart-punto"
          data-mes="${escaparHTML(
            mes.Mes || ''
          )}"
          data-valor="${valor}"
        ></circle>
      `;

    }
  );


  // ==========================================================
  // SVG
  // ==========================================================

  elChartMonthly.innerHTML = `
    <svg
      class="grafico-mensual-svg"
      viewBox="0 0 ${ancho} ${alto}"
      preserveAspectRatio="none"
    >

      ${grid}

      <polyline
        points="${puntos}"
        class="chart-linea"
        fill="none"
      />

      ${puntosSVG}

      ${etiquetasMeses}

    </svg>

    <div
      class="chart-tooltip"
      id="monthly-tooltip"
    ></div>
  `;


  // ==========================================================
  // TOOLTIP
  // ==========================================================

  const tooltip =
    elChartMonthly.querySelector(
      '#monthly-tooltip'
    );


  const puntosDOM =
    elChartMonthly.querySelectorAll(
      '.chart-punto'
    );


  puntosDOM.forEach(
    punto => {

      punto.addEventListener(
        'mouseenter',
        evento => {

          if (!tooltip) {
            return;
          }


          const mes =
            punto.dataset.mes;


          const valor =
            Number(
              punto.dataset.valor
            ) || 0;


          tooltip.innerHTML = `
            <strong>
              ${escaparHTML(mes)}
            </strong>
            <br>
            PNV 2025:
            <strong>
              ${formatoCLP(valor)}
            </strong>
          `;


          tooltip.style.display =
            'block';


          const rect =
            elChartMonthly
              .getBoundingClientRect();


          const puntoRect =
            punto.getBoundingClientRect();


          tooltip.style.left =
            (
              puntoRect.left -
              rect.left
            ) + 'px';


          tooltip.style.top =
            (
              puntoRect.top -
              rect.top -
              65
            ) + 'px';

        }
      );


      punto.addEventListener(
        'mouseleave',
        () => {

          if (tooltip) {
            tooltip.style.display =
              'none';
          }

        }
      );

    }
  );

}


// ============================================================
// PAGINACIÓN
// ============================================================

function iniciarPaginacion() {

  if (elPrevPage) {

    elPrevPage.addEventListener(
      'click',
      () => {

        if (paginaActual > 1) {

          paginaActual--;

          render();

        }

      }
    );

  }


  if (elNextPage) {

    elNextPage.addEventListener(
      'click',
      () => {

        const totalPaginas =
          Math.max(
            1,
            Math.ceil(
              obtenerFilasFiltradas()
                .length /
              FILAS_POR_PAGINA
            )
          );


        if (
          paginaActual <
          totalPaginas
        ) {

          paginaActual++;

          render();

        }

      }
    );

  }

}


// ============================================================
// EVENTOS DE FILTROS
// ============================================================

function iniciarEventos() {

  [
    elCentro,
    elRegion,
    elCiudad,
    elCanal
  ]
    .filter(Boolean)
    .forEach(
      elemento => {

        elemento.addEventListener(
          'change',
          () => {

            paginaActual = 1;

            render();

          }
        );

      }
    );


  if (elBuscar) {

    elBuscar.addEventListener(
      'input',
      () => {

        paginaActual = 1;

        render();

      }
    );

  }


  // ==========================================================
  // ORDENAMIENTO DE TABLA
  // ==========================================================

  document
    .querySelectorAll(
      'th[data-col]'
    )
    .forEach(
      th => {

        th.addEventListener(
          'click',
          () => {

            const col =
              th.dataset.col;


            if (ordenCol === col) {

              ordenAsc =
                !ordenAsc;

            } else {

              ordenCol =
                col;

              ordenAsc =
                true;

            }


            render();

          }
        );

      }
    );


  // ==========================================================
  // RESET
  // ==========================================================

  if (elReset) {

    elReset.addEventListener(
      'click',
      () => {

        if (elCentro) {
          elCentro.value = '';
        }

        if (elRegion) {
          elRegion.value = '';
        }

        if (elCiudad) {
          elCiudad.value = '';
        }

        if (elCanal) {
          elCanal.value = '';
        }

        if (elBuscar) {
          elBuscar.value = '';
        }


        paginaActual = 1;

        render();

      }
    );

  }


  // ==========================================================
  // PDF
  // ==========================================================

  if (elPdf) {

    elPdf.addEventListener(
      'click',
      () => {

        window.print();

      }
    );

  }


  // ==========================================================
  // ESCAPE = RESET
  // ==========================================================

  document.addEventListener(
    'keydown',
    evento => {

      if (
        evento.key === 'Escape' &&
        elReset
      ) {

        elReset.click();

      }

    }
  );

}


// ============================================================
// CARGAR JSON
// ============================================================

async function cargarDashboard() {

  try {

    const respuesta =
      await fetch(
        'datos_dashboard.json'
      );


    if (!respuesta.ok) {

      throw new Error(
        `No se pudo cargar datos_dashboard.json ` +
        `(HTTP ${respuesta.status})`
      );

    }


    const payload =
      await respuesta.json();


    // ========================================================
    // TABLA
    // ========================================================

    datos =
      Array.isArray(
        payload.tabla
      )
        ? payload.tabla
        : [];


    // ========================================================
    // DATOS MENSUALES
    // ========================================================

    datosMensuales =
      Array.isArray(
        payload.por_mes
      )
        ? payload.por_mes
        : [];


    console.log(
      '[✓] Registros cargados:',
      datos.length
    );


    console.log(
      '[✓] Meses cargados:',
      datosMensuales.length
    );


    // ========================================================
    // CIUDADES
    // ========================================================

    datos.forEach(
      fila => {

        if (!fila.Ciudad) {

          fila.Ciudad =
            extraerCiudad(
              fila.Region_Zona
            );

        }

      }
    );


    // ========================================================
    // KPIs
    // ========================================================

    pintarKPIs(
      payload.kpis
    );


    // ========================================================
    // BARRAS
    // ========================================================

    pintarBarras(
      'barras-region',
      payload.por_region,
      'Region_Zona',
      'Cantidad_Clientes'
    );


    pintarBarras(
      'barras-centro',
      payload.por_centro,
      'Centro_Origen',
      'Cantidad_Clientes'
    );


    // ========================================================
    // INSIGHTS
    // ========================================================

    pintarInsights(
      payload.por_region,
      payload.por_centro,
      payload.por_mes
    );


    // ========================================================
    // TOP CLIENTES
    // ========================================================

    pintarTopClientes();


    // ========================================================
    // GRÁFICO MENSUAL
    // ========================================================

    pintarGraficoMensual();


    // ========================================================
    // FILTROS
    // ========================================================

    if (payload.opciones) {

      poblarSelect(
        elCentro,
        payload.opciones.centros
      );


      poblarSelect(
        elRegion,
        payload.opciones.regiones
      );


      const listaCiudades =
        payload.opciones.ciudades ||
        Array.from(
          new Set(
            datos
              .map(d => d.Ciudad)
              .filter(Boolean)
          )
        ).sort();


      poblarSelect(
        elCiudad,
        listaCiudades
      );


      poblarSelect(
        elCanal,
        payload.opciones.canales
      );

    }


    // ========================================================
    // EVENTOS
    // ========================================================

    iniciarEventos();

    iniciarPaginacion();


    // ========================================================
    // PRIMER RENDER
    // ========================================================

    render();


    console.log(
      '[✓] Dashboard iniciado correctamente.'
    );


  } catch (error) {

    console.error(
      '[ERROR]',
      error
    );


    if (elContador) {

      elContador.textContent =
        'Error cargando datos: ' +
        error.message;

    }


    if (elChartMonthly) {

      elChartMonthly.innerHTML = `
        <div class="chart-vacio">
          <strong>
            No se pudo cargar la evolución mensual.
          </strong>

          <span>
            ${escaparHTML(
              error.message
            )}
          </span>
        </div>
      `;

    }

  }

}


// ============================================================
// INICIAR
// ============================================================

cargarDashboard();
