/* =========================================================
   DASHBOARD NESTLÉ CHILE - SCRIPT PRINCIPAL
   ---------------------------------------------------------
   Compatible con:
   - datos_dashboard.json
   - payload.mensual
   - KPI animados
   - Barras animadas
   - Gráfico mensual SVG
   - Tooltips
   - Filtros
   - Búsqueda
   - Ordenamiento
   - Paginación
   - Top clientes
   - Insights
   - Impresión / PDF
   ========================================================= */

"use strict";

/* =========================================================
   VARIABLES GLOBALES
   ========================================================= */

let datos = [];
let datosMensuales = [];

let ordenCol = "PNV_2025_CLP";
let ordenAsc = false;

let paginaActual = 1;
const FILAS_POR_PAGINA = 15;

let filtros = {
    centro: "",
    region: "",
    ciudad: "",
    canal: "",
    buscar: ""
};


/* =========================================================
   UTILIDADES
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function numero(valor) {
    const n = Number(valor);

    if (!Number.isFinite(n)) {
        return 0;
    }

    return n;
}


function formatearNumero(valor) {
    return new Intl.NumberFormat("es-CL").format(numero(valor));
}


function formatearCLP(valor) {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0
    }).format(numero(valor));
}


function formatearDecimal(valor) {
    return new Intl.NumberFormat("es-CL", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    }).format(numero(valor));
}


/* =========================================================
   ANIMACIÓN DE NÚMEROS
   ========================================================= */

function animarNumero(elemento, objetivo, duracion = 1300, formato = "numero") {

    if (!elemento) {
        return;
    }

    const inicio = 0;
    const valorFinal = numero(objetivo);
    const tiempoInicio = performance.now();

    function actualizar(tiempoActual) {

        const progreso = Math.min(
            (tiempoActual - tiempoInicio) / duracion,
            1
        );

        /*
         * Easing suave:
         * empieza rápido y termina lentamente.
         */
        const suavizado = 1 - Math.pow(1 - progreso, 3);

        const valorActual =
            inicio + (valorFinal - inicio) * suavizado;

        if (formato === "clp") {
            elemento.textContent = formatearCLP(valorActual);
        } else if (formato === "decimal") {
            elemento.textContent = formatearDecimal(valorActual);
        } else {
            elemento.textContent = formatearNumero(valorActual);
        }

        if (progreso < 1) {
            requestAnimationFrame(actualizar);
        }
    }

    requestAnimationFrame(actualizar);
}


/* =========================================================
   ANIMACIÓN DE APARICIÓN
   ========================================================= */

function animarElementos() {

    const elementos = document.querySelectorAll(
        ".kpi, .panel, .tabla-panel, .insight, .top-clientes, .grafico-panel"
    );

    elementos.forEach((elemento, indice) => {

        elemento.style.opacity = "0";
        elemento.style.transform = "translateY(18px)";
        elemento.style.transition =
            "opacity .55s ease, transform .55s ease";

        setTimeout(() => {

            elemento.style.opacity = "1";
            elemento.style.transform = "translateY(0)";

        }, 100 + indice * 80);
    });
}


/* =========================================================
   KPI
   ========================================================= */

function renderizarKPIs(payload) {

    const kpis = payload.kpis || {};

    const clientes =
        kpis.clientes ??
        kpis.total_clientes ??
        0;

    const centros =
        kpis.centros ??
        kpis.total_centros ??
        0;

    const regiones =
        kpis.regiones ??
        kpis.total_regiones ??
        0;

    const pnv =
        kpis.pnv ??
        kpis.PNV_2025_CLP ??
        kpis.pnv_total ??
        0;

    animarNumero(
        $("kpi-clientes"),
        clientes,
        1300
    );

    animarNumero(
        $("kpi-centros"),
        centros,
        1400
    );

    animarNumero(
        $("kpi-regiones"),
        regiones,
        1500
    );

    animarNumero(
        $("kpi-pnv"),
        pnv,
        1800,
        "clp"
    );
}


/* =========================================================
   BARRAS
   ========================================================= */

