/* =========================================================
   NESTLÉ CHILE — DASHBOARD COMERCIAL 2025
   SCRIPT V2
   Compatible con index.html + style.css V2
========================================================= */

"use strict";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CONFIG = {

    JSON_URL: "datos_dashboard.json",

    FILAS_POR_PAGINA: 10,

    DURACION_KPI: 900,

    DURACION_BARRAS: 750

};


/* =========================================================
   ESTADO GLOBAL
========================================================= */

let payload = null;

let datosOriginales = [];

let datosFiltrados = [];

let paginaActual = 1;

let ordenActual = {

    columna: null,

    direccion: 1

};

let filtros = {

    centro: "",

    region: "",

    ciudad: "",

    canal: "",

    buscar: ""

};


/* =========================================================
   ELEMENTOS DOM
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


const DOM = {

    centro: $("#f-centro"),

    region: $("#f-region"),

    ciudad: $("#f-ciudad"),

    canal: $("#f-canal"),

    buscar: $("#f-buscar"),

    filterCount: $("#filter-count"),

    kpiPNV: $("#kpi-pnv"),

    kpiClientes: $("#kpi-clientes"),

    kpiCentros: $("#kpi-centros"),

    kpiRegiones: $("#kpi-regiones"),

    kpiPNVFoot: $("#kpi-pnv-foot"),

    insightRegion: $("#insight-region"),

    insightRegionDetail: $("#insight-region-detail"),

    insightCentro: $("#insight-centro"),

    insightCentroDetail: $("#insight-centro-detail"),

    insightMonth: $("#insight-month"),

    insightMonthDetail: $("#insight-month-detail"),

    chartMonthly: $("#chart-monthly"),

    barrasRegion: $("#barras-region"),

    barrasCentro: $("#barras-centro"),

    topClientes: $("#top-clientes"),

    cuerpoTabla: $("#cuerpo-tabla"),

    contador: $("#contador"),

    pageInfo: $("#page-info"),

    prevPage: $("#prev-page"),

    nextPage: $("#next-page"),

    btnReset: $("#btn-reset"),

    btnPDF: $("#btn-pdf"),

    tooltip: $("#tooltip")

};


/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", iniciar);


async function iniciar() {

    try {

        await cargarDatos();

        configurarEventos();

        cargarFiltros();

        renderizarTodo();

    } catch (error) {

        console.error("Error iniciando dashboard:", error);

        mostrarErrorDashboard(error);

    }

}


/* =========================================================
   CARGAR JSON
========================================================= */

async function cargarDatos() {

    const respuesta = await fetch(
        `${CONFIG.JSON_URL}?v=${Date.now()}`,
        {
            cache: "no-store"
        }
    );

    if (!respuesta.ok) {

        throw new Error(
            `No se pudo cargar ${CONFIG.JSON_URL} (${respuesta.status})`
        );

    }

    payload = await respuesta.json();

    datosOriginales = Array.isArray(payload.tabla)
        ? payload.tabla
        : [];

    datosFiltrados = [...datosOriginales];

    console.log("Dashboard cargado:", payload);

}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {

    DOM.centro?.addEventListener(
        "change",
        manejarFiltros
    );

    DOM.region?.addEventListener(
        "change",
        manejarFiltros
    );

    DOM.ciudad?.addEventListener(
        "change",
        manejarFiltros
    );

    DOM.canal?.addEventListener(
        "change",
        manejarFiltros
    );


    DOM.buscar?.addEventListener(
        "input",
        manejarFiltros
    );


    DOM.btnReset?.addEventListener(
        "click",
        restablecerFiltros
    );


    DOM.btnPDF?.addEventListener(
        "click",
        () => window.print()
    );


    DOM.prevPage?.addEventListener(
        "click",
        () => cambiarPagina(-1)
    );


    DOM.nextPage?.addEventListener(
        "click",
        () => cambiarPagina(1)
    );


    $$(".table-panel th[data-col]").forEach(
        th => {

            th.addEventListener(
                "click",
                () => ordenarTabla(th.dataset.col)
            );

        }
    );

}


/* =========================================================
   FILTROS
========================================================= */

function cargarFiltros() {

    const opciones = payload?.opciones || {};

    const centros = obtenerOpciones(
        opciones.centros,
        datosOriginales,
        "Centro_Origen"
    );

    const regiones = obtenerOpciones(
        opciones.regiones,
        datosOriginales,
        "Region_Zona"
    );

    const ciudades = obtenerOpciones(
        opciones.ciudades,
        datosOriginales,
        "Ciudad"
    );

    const canales = obtenerOpciones(
        opciones.canales,
        datosOriginales,
        "Canal_L4"
    );


    llenarSelect(
        DOM.centro,
        centros,
        "Todos los centros"
    );

    llenarSelect(
        DOM.region,
        regiones,
        "Todas las regiones"
    );

    llenarSelect(
        DOM.ciudad,
        ciudades,
        "Todas las ciudades"
    );

    llenarSelect(
        DOM.canal,
        canales,
        "Todos los canales"
    );

}