function renderizarBarras(contenedorId, datosEntrada, etiquetaCampo, valorCampo) {

    const contenedor = $(contenedorId);

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (!Array.isArray(datosEntrada) || datosEntrada.length === 0) {

        contenedor.innerHTML = `
            <div class="sin-datos">
                No hay datos disponibles.
            </div>
        `;

        return;
    }

    const valores = datosEntrada.map(item =>
        numero(item[valorCampo])
    );

    const maximo = Math.max(...valores, 1);

    datosEntrada.forEach((item, indice) => {

        const etiqueta =
            item[etiquetaCampo] ??
            item.Region ??
            item.Centro_Origen ??
            item.nombre ??
            "";

        const valor =
            numero(item[valorCampo]);

        const porcentaje =
            Math.max(0, Math.min(100, (valor / maximo) * 100));

        const fila = document.createElement("div");

        fila.className = "barra-fila";

        fila.innerHTML = `
            <div class="barra-etiqueta"
                 title="${escapeHTML(etiqueta)}">
                ${escapeHTML(etiqueta)}
            </div>

            <div class="barra-pista">
                <div class="barra-valor"
                     style="width:0%">
                </div>
            </div>

            <div class="barra-numero">
                ${formatearNumero(valor)}
            </div>
        `;

        contenedor.appendChild(fila);

        const barra = fila.querySelector(".barra-valor");

        setTimeout(() => {

            if (barra) {
                barra.style.transition =
                    `width ${700 + indice * 70}ms cubic-bezier(.2,.7,.2,1)`;

                barra.style.width = `${porcentaje}%`;
            }

        }, 100 + indice * 70);
    });
}


/* =========================================================
   NORMALIZAR DATOS DE TABLA
   ========================================================= */

function normalizarFila(item) {

    return {
        Centro_Origen:
            item.Centro_Origen ??
            item.centro ??
            "",

        Region_Zona:
            item.Region_Zona ??
            item.region ??
            item.Region ??
            "",

        Ciudad:
            item.Ciudad ??
            item.ciudad ??
            "",

        Canal_L4:
            item.Canal_L4 ??
            item.canal ??
            "",

        Cliente:
            item.Cliente ??
            item.Segmento_L5 ??
            item.cliente ??
            "",

        Meses_Con_Venta:
            numero(
                item.Meses_Con_Venta ??
                item.meses ??
                0
            ),

        Cajas_2025:
            numero(
                item.Cajas_2025 ??
                item.cajas ??
                0
            ),

        PNV_2025_CLP:
            numero(
                item.PNV_2025_CLP ??
                item.pnv ??
                0
            )
    };
}


/* =========================================================
   OPCIONES DE FILTROS
   ========================================================= */

function valoresUnicos(campo) {

    const valores = datos
        .map(item => item[campo])
        .filter(valor =>
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ""
        )
        .map(valor => String(valor).trim());

    return [...new Set(valores)].sort((a, b) =>
        a.localeCompare(b, "es")
    );
}


function llenarSelect(id, valores, textoInicial) {

    const select = $(id);

    if (!select) {
        return;
    }

    select.innerHTML = "";

    const opcionInicial = document.createElement("option");

    opcionInicial.value = "";
    opcionInicial.textContent = textoInicial;

    select.appendChild(opcionInicial);

    valores.forEach(valor => {

        const opcion =
            document.createElement("option");

        opcion.value = valor;
        opcion.textContent = valor;

        select.appendChild(opcion);
    });
}


function prepararFiltros() {

    llenarSelect(
        "f-centro",
        valoresUnicos("Centro_Origen"),
        "Todos los centros"
    );

    llenarSelect(
        "f-region",
        valoresUnicos("Region_Zona"),
        "Todas las regiones"
    );

    llenarSelect(
        "f-ciudad",
        valoresUnicos("Ciudad"),
        "Todas las ciudades"
    );

    llenarSelect(
        "f-canal",
        valoresUnicos("Canal_L4"),
        "Todos los canales"
    );
}


/* =========================================================
   FILTRAR DATOS
   ========================================================= */