/* =========================================================
   OBTENER OPCIONES
========================================================= */

function obtenerOpciones(
    opciones,
    filas,
    campo
) {

    if (Array.isArray(opciones)) {

        return opciones
            .map(valor => {

                if (
                    valor &&
                    typeof valor === "object"
                ) {

                    return valor.valor ??
                        valor.label ??
                        valor.nombre ??
                        valor.name ??
                        "";

                }

                return valor;

            })
            .filter(Boolean)
            .map(String)
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "es",
                        {
                            sensitivity: "base"
                        }
                    )
            );

    }


    return [
        ...new Set(

            filas
                .map(
                    fila => fila?.[campo]
                )
                .filter(
                    valor =>
                        valor !== null &&
                        valor !== undefined &&
                        String(valor).trim() !== ""
                )
                .map(String)

        )

    ].sort(
        (a, b) =>
            a.localeCompare(
                b,
                "es",
                {
                    sensitivity: "base"
                }
            )
    );

}


/* =========================================================
   LLENAR SELECT
========================================================= */

function llenarSelect(
    select,
    valores,
    placeholder
) {

    if (!select) return;

    select.innerHTML = "";

    const primeraOpcion =
        document.createElement("option");

    primeraOpcion.value = "";

    primeraOpcion.textContent =
        placeholder;

    select.appendChild(
        primeraOpcion
    );


    valores.forEach(
        valor => {

            const option =
                document.createElement("option");

            option.value = valor;

            option.textContent = valor;

            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   MANEJAR FILTROS
========================================================= */

function manejarFiltros() {

    filtros.centro =
        DOM.centro?.value || "";

    filtros.region =
        DOM.region?.value || "";

    filtros.ciudad =
        DOM.ciudad?.value || "";

    filtros.canal =
        DOM.canal?.value || "";

    filtros.buscar =
        (
            DOM.buscar?.value || ""
        )
            .trim()
            .toLowerCase();


    paginaActual = 1;


    datosFiltrados =
        datosOriginales.filter(
            fila => {

                if (
                    filtros.centro &&
                    String(
                        fila.Centro_Origen ?? ""
                    ) !== filtros.centro
                ) {

                    return false;

                }


                if (
                    filtros.region &&
                    String(
                        fila.Region_Zona ?? ""
                    ) !== filtros.region
                ) {

                    return false;

                }


                if (
                    filtros.ciudad &&
                    String(
                        fila.Ciudad ?? ""
                    ) !== filtros.ciudad
                ) {

                    return false;

                }


                if (
                    filtros.canal &&
                    String(
                        fila.Canal_L4 ?? ""
                    ) !== filtros.canal
                ) {

                    return false;

                }


                if (filtros.buscar) {

                    const texto = [

                        fila.Centro_Origen,

                        fila.Region_Zona,

                        fila.Ciudad,

                        fila.Canal_L4,

                        fila.Cliente,

                        fila.Segmento_L5

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    if (
                        !texto.includes(
                            filtros.buscar
                        )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    renderizarTodo();

}


/* =========================================================
   RESTABLECER
========================================================= */

function restablecerFiltros() {

    filtros = {

        centro: "",

        region: "",

        ciudad: "",

        canal: "",

        buscar: ""

    };


    if (DOM.centro)
        DOM.centro.value = "";

    if (DOM.region)
        DOM.region.value = "";

    if (DOM.ciudad)
        DOM.ciudad.value = "";

    if (DOM.canal)
        DOM.canal.value = "";

    if (DOM.buscar)
        DOM.buscar.value = "";


    paginaActual = 1;

    ordenActual = {

        columna: null,

        direccion: 1

    };


    datosFiltrados =
        [...datosOriginales];


    renderizarTodo();

}


/* =========================================================
   RENDERIZAR TODO
========================================================= */

function renderizarTodo() {

    renderizarKPIs();

    renderizarInsights();

    renderizarGraficoMensual();

    renderizarBarrasRegion();

    renderizarBarrasCentro();

    renderizarTopClientes();

    renderizarTabla();

    actualizarContadorFiltros();

}


/* =========================================================
   KPIs
========================================================= */

function renderizarKPIs() {

    const pnv =
        sumarCampo(
            datosFiltrados,
            "PNV_2025_CLP"
        );


    const clientes =
        contarUnicos(
            datosFiltrados,
            obtenerCampoCliente
        );


    const centros =
        contarUnicos(
            datosFiltrados,
            fila => fila.Centro_Origen
        );


    const regiones =
        contarUnicos(
            datosFiltrados,
            fila => fila.Region_Zona
        );


    animarNumero(
        DOM.kpiPNV,
        pnv,
        formatearCLP
    );


    animarNumero(
        DOM.kpiClientes,
        clientes,
        formatearNumero
    );


    animarNumero(
        DOM.kpiCentros,
        centros,
        formatearNumero
    );


    animarNumero(
        DOM.kpiRegiones,
        regiones,
        formatearNumero
    );


    if (DOM.kpiPNVFoot) {

        DOM.kpiPNVFoot.textContent =
            "CLP · 2025";

    }

}


/* =========================================================
   OBTENER CLIENTE
========================================================= */

function obtenerCampoCliente(fila) {

    return (
        fila.Cliente ??
        fila.Segmento_L5 ??
        fila.Cod_Cliente ??
        ""
    );

}


/* =========================================================
   ANIMACIÓN DE NÚMEROS
========================================================= */

function animarNumero(
    elemento,
    valorFinal,
    formatter
) {

    if (!elemento) return;


    const valor =
        Number(valorFinal) || 0;


    const duracion =
        CONFIG.DURACION_KPI;


    const inicio =
        performance.now();


    function frame(ahora) {

        const progreso =
            Math.min(
                (ahora - inicio) /
                duracion,
                1
            );


        const easing =
            1 -
            Math.pow(
                1 - progreso,
                3
            );


        const actual =
            valor * easing;


        elemento.textContent =
            formatter(actual);


        if (progreso < 1) {

            requestAnimationFrame(frame);

        } else {

            elemento.textContent =
                formatter(valor);

        }

    }


    requestAnimationFrame(frame);

}


/* =========================================================
   INSIGHTS
========================================================= */

function renderizarInsights() {

    renderInsightRegion();

    renderInsightCentro();

    renderInsightMes();

}


/* =========================================================
   INSIGHT REGIÓN
========================================================= */

function renderInsightRegion() {

    const grupos =
        agruparConteo(
            datosFiltrados,
            "Region_Zona",
            obtenerCampoCliente
        );


    const ganador =
        grupos[0];


    if (!ganador) {

        setText(
            DOM.insightRegion,
            "—"
        );

        setText(
            DOM.insightRegionDetail,
            "Sin datos"
        );

        return;

    }


    setText(
        DOM.insightRegion,
        ganador.nombre
    );


    setText(
        DOM.insightRegionDetail,
        `${formatearNumero(ganador.valor)} clientes`
    );

}


/* =========================================================
   INSIGHT CENTRO
========================================================= */

function renderInsightCentro() {

    const grupos =
        agruparConteo(
            datosFiltrados,
            "Centro_Origen",
            obtenerCampoCliente
        );


    const ganador =
        grupos[0];


    if (!ganador) {

        setText(
            DOM.insightCentro,
            "—"
        );

        setText(
            DOM.insightCentroDetail,
            "Sin datos"
        );

        return;

    }


    setText(
        DOM.insightCentro,
        ganador.nombre
    );


    setText(
        DOM.insightCentroDetail,
        `${formatearNumero(ganador.valor)} clientes`
    );

}


/* =========================================================
   INSIGHT MES
========================================================= */

function renderInsightMes() {

    const mensual =
        Array.isArray(
            payload?.mensual
        )
            ? payload.mensual
            : [];


    if (!mensual.length) {

        setText(
            DOM.insightMonth,
            "—"
        );

        setText(
            DOM.insightMonthDetail,
            "Sin datos mensuales"
        );

        return;

    }


    const mayor =
        [...mensual]
            .sort(
                (a, b) =>
                    Number(b.pnv || 0) -
                    Number(a.pnv || 0)
            )[0];


    setText(
        DOM.insightMonth,
        mayor.mes || "—"
    );


    setText(
        DOM.insightMonthDetail,
        formatearCLP(
            mayor.pnv || 0
        )
    );

}


/* =========================================================
   GRÁFICO MENSUAL
========================================================= */

function renderizarGraficoMensual() {

    if (!DOM.chartMonthly) return;


    const mensual =
        Array.isArray(
            payload?.mensual
        )
            ? payload.mensual
            : [];


    DOM.chartMonthly.innerHTML = "";


    if (!mensual.length) {

        mostrarVacio(
            DOM.chartMonthly,
            "No hay datos mensuales disponibles."
        );

        return;

    }


    const datos =
        mensual.map(
            item => ({

                mes:
                    item.mes ??
                    item.nombre ??
                    String(
                        item.mes_num ?? ""
                    ),

                pnv:
                    Number(
                        item.pnv ??
                        item.PNV ??
                        0
                    ),

                cajas:
                    Number(
                        item.cajas ??
                        item.Cajas ??
                        0
                    ),

                clientes:
                    Number(
                        item.clientes ??
                        item.Clientes ??
                        0
                    )

            })
        );


    construirSVGMensual(
        datos
    );

}


/* =========================================================
   CONSTRUIR SVG
========================================================= */

function construirSVGMensual(
    datos
) {

    const width = 900;

    const height = 300;

    const margen = {

        top: 25,

        right: 25,

        bottom: 45,

        left: 65

    };


    const innerWidth =
        width -
        margen.left -
        margen.right;


    const innerHeight =
        height -
        margen.top -
        margen.bottom;


    const maxPNV =
        Math.max(
            ...datos.map(
                d => d.pnv
            ),
            1
        );


    const minPNV =
        Math.min(
            ...datos.map(
                d => d.pnv
            ),
            0
        );


    const rango =
        maxPNV -
        minPNV || 1;


    const x = index => {

        if (datos.length === 1)
            return margen.left +
                innerWidth / 2;

        return margen.left +
            (
                index /
                (datos.length - 1)
            ) *
            innerWidth;

    };


    const y = value => {

        return margen.top +
            innerHeight -
            (
                (
                    value -
                    minPNV
                ) /
                rango
            ) *
            innerHeight;

    };


    let puntos = "";


    datos.forEach(
        (dato, index) => {

            puntos +=
                `${x(index)},${y(dato.pnv)} `;

        }
    );


    const primerPunto =
        `${x(0)},${y(datos[0].pnv)}`;


    const ultimoPunto =
        `${x(datos.length - 1)},${y(
            datos[datos.length - 1].pnv
        )}`;


    const area =
        `${primerPunto} ` +
        puntos +
        `${ultimoPunto} ` +
        `${x(datos.length - 1)},${margen.top + innerHeight} ` +
        `${x(0)},${margen.top + innerHeight}`;


    let svg = `

        <svg
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="none"
            aria-label="Evolución mensual del PNV">

            <defs>

                <linearGradient
                    id="chartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1">

                    <stop
                        offset="0%"
                        stop-color="#0b7f88"
                        stop-opacity="0.25">
                    </stop>

                    <stop
                        offset="100%"
                        stop-color="#0b7f88"
                        stop-opacity="0.02">
                    </stop>

                </linearGradient>

            </defs>

    `;


    /* GRID */

    const lineas =
        5;


    for (
        let i = 0;
        i <= lineas;
        i++
    ) {

        const valor =
            maxPNV -
            (
                maxPNV -
                minPNV
            ) *
            (
                i /
                lineas
            );


        const posicion =
            margen.top +
            (
                innerHeight *
                i /
                lineas
            );


        svg += `

            <line
                class="grid-line"
                x1="${margen.left}"
                y1="${posicion}"
                x2="${width - margen.right}"
                y2="${posicion}">
            </line>

            <text
                class="axis-label"
                x="${margen.left - 9}"
                y="${posicion + 4}"
                text-anchor="end">

                ${formatearCompacto(valor)}

            </text>

        `;

    }


    /* ÁREA */

    svg += `

        <polygon
            class="chart-fill"
            points="
                ${area}
            "
            style="
                fill:url(#chartGradient);
            ">
        </polygon>

    `;


    /* LÍNEA */

    svg += `

        <polyline
            class="chart-line"
            points="${puntos}"
            style="
                stroke-dasharray: ${calcularLongitudLinea(datos)};
                stroke-dashoffset: ${calcularLongitudLinea(datos)};
                animation: drawChart 1.2s ease forwards;
            ">
        </polyline>

    `;


    /* ETIQUETAS Y PUNTOS */

    datos.forEach(
        (dato, index) => {

            const px =
                x(index);

            const py =
                y(dato.pnv);


            svg += `

                <text
                    class="axis-label"
                    x="${px}"
                    y="${height - 13}"
                    text-anchor="middle">

                    ${escapeHTML(
                        dato.mes
                    )}

                </text>


                <circle
                    class="chart-point"
                    cx="${px}"
                    cy="${py}"
                    r="4.5"
                    data-index="${index}">

                </circle>

            `;

        }
    );


    svg += `

        </svg>

    `;


    DOM.chartMonthly.innerHTML =
        svg;


    agregarInteraccionPuntos(
        datos
    );


    agregarEstiloAnimacionGrafico();

}


/* =========================================================
   LONGITUD APROXIMADA LÍNEA
========================================================= */

function calcularLongitudLinea(
    datos
) {

    return Math.max(
        600,
        datos.length * 100
    );

}


/* =========================================================
   ANIMACIÓN DEL GRÁFICO
========================================================= */

function agregarEstiloAnimacionGrafico() {

    if (
        document.getElementById(
            "dashboard-chart-animation"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "dashboard-chart-animation";


    style.textContent = `

        @keyframes drawChart {

            from {
                stroke-dashoffset: var(--chart-length, 1200);
            }

            to {
                stroke-dashoffset: 0;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   TOOLTIP PUNTOS
========================================================= */

function agregarInteraccionPuntos(
    datos
) {

    const puntos =
        DOM.chartMonthly.querySelectorAll(
            ".chart-point"
        );


    puntos.forEach(
        (punto, index) => {

            punto.addEventListener(
                "mouseenter",
                event => {

                    const dato =
                        datos[index];


                    mostrarTooltip(
                        event,
                        `
                            <strong>
                                ${escapeHTML(
                                    dato.mes
                                )}
                            </strong>
                            <br>
                            PNV:
                            ${formatearCLP(
                                dato.pnv
                            )}
                            <br>
                            Cajas:
                            ${formatearNumeroDecimal(
                                dato.cajas
                            )}
                            <br>
                            Clientes:
                            ${formatearNumero(
                                dato.clientes
                            )}
                        `
                    );

                }
            );


            punto.addEventListener(
                "mousemove",
                moverTooltip
            );


            punto.addEventListener(
                "mouseleave",
                ocultarTooltip
            );

        }
    );

}


/* =========================================================
   BARRAS REGIÓN
========================================================= */

function renderizarBarrasRegion() {

    if (!DOM.barrasRegion) return;


    const grupos =
        agruparConteo(
            datosFiltrados,
            "Region_Zona",
            obtenerCampoCliente
        );


    renderizarBarras(
        DOM.barrasRegion,
        grupos,
        "region"
    );

}


/* =========================================================
   BARRAS CENTRO
========================================================= */

function renderizarBarrasCentro() {

    if (!DOM.barrasCentro) return;


    const grupos =
        agruparConteo(
            datosFiltrados,
            "Centro_Origen",
            obtenerCampoCliente
        );


    renderizarBarras(
        DOM.barrasCentro,
        grupos,
        "centro"
    );

}


/* =========================================================
   AGRUPAR CONTEO
========================================================= */

function agruparConteo(
    filas,
    campo,
    campoUnico
) {

    const mapa =
        new Map();


    filas.forEach(
        fila => {

            const nombre =
                String(
                    fila?.[campo] ??
                    "Sin especificar"
                ).trim();


            if (
                !mapa.has(nombre)
            ) {

                mapa.set(
                    nombre,
                    new Set()
                );

            }


            const valor =
                String(
                    campoUnico(fila) ??
                    ""
                ).trim();


            if (valor) {

                mapa.get(nombre)
                    .add(valor);

            }

        }
    );


    return [...mapa.entries()]
        .map(
            ([nombre, set]) => ({

                nombre,

                valor: set.size

            })
        )
        .sort(
            (a, b) =>
                b.valor -
                a.valor
        );

}


/* =========================================================
   RENDERIZAR BARRAS
========================================================= */

function renderizarBarras(
    contenedor,
    grupos,
    tipo
) {

    contenedor.innerHTML = "";


    if (!grupos.length) {

        mostrarVacio(
            contenedor,
            "Sin datos disponibles."
        );

        return;

    }


    const gruposVisibles =
        grupos.slice(
            0,
            10
        );


    const max =
        Math.max(
            ...gruposVisibles.map(
                item => item.valor
            ),
            1
        );


    gruposVisibles.forEach(
        item => {

            const porcentaje =
                (
                    item.valor /
                    max
                ) *
                100;


            const fila =
                document.createElement(
                    "div"
                );


            fila.className =
                "bar-row";


            fila.dataset.valor =
                item.nombre;


            fila.innerHTML = `

                <div
                    class="bar-label"
                    title="${escapeHTML(
                        item.nombre
                    )}">

                    ${escapeHTML(
                        item.nombre
                    )}

                </div>


                <div class="bar-track">

                    <div
                        class="bar-fill"
                        style="
                            --w: ${porcentaje}%;
                        ">
                    </div>

                </div>


                <div class="bar-num">

                    ${formatearNumero(
                        item.valor
                    )}

                </div>

            `;


            fila.addEventListener(
                "click",
                () => {

                    if (
                        tipo === "region"
                    ) {

                        aplicarFiltroDesdeGrafico(
                            "region",
                            item.nombre
                        );

                    }


                    if (
                        tipo === "centro"
                    ) {

                        aplicarFiltroDesdeGrafico(
                            "centro",
                            item.nombre
                        );

                    }

                }
            );


            contenedor.appendChild(
                fila
            );

        }
    );

}


/* =========================================================
   FILTRO DESDE GRÁFICOS
========================================================= */

function aplicarFiltroDesdeGrafico(
    tipo,
    valor
) {

    if (
        tipo === "region" &&
        DOM.region
    ) {

        DOM.region.value =
            valor;

        filtros.region =
            valor;

    }


    if (
        tipo === "centro" &&
        DOM.centro
    ) {

        DOM.centro.value =
            valor;

        filtros.centro =
            valor;

    }


    paginaActual = 1;

    manejarFiltros();


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


/* =========================================================
   TOP 10 CLIENTES
========================================================= */

function renderizarTopClientes() {

    if (!DOM.topClientes) return;


    const mapa =
        new Map();


    datosFiltrados.forEach(
        fila => {

            const cliente =
                obtenerCampoCliente(
                    fila
                );


            if (!cliente) return;


            const pnv =
                numero(
                    fila.PNV_2025_CLP
                );


            mapa.set(
                cliente,
                (
                    mapa.get(cliente) ||
                    0
                ) + pnv
            );

        }
    );


    const ranking =
        [...mapa.entries()]
            .map(
                ([nombre, pnv]) => ({

                    nombre,

                    pnv

                })
            )
            .sort(
                (a, b) =>
                    b.pnv -
                    a.pnv
            )
            .slice(
                0,
                10
            );


    DOM.topClientes.innerHTML = "";


    if (!ranking.length) {

        mostrarVacio(
            DOM.topClientes,
            "Sin clientes disponibles."
        );

        return;

    }


    const maxPNV =
        ranking[0].pnv ||
        1;


    ranking.forEach(
        (item, index) => {

            const porcentaje =
                (
                    item.pnv /
                    maxPNV
                ) *
                100;


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "top-item";


            div.innerHTML = `

                <div class="rank">

                    #${index + 1}

                </div>


                <div
                    class="top-name"
                    title="${escapeHTML(
                        item.nombre
                    )}">

                    ${escapeHTML(
                        item.nombre
                    )}

                </div>


                <div class="top-pnv">

                    ${formatearCLP(
                        item.pnv
                    )}

                </div>


                <div class="top-track">

                    <i
                        style="
                            width: 0%;
                            transition:
                                width
                                0.9s
                                cubic-bezier(
                                    .22,
                                    1,
                                    .36,
                                    1
                                );
                        "
                        data-width="${porcentaje}">
                    </i>

                </div>

            `;


            DOM.topClientes.appendChild(
                div
            );

        }
    );


    requestAnimationFrame(
        () => {

            setTimeout(
                () => {

                    DOM.topClientes
                        .querySelectorAll(
                            ".top-track i"
                        )
                        .forEach(
                            barra => {

                                barra.style.width =
                                    `${barra.dataset.width}%`;

                            }
                        );

                },
                80
            );

        }
    );

}


/* =========================================================
   TABLA
========================================================= */

function renderizarTabla() {

    if (!DOM.cuerpoTabla)
        return;


    let filas =
        [...datosFiltrados];


    if (
        ordenActual.columna
    ) {

        filas.sort(
            (
                a,
                b
            ) =>
                compararValores(
                    a[
                        ordenActual.columna
                    ],
                    b[
                        ordenActual.columna
                    ]
                ) *
                ordenActual.direccion
        );

    }


    const total =
        filas.length;


    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                total /
                CONFIG.FILAS_POR_PAGINA
            )
        );


    if (
        paginaActual >
        totalPaginas
    ) {

        paginaActual =
            totalPaginas;

    }


    const inicio =
        (
            paginaActual -
            1
        ) *
        CONFIG.FILAS_POR_PAGINA;


    const fin =
        Math.min(
            inicio +
            CONFIG.FILAS_POR_PAGINA,
            total
        );


    const visibles =
        filas.slice(
            inicio,
            fin
        );


    DOM.cuerpoTabla.innerHTML = "";


    if (!visibles.length) {

        const tr =
            document.createElement(
                "tr"
            );


        tr.innerHTML = `

            <td
                colspan="8"
                class="empty">

                No hay resultados
                para los filtros seleccionados.

            </td>

        `;


        DOM.cuerpoTabla.appendChild(
            tr
        );

    } else {

        visibles.forEach(
            fila => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.innerHTML = `

                    <td>
                        ${escapeHTML(
                            fila.Centro_Origen
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            fila.Region_Zona
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            fila.Ciudad
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            fila.Canal_L4
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            obtenerCampoCliente(
                                fila
                            )
                        )}
                    </td>

                    <td class="num">
                        ${formatearNumero(
                            fila.Meses_Con_Venta
                        )}
                    </td>

                    <td class="num">
                        ${formatearNumeroDecimal(
                            fila.Cajas_2025
                        )}
                    </td>

                    <td class="num">
                        ${formatearCLP(
                            fila.PNV_2025_CLP
                        )}
                    </td>

                `;


                DOM.cuerpoTabla.appendChild(
                    tr
                );

            }
        );

    }


    actualizarPaginacion(
        total,
        inicio,
        fin,
        totalPaginas
    );

}


/* =========================================================
   PAGINACIÓN
========================================================= */

function actualizarPaginacion(
    total,
    inicio,
    fin,
    totalPaginas
) {

    if (DOM.contador) {

        DOM.contador.textContent =
            `${formatearNumero(total)} clientes encontrados`;

    }


    if (DOM.pageInfo) {

        if (!total) {

            DOM.pageInfo.textContent =
                "0 resultados";

        } else {

            DOM.pageInfo.textContent =
                `${inicio + 1}–${fin} de ${formatearNumero(total)}`;

        }

    }


    if (DOM.prevPage) {

        DOM.prevPage.disabled =
            paginaActual <= 1;

    }


    if (DOM.nextPage) {

        DOM.nextPage.disabled =
            paginaActual >=
            totalPaginas;

    }

}


/* =========================================================
   CAMBIAR PÁGINA
========================================================= */

function cambiarPagina(
    direccion
) {

    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                datosFiltrados.length /
                CONFIG.FILAS_POR_PAGINA
            )
        );


    const nuevaPagina =
        paginaActual +
        direccion;


    if (
        nuevaPagina < 1 ||
        nuevaPagina > totalPaginas
    ) {

        return;

    }


    paginaActual =
        nuevaPagina;


    renderizarTabla();


    const tabla =
        document.querySelector(
            ".table-panel"
        );


    if (tabla) {

        tabla.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =========================================================
   ORDENAR TABLA
========================================================= */

function ordenarTabla(
    columna
) {

    if (
        ordenActual.columna ===
        columna
    ) {

        ordenActual.direccion *= -1;

    } else {

        ordenActual = {

            columna,

            direccion: 1

        };

    }


    paginaActual = 1;


    renderizarTabla();


    actualizarIndicadorOrden(
        columna
    );

}


/* =========================================================
   INDICADOR ORDEN
========================================================= */

function actualizarIndicadorOrden(
    columna
) {

    $$(".table-panel th[data-col]")
        .forEach(
            th => {

                const textoOriginal =
                    th.dataset.label ||
                    th.textContent
                        .replace(
                            /[↑↓]\s*$/,
                            ""
                        )
                        .trim();


                th.dataset.label =
                    textoOriginal;


                th.textContent =
                    textoOriginal;


                if (
                    th.dataset.col ===
                    columna
                ) {

                    th.textContent +=
                        ordenActual.direccion === 1
                            ? " ↑"
                            : " ↓";

                }

            }
        );

}


/* =========================================================
   COMPARAR
========================================================= */

function compararValores(
    a,
    b
) {

    const na =
        Number(a);

    const nb =
        Number(b);


    if (
        !Number.isNaN(na) &&
        !Number.isNaN(nb) &&
        a !== "" &&
        b !== ""
    ) {

        return na - nb;

    }


    return String(
        a ?? ""
    ).localeCompare(
        String(
            b ?? ""
        ),
        "es",
        {
            numeric: true,
            sensitivity: "base"
        }
    );

}


/* =========================================================
   CONTADOR FILTROS
========================================================= */

function actualizarContadorFiltros() {

    if (!DOM.filterCount)
        return;


    const activos = [

        filtros.centro,

        filtros.region,

        filtros.ciudad,

        filtros.canal,

        filtros.buscar

    ]
        .filter(
            Boolean
        )
        .length;


    if (!activos) {

        DOM.filterCount.textContent =
            "Vista completa";

        return;

    }


    DOM.filterCount.textContent =
        `${formatearNumero(
            datosFiltrados.length
        )} registros · ${activos} filtro${
            activos === 1
                ? ""
                : "s"
        }`;

}


/* =========================================================
   HELPERS — SUMA
========================================================= */

function sumarCampo(
    filas,
    campo
) {

    return filas.reduce(
        (
            total,
            fila
        ) =>
            total +
            numero(
                fila?.[campo]
            ),
        0
    );

}


/* =========================================================
   HELPERS — ÚNICOS
========================================================= */

function contarUnicos(
    filas,
    getter
) {

    const set =
        new Set();


    filas.forEach(
        fila => {

            const valor =
                getter(fila);


            if (
                valor !== null &&
                valor !== undefined &&
                String(valor).trim() !== ""
            ) {

                set.add(
                    String(valor)
                );

            }

        }
    );


    return set.size;

}


/* =========================================================
   FORMATO NÚMERO
========================================================= */

function formatearNumero(
    valor
) {

    return Math.round(
        Number(valor) || 0
    ).toLocaleString(
        "es-CL"
    );

}


/* =========================================================
   FORMATO DECIMAL
========================================================= */

function formatearNumeroDecimal(
    valor
) {

    return Number(
        valor || 0
    ).toLocaleString(
        "es-CL",
        {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }
    );

}


/* =========================================================
   FORMATO CLP
========================================================= */

function formatearCLP(
    valor
) {

    const numeroValor =
        Number(valor) || 0;


    return numeroValor.toLocaleString(
        "es-CL",
        {
            maximumFractionDigits: 0
        }
    ) + " CLP";

}


/* =========================================================
   FORMATO COMPACTO
========================================================= */

function formatearCompacto(
    valor
) {

    const numeroValor =
        Number(valor) || 0;


    if (
        Math.abs(numeroValor) >=
        1000000000
    ) {

        return (
            numeroValor /
            1000000000
        ).toFixed(1) + "B";

    }


    if (
        Math.abs(numeroValor) >=
        1000000
    ) {

        return (
            numeroValor /
            1000000
        ).toFixed(1) + "M";

    }


    if (
        Math.abs(numeroValor) >=
        1000
    ) {

        return (
            numeroValor /
            1000
        ).toFixed(0) + "K";

    }


    return Math.round(
        numeroValor
    ).toString();

}


/* =========================================================
   CONVERTIR A NÚMERO
========================================================= */

function numero(
    valor
) {

    if (
        typeof valor ===
        "number"
    ) {

        return Number.isFinite(
            valor
        )
            ? valor
            : 0;

    }


    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return 0;

    }


    let texto =
        String(valor)
            .trim()
            .replace(
                /\s/g,
                ""
            );


    /*
       Manejo de formatos:

       1.234.567,89
       1234567.89
       1234567
    */

    if (
        texto.includes(",") &&
        texto.includes(".")
    ) {

        if (
            texto.lastIndexOf(",") >
            texto.lastIndexOf(".")
        ) {

            texto =
                texto
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );

        } else {

            texto =
                texto.replace(
                    /,/g,
                    ""
                );

        }

    } else if (
        texto.includes(",")
    ) {

        texto =
            texto.replace(
                ",",
                "."
            );

    }


    texto =
        texto.replace(
            /[^\d.-]/g,
            ""
        );


    const resultado =
        Number(texto);


    return Number.isFinite(
        resultado
    )
        ? resultado
        : 0;

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   TEXTO
========================================================= */

function setText(
    elemento,
    texto
) {

    if (elemento) {

        elemento.textContent =
            texto;

    }

}


/* =========================================================
   ESTADO VACÍO
========================================================= */

function mostrarVacio(
    contenedor,
    mensaje
) {

    if (!contenedor)
        return;


    contenedor.innerHTML = `

        <div class="empty">

            ${escapeHTML(
                mensaje
            )}

        </div>

    `;

}


/* =========================================================
   ERROR DASHBOARD
========================================================= */

function mostrarErrorDashboard(
    error
) {

    console.error(
        error
    );


    const contenedores = [

        DOM.chartMonthly,

        DOM.barrasRegion,

        DOM.barrasCentro,

        DOM.topClientes

    ];


    contenedores.forEach(
        contenedor => {

            mostrarVacio(
                contenedor,
                "No se pudieron cargar los datos."
            );

        }
    );


    setText(
        DOM.filterCount,
        "Error al cargar datos"
    );


    setText(
        DOM.kpiPNV,
        "—"
    );


    setText(
        DOM.kpiClientes,
        "—"
    );


    setText(
        DOM.kpiCentros,
        "—"
    );


    setText(
        DOM.kpiRegiones,
        "—"
    );

}


/* =========================================================
   TOOLTIP
========================================================= */

function mostrarTooltip(
    event,
    contenido
) {

    if (!DOM.tooltip)
        return;


    DOM.tooltip.innerHTML =
        contenido;


    DOM.tooltip.classList.add(
        "show"
    );


    DOM.tooltip.setAttribute(
        "aria-hidden",
        "false"
    );


    posicionarTooltip(
        event
    );

}


/* =========================================================
   MOVER TOOLTIP
========================================================= */

function moverTooltip(
    event
) {

    posicionarTooltip(
        event
    );

}


/* =========================================================
   POSICIONAR TOOLTIP
========================================================= */

function posicionarTooltip(
    event
) {

    if (!DOM.tooltip)
        return;


    const separacion = 14;


    let x =
        event.clientX +
        separacion;


    let y =
        event.clientY +
        separacion;


    const rect =
        DOM.tooltip.getBoundingClientRect();


    if (
        x +
        rect.width >
        window.innerWidth -
        10
    ) {

        x =
            event.clientX -
            rect.width -
            separacion;

    }


    if (
        y +
        rect.height >
        window.innerHeight -
        10
    ) {

        y =
            event.clientY -
            rect.height -
            separacion;

    }


    DOM.tooltip.style.left =
        `${Math.max(
            8,
            x
        )}px`;


    DOM.tooltip.style.top =
        `${Math.max(
            8,
            y
        )}px`;

}


/* =========================================================
   OCULTAR TOOLTIP
========================================================= */

function ocultarTooltip() {

    if (!DOM.tooltip)
        return;


    DOM.tooltip.classList.remove(
        "show"
    );


    DOM.tooltip.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   ANIMACIÓN EXTRA PARA BARRAS
========================================================= */

function reiniciarAnimacionesBarras() {

    const barras =
        document.querySelectorAll(
            ".bar-fill"
        );


    barras.forEach(
        barra => {

            barra.style.animation =
                "none";


            void barra.offsetWidth;


            barra.style.animation =
                `grow ${CONFIG.DURACION_BARRAS}ms ease forwards`;

        }
    );

}


/* =========================================================
   OBSERVER PARA ANIMACIONES
========================================================= */

function configurarObserverAnimaciones() {

    if (
        !("IntersectionObserver" in window)
    ) {

        return;

    }


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "is-visible"
                            );

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.08
            }
        );


    document
        .querySelectorAll(
            ".kpi-card, .insight-card, .panel"
        )
        .forEach(
            elemento =>
                observer.observe(
                    elemento
                )
        );

}


/* =========================================================
   ACTUALIZAR ANIMACIONES DESPUÉS DE RENDER
========================================================= */

const observerOriginal =
    renderizarTodo;


renderizarTodo = function () {

    observerOriginal();

    setTimeout(
        reiniciarAnimacionesBarras,
        20
    );

    setTimeout(
        configurarObserverAnimaciones,
        30
    );

};


/* =========================================================
   ATAJOS DE TECLADO
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           ESC = limpiar búsqueda
        */

        if (
            event.key ===
            "Escape"
        ) {

            if (
                document.activeElement ===
                DOM.buscar
            ) {

                DOM.buscar.value = "";

                manejarFiltros();

            }

        }


        /*
           Ctrl + P = impresión
        */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "p"
        ) {

            /*
               Dejamos que el navegador
               maneje Ctrl+P normalmente.
            */

        }

    }
);


/* =========================================================
   LOG DE DIAGNÓSTICO
========================================================= */

console.log(
    "%cNestlé Dashboard V2",
    "font-size:18px;font-weight:bold;color:#0b7f88"
);

console.log(
    "Script compatible con index.html / style.css V2"
);

console.log(
    "Esperando datos_dashboard.json..."
);