function obtenerDatosFiltrados() {

    return datos.filter(item => {

        const coincideCentro =
            !filtros.centro ||
            String(item.Centro_Origen) === filtros.centro;

        const coincideRegion =
            !filtros.region ||
            String(item.Region_Zona) === filtros.region;

        const coincideCiudad =
            !filtros.ciudad ||
            String(item.Ciudad) === filtros.ciudad;

        const coincideCanal =
            !filtros.canal ||
            String(item.Canal_L4) === filtros.canal;

        const texto =
            filtros.buscar.toLowerCase().trim();

        const coincideBusqueda =
            !texto ||
            String(item.Cliente)
                .toLowerCase()
                .includes(texto) ||
            String(item.Centro_Origen)
                .toLowerCase()
                .includes(texto) ||
            String(item.Region_Zona)
                .toLowerCase()
                .includes(texto) ||
            String(item.Ciudad)
                .toLowerCase()
                .includes(texto) ||
            String(item.Canal_L4)
                .toLowerCase()
                .includes(texto);

        return (
            coincideCentro &&
            coincideRegion &&
            coincideCiudad &&
            coincideCanal &&
            coincideBusqueda
        );
    });
}


/* =========================================================
   ORDENAMIENTO
   ========================================================= */

function ordenarDatos(lista) {

    return [...lista].sort((a, b) => {

        let valorA = a[ordenCol];
        let valorB = b[ordenCol];

        const numA = Number(valorA);
        const numB = Number(valorB);

        if (
            Number.isFinite(numA) &&
            Number.isFinite(numB)
        ) {
            valorA = numA;
            valorB = numB;
        } else {
            valorA = String(valorA ?? "").toLowerCase();
            valorB = String(valorB ?? "").toLowerCase();
        }

        if (valorA < valorB) {
            return ordenAsc ? -1 : 1;
        }

        if (valorA > valorB) {
            return ordenAsc ? 1 : -1;
        }

        return 0;
    });
}


/* =========================================================
   TABLA
   ========================================================= */

function renderizarTabla() {

    const cuerpo = $("cuerpo-tabla");

    if (!cuerpo) {
        return;
    }

    const filtrados =
        ordenarDatos(obtenerDatosFiltrados());

    const total =
        filtrados.length;

    const totalPaginas =
        Math.max(
            1,
            Math.ceil(total / FILAS_POR_PAGINA)
        );

    if (paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }

    const inicio =
        (paginaActual - 1) * FILAS_POR_PAGINA;

    const fin =
        inicio + FILAS_POR_PAGINA;

    const pagina =
        filtrados.slice(inicio, fin);

    cuerpo.innerHTML = "";

    if (pagina.length === 0) {

        cuerpo.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center;padding:30px;">
                    No se encontraron registros.
                </td>
            </tr>
        `;

        actualizarContador(0, total);

        renderizarPaginacion(0);

        return;
    }

    pagina.forEach((item, indice) => {

        const fila =
            document.createElement("tr");

        fila.style.opacity = "0";
        fila.style.transform = "translateY(8px)";
        fila.style.transition =
            "opacity .3s ease, transform .3s ease";

        fila.innerHTML = `
            <td>${escapeHTML(item.Centro_Origen)}</td>

            <td>${escapeHTML(item.Region_Zona)}</td>

            <td>${escapeHTML(item.Ciudad)}</td>

            <td>${escapeHTML(item.Canal_L4)}</td>

            <td>
                <strong>
                    ${escapeHTML(item.Cliente)}
                </strong>
            </td>

            <td class="num">
                ${formatearNumero(item.Meses_Con_Venta)}
            </td>

            <td class="num">
                ${formatearDecimal(item.Cajas_2025)}
            </td>

            <td class="num">
                ${formatearCLP(item.PNV_2025_CLP)}
            </td>
        `;

        cuerpo.appendChild(fila);

        setTimeout(() => {

            fila.style.opacity = "1";
            fila.style.transform = "translateY(0)";

        }, indice * 35);
    });

    actualizarContador(
        pagina.length,
        total,
        inicio + 1,
        Math.min(fin, total)
    );

    renderizarPaginacion(totalPaginas);
}


function actualizarContador(mostrados, total, desde, hasta) {

    const contador = $("contador");

    if (!contador) {
        return;
    }

    if (total === 0) {

        contador.textContent =
            "0 clientes encontrados.";

        return;
    }

    contador.textContent =
        `Mostrando ${desde}–${hasta} de ${formatearNumero(total)} clientes`;
}


/* =========================================================
   PAGINACIÓN
   ========================================================= */

function renderizarPaginacion(totalPaginas) {

    let contenedor =
        $("paginacion");

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (totalPaginas <= 1) {
        return;
    }

    const botonAnterior =
        document.createElement("button");

    botonAnterior.textContent = "‹";

    botonAnterior.disabled =
        paginaActual === 1;

    botonAnterior.onclick = () => {

        if (paginaActual > 1) {

            paginaActual--;

            renderizarTabla();

            window.scrollTo({
                top: document.querySelector(".tabla-panel")?.offsetTop || 0,
                behavior: "smooth"
            });
        }
    };

    contenedor.appendChild(botonAnterior);

    const maxBotones = 7;

    let inicio =
        Math.max(1, paginaActual - 3);

    let fin =
        Math.min(
            totalPaginas,
            inicio + maxBotones - 1
        );

    if (fin - inicio < maxBotones - 1) {

        inicio =
            Math.max(
                1,
                fin - maxBotones + 1
            );
    }

    for (let i = inicio; i <= fin; i++) {

        const boton =
            document.createElement("button");

        boton.textContent = i;

        if (i === paginaActual) {
            boton.classList.add("activo");
        }

        boton.onclick = () => {

            paginaActual = i;

            renderizarTabla();
        };

        contenedor.appendChild(boton);
    }

    const botonSiguiente =
        document.createElement("button");

    botonSiguiente.textContent = "›";

    botonSiguiente.disabled =
        paginaActual === totalPaginas;

    botonSiguiente.onclick = () => {

        if (paginaActual < totalPaginas) {

            paginaActual++;

            renderizarTabla();
        }
    };

    contenedor.appendChild(botonSiguiente);
}


/* =========================================================
   ORDENAMIENTO DE COLUMNAS
   ========================================================= */

function prepararOrdenamiento() {

    const encabezados =
        document.querySelectorAll(
            "th[data-col]"
        );

    encabezados.forEach(th => {

        th.addEventListener("click", () => {

            const columna =
                th.dataset.col;

            if (!columna) {
                return;
            }

            if (ordenCol === columna) {
                ordenAsc = !ordenAsc;
            } else {
                ordenCol = columna;
                ordenAsc = true;
            }

            paginaActual = 1;

            actualizarIndicadoresOrden();

            renderizarTabla();
        });
    });
}


function actualizarIndicadoresOrden() {

    document
        .querySelectorAll("th[data-col]")
        .forEach(th => {

            const columna =
                th.dataset.col;

            const textoBase =
                th.dataset.textoOriginal ||
                th.textContent
                    .replace(/[▲▼]/g, "")
                    .trim();

            th.dataset.textoOriginal =
                textoBase;

            if (columna === ordenCol) {

                th.textContent =
                    `${textoBase} ${ordenAsc ? "▲" : "▼"}`;

            } else {

                th.textContent =
                    textoBase;
            }
        });
}


/* =========================================================
   EVENTOS DE FILTROS
   ========================================================= */

function prepararEventosFiltros() {

    const centro = $("f-centro");
    const region = $("f-region");
    const ciudad = $("f-ciudad");
    const canal = $("f-canal");
    const buscar = $("f-buscar");

    if (centro) {

        centro.addEventListener("change", e => {

            filtros.centro =
                e.target.value;

            paginaActual = 1;

            renderizarTabla();
        });
    }

    if (region) {

        region.addEventListener("change", e => {

            filtros.region =
                e.target.value;

            paginaActual = 1;

            renderizarTabla();
        });
    }

    if (ciudad) {

        ciudad.addEventListener("change", e => {

            filtros.ciudad =
                e.target.value;

            paginaActual = 1;

            renderizarTabla();
        });
    }

    if (canal) {

        canal.addEventListener("change", e => {

            filtros.canal =
                e.target.value;

            paginaActual = 1;

            renderizarTabla();
        });
    }

    if (buscar) {

        buscar.addEventListener("input", e => {

            filtros.buscar =
                e.target.value;

            paginaActual = 1;

            renderizarTabla();
        });
    }
}


/* =========================================================
   RESET
   ========================================================= */

function resetearFiltros() {

    filtros = {
        centro: "",
        region: "",
        ciudad: "",
        canal: "",
        buscar: ""
    };

    const ids = [
        "f-centro",
        "f-region",
        "f-ciudad",
        "f-canal"
    ];

    ids.forEach(id => {

        const elemento = $(id);

        if (elemento) {
            elemento.value = "";
        }
    });

    const buscar = $("f-buscar");

    if (buscar) {
        buscar.value = "";
    }

    paginaActual = 1;

    renderizarTabla();
}


/* =========================================================
   GRÁFICO MENSUAL SVG
   ========================================================= */

function renderizarGraficoMensual(payload) {

    const contenedor =
        $("grafico-mensual") ||
        $("graficoMensual") ||
        $("chart-mensual");

    if (!contenedor) {
        return;
    }

    /*
     * IMPORTANTE:
     * El JSON real utiliza "mensual".
     */
    datosMensuales =
        Array.isArray(payload.mensual)
            ? payload.mensual
            : [];

    contenedor.innerHTML = "";

    if (datosMensuales.length === 0) {

        contenedor.innerHTML = `
            <div class="sin-datos">
                <strong>No hay datos mensuales disponibles.</strong>
                <br>
                Verifica que el JSON contenga la propiedad
                <code>mensual</code>.
            </div>
        `;

        return;
    }

    const datos = [...datosMensuales]
        .sort((a, b) =>
            numero(a.mes_num) -
            numero(b.mes_num)
        );

    const ancho = 900;
    const alto = 330;

    const margen = {
        arriba: 35,
        derecha: 35,
        abajo: 55,
        izquierda: 75
    };

    const anchoUtil =
        ancho -
        margen.izquierda -
        margen.derecha;

    const altoUtil =
        alto -
        margen.arriba -
        margen.abajo;

    const maximo =
        Math.max(
            ...datos.map(d => numero(d.pnv)),
            1
        );

    const minimo = 0;

    const puntos =
        datos.map((dato, indice) => {

            const x =
                margen.izquierda +
                (
                    indice /
                    Math.max(datos.length - 1, 1)
                ) *
                anchoUtil;

            const y =
                margen.arriba +
                altoUtil -
                (
                    (
                        numero(dato.pnv) -
                        minimo
                    ) /
                    (
                        maximo -
                        minimo || 1
                    )
                ) *
                altoUtil;

            return {
                x,
                y,
                dato
            };
        });

    const polyline =
        puntos
            .map(p => `${p.x},${p.y}`)
            .join(" ");

    const areaPoints =
        [
            `${puntos[0].x},${margen.arriba + altoUtil}`,
            polyline,
            `${puntos[puntos.length - 1].x},${margen.arriba + altoUtil}`
        ].join(" ");

    let svg = `
        <div class="grafico-contenedor">
            <svg
                viewBox="0 0 ${ancho} ${alto}"
                preserveAspectRatio="none"
                class="grafico-svg"
                role="img"
                aria-label="Evolución mensual del PNV 2025"
            >

                <defs>

                    <linearGradient
                        id="gradientePNV"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stop-opacity=".22"
                        />

                        <stop
                            offset="100%"
                            stop-opacity="0"
                        />
                    </linearGradient>

                </defs>
    `;

    /*
     * Líneas horizontales
     */

    const lineas = 5;

    for (let i = 0; i <= lineas; i++) {

        const porcentaje =
            i / lineas;

        const y =
            margen.arriba +
            altoUtil * porcentaje;

        const valor =
            maximo * (1 - porcentaje);

        svg += `
            <line
                x1="${margen.izquierda}"
                y1="${y}"
                x2="${ancho - margen.derecha}"
                y2="${y}"
                class="linea-guia"
            />

            <text
                x="${margen.izquierda - 10}"
                y="${y + 4}"
                text-anchor="end"
                class="etiqueta-eje"
            >
                ${formatearCLP(valor)}
            </text>
        `;
    }

    /*
     * Área
     */

    svg += `
        <polygon
            points="${areaPoints}"
            class="area-grafico"
        />

        <polyline
            points="${polyline}"
            class="linea-grafico"
        />
    `;

    /*
     * Puntos
     */

    puntos.forEach((punto, indice) => {

        const dato =
            punto.dato;

        svg += `
            <g class="punto-grafico">

                <circle
                    cx="${punto.x}"
                    cy="${punto.y}"
                    r="5"
                    class="punto"
                    data-indice="${indice}"
                />

                <text
                    x="${punto.x}"
                    y="${alto - 20}"
                    text-anchor="middle"
                    class="etiqueta-mes"
                >
                    ${escapeHTML(dato.mes)}
                </text>

            </g>
        `;
    });

    svg += `
            </svg>

            <div
                id="tooltip-mensual"
                class="tooltip-mensual"
            ></div>
        </div>
    `;

    contenedor.innerHTML = svg;

    /*
     * Animación de línea
     */

    const linea =
        contenedor.querySelector(
            ".linea-grafico"
        );

    if (linea) {

        const longitud =
            linea.getTotalLength();

        linea.style.strokeDasharray =
            longitud;

        linea.style.strokeDashoffset =
            longitud;

        linea.getBoundingClientRect();

        linea.style.transition =
            "stroke-dashoffset 1.6s cubic-bezier(.2,.7,.2,1)";

        linea.style.strokeDashoffset = "0";
    }

    /*
     * Animación de puntos
     */

    const puntosDOM =
        contenedor.querySelectorAll(
            ".punto"
        );

    puntosDOM.forEach((punto, indice) => {

        punto.style.opacity = "0";
        punto.style.transformOrigin =
            `${punto.getAttribute("cx")}px ${punto.getAttribute("cy")}px`;
        punto.style.transform =
            "scale(.3)";

        setTimeout(() => {

            punto.style.transition =
                "opacity .35s ease, transform .35s ease";

            punto.style.opacity = "1";
            punto.style.transform =
                "scale(1)";

        }, 500 + indice * 100);

    });

    prepararTooltipsMensuales(datos);
}


/* =========================================================
   TOOLTIPS DEL GRÁFICO
   ========================================================= */

function prepararTooltipsMensuales(datos) {

    const puntos =
        document.querySelectorAll(
            ".punto-grafico"
        );

    const tooltip =
        $("tooltip-mensual");

    if (!tooltip) {
        return;
    }

    puntos.forEach((grupo, indice) => {

        const dato =
            datos[indice];

        if (!dato) {
            return;
        }

        grupo.addEventListener("mouseenter", () => {

            tooltip.innerHTML = `
                <div class="tooltip-titulo">
                    ${escapeHTML(dato.mes)}
                </div>

                <div>
                    <strong>PNV:</strong>
                    ${formatearCLP(dato.pnv)}
                </div>

                <div>
                    <strong>Cajas:</strong>
                    ${formatearDecimal(dato.cajas)}
                </div>

                <div>
                    <strong>Clientes:</strong>
                    ${formatearNumero(dato.clientes)}
                </div>
            `;

            tooltip.classList.add("visible");
        });

        grupo.addEventListener("mousemove", event => {

            const rect =
                tooltip.parentElement.getBoundingClientRect();

            let left =
                event.clientX -
                rect.left +
                14;

            let top =
                event.clientY -
                rect.top -
                20;

            const anchoTooltip =
                tooltip.offsetWidth;

            if (
                left + anchoTooltip >
                rect.width - 10
            ) {
                left =
                    left -
                    anchoTooltip -
                    28;
            }

            tooltip.style.left =
                `${left}px`;

            tooltip.style.top =
                `${top}px`;
        });

        grupo.addEventListener("mouseleave", () => {

            tooltip.classList.remove(
                "visible"
            );
        });
    });
}


/* =========================================================
   TOP CLIENTES
   ========================================================= */

function renderizarTopClientes() {

    const contenedor =
        $("top-clientes");

    if (!contenedor) {
        return;
    }

    const top =
        [...datos]
            .sort(
                (a, b) =>
                    numero(b.PNV_2025_CLP) -
                    numero(a.PNV_2025_CLP)
            )
            .slice(0, 10);

    if (top.length === 0) {

        contenedor.innerHTML =
            "<p>No hay datos.</p>";

        return;
    }

    contenedor.innerHTML = "";

    top.forEach((item, indice) => {

        const fila =
            document.createElement("div");

        fila.className =
            "top-cliente-fila";

        fila.innerHTML = `
            <div class="top-posicion">
                ${indice + 1}
            </div>

            <div class="top-info">

                <div class="top-nombre">
                    ${escapeHTML(item.Cliente)}
                </div>

                <div class="top-subtexto">
                    ${escapeHTML(item.Region_Zona)}
                </div>

            </div>

            <div class="top-valor">
                ${formatearCLP(item.PNV_2025_CLP)}
            </div>
        `;

        contenedor.appendChild(fila);

        fila.style.opacity = "0";
        fila.style.transform =
            "translateX(-12px)";

        setTimeout(() => {

            fila.style.transition =
                "opacity .4s ease, transform .4s ease";

            fila.style.opacity = "1";
            fila.style.transform =
                "translateX(0)";

        }, indice * 70);
    });
}


/* =========================================================
   INSIGHTS
   ========================================================= */

function renderizarInsights(payload) {

    const contenedor =
        $("insights");

    if (!contenedor) {
        return;
    }

    const mensual =
        Array.isArray(payload.mensual)
            ? payload.mensual
            : [];

    if (mensual.length === 0) {
        return;
    }

    const ordenado =
        [...mensual]
            .sort(
                (a, b) =>
                    numero(b.pnv) -
                    numero(a.pnv)
            );

    const mejorMes =
        ordenado[0];

    const peorMes =
        ordenado[ordenado.length - 1];

    const totalPNV =
        mensual.reduce(
            (total, item) =>
                total + numero(item.pnv),
            0
        );

    const promedio =
        totalPNV /
        mensual.length;

    contenedor.innerHTML = `
        <div class="insight">

            <div class="insight-icon">
                ↗
            </div>

            <div>

                <strong>
                    Mejor mes
                </strong>

                <p>
                    ${escapeHTML(mejorMes.mes)}
                    registró
                    ${formatearCLP(mejorMes.pnv)}
                    de PNV.
                </p>

            </div>

        </div>

        <div class="insight">

            <div class="insight-icon">
                ◉
            </div>

            <div>

                <strong>
                    Promedio mensual
                </strong>

                <p>
                    ${formatearCLP(promedio)}
                    de PNV promedio.
                </p>

            </div>

        </div>

        <div class="insight">

            <div class="insight-icon">
                ↓
            </div>

            <div>

                <strong>
                    Menor mes
                </strong>

                <p>
                    ${escapeHTML(peorMes.mes)}
                    registró
                    ${formatearCLP(peorMes.pnv)}.
                </p>

            </div>

        </div>
    `;
}


/* =========================================================
   BOTÓN DE RESET
   ========================================================= */

function prepararBotonReset() {

    const botones =
        document.querySelectorAll(
            "#btn-reset, #reset-filtros, .btn-reset"
        );

    botones.forEach(boton => {

        boton.addEventListener(
            "click",
            resetearFiltros
        );
    });
}


/* =========================================================
   IMPRESIÓN / PDF
   ========================================================= */

function prepararImpresion() {

    const botones =
        document.querySelectorAll(
            "#btn-imprimir, #btn-pdf, .btn-imprimir"
        );

    botones.forEach(boton => {

        boton.addEventListener(
            "click",
            () => {

                window.print();
            }
        );
    });
}


/* =========================================================
   CARGAR DATOS
   ========================================================= */

async function cargarDatos() {

    try {

        console.log(
            "[Dashboard] Cargando datos..."
        );

        const respuesta =
            await fetch(
                `datos_dashboard.json?v=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        const payload =
            await respuesta.json();

        console.log(
            "[Dashboard] JSON cargado:",
            payload
        );

        /*
         * ---------------------------------------------
         * TABLA
         * ---------------------------------------------
         */

        datos =
            Array.isArray(payload.tabla)
                ? payload.tabla.map(normalizarFila)
                : [];

        /*
         * ---------------------------------------------
         * DATOS MENSUALES
         * ---------------------------------------------
         */

        datosMensuales =
            Array.isArray(payload.mensual)
                ? payload.mensual
                : [];

        console.log(
            `[Dashboard] Clientes: ${datos.length}`
        );

        console.log(
            `[Dashboard] Meses: ${datosMensuales.length}`
        );

        /*
         * ---------------------------------------------
         * KPI
         * ---------------------------------------------
         */

        renderizarKPIs(payload);

        /*
         * ---------------------------------------------
         * BARRAS
         * ---------------------------------------------
         */

        const regiones =
            Array.isArray(payload.por_region)
                ? payload.por_region
                : [];

        const centros =
            Array.isArray(payload.por_centro)
                ? payload.por_centro
                : [];

        /*
         * Intentamos detectar automáticamente
         * los nombres de los campos.
         */

        const campoRegion =
            regiones.length
                ? (
                    "Region" in regiones[0]
                        ? "Region"
                        : "Region_Zona"
                )
                : "Region";

        const campoValorRegion =
            regiones.length
                ? (
                    "Clientes" in regiones[0]
                        ? "Clientes"
                        : "clientes"
                )
                : "Clientes";

        const campoCentro =
            centros.length
                ? (
                    "Centro_Origen" in centros[0]
                        ? "Centro_Origen"
                        : "Centro"
                )
                : "Centro_Origen";

        const campoValorCentro =
            centros.length
                ? (
                    "Clientes" in centros[0]
                        ? "Clientes"
                        : "clientes"
                )
                : "Clientes";

        renderizarBarras(
            "barras-region",
            regiones,
            campoRegion,
            campoValorRegion
        );

        renderizarBarras(
            "barras-centro",
            centros,
            campoCentro,
            campoValorCentro
        );

        /*
         * ---------------------------------------------
         * FILTROS
         * ---------------------------------------------
         */

        prepararFiltros();

        prepararEventosFiltros();

        prepararOrdenamiento();

        prepararBotonReset();

        prepararImpresion();

        /*
         * ---------------------------------------------
         * TABLA
         * ---------------------------------------------
         */

        renderizarTabla();

        /*
         * ---------------------------------------------
         * TOP CLIENTES
         * ---------------------------------------------
         */

        renderizarTopClientes();

        /*
         * ---------------------------------------------
         * INSIGHTS
         * ---------------------------------------------
         */

        renderizarInsights(payload);

        /*
         * ---------------------------------------------
         * GRÁFICO MENSUAL
         * ---------------------------------------------
         */

        renderizarGraficoMensual(payload);

        /*
         * ---------------------------------------------
         * ANIMACIONES GENERALES
         * ---------------------------------------------
         */

        setTimeout(() => {

            animarElementos();

        }, 100);

        console.log(
            "[Dashboard] ✓ Dashboard cargado correctamente."
        );

    } catch (error) {

        console.error(
            "[Dashboard] Error:",
            error
        );

        mostrarError(
            error.message
        );
    }
}


/* =========================================================
   ERROR
   ========================================================= */

function mostrarError(mensaje) {

    const elementos = [
        $("barras-region"),
        $("barras-centro"),
        $("cuerpo-tabla"),
        $("grafico-mensual"),
        $("graficoMensual"),
        $("chart-mensual")
    ];

    elementos.forEach(elemento => {

        if (!elemento) {
            return;
        }

        elemento.innerHTML = `
            <div class="error-dashboard">

                <strong>
                    No se pudieron cargar los datos.
                </strong>

                <br><br>

                ${escapeHTML(mensaje)}

            </div>
        `;
    });
}


/* =========================================================
   INICIO
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "================================="
        );

        console.log(
            " Nestlé Chile Dashboard"
        );

        console.log(
            " Iniciando..."
        );

        console.log(
            "================================="
        );

        cargarDatos();
    }
);
