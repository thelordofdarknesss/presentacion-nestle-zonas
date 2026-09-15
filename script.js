/* ============================================================
   NESTLÉ CHILE — DASHBOARD COMERCIAL 2025
   SCRIPT.JS
   ============================================================ */

"use strict";

/* ============================================================
   ESTADO
   ============================================================ */

let datos = [];
let payload = null;

let ordenCol = "PNV_2025_CLP";
let ordenAsc = false;

let pagina = 1;
const porPagina = 15;


/* ============================================================
   SELECTORES
   ============================================================ */

const $ = id => document.getElementById(id);

const elCentro = $("f-centro");
const elRegion = $("f-region");
const elCiudad = $("f-ciudad");
const elCanal = $("f-canal");
const elBuscar = $("f-buscar");

const elCuerpo = $("cuerpo-tabla");
const elContador = $("contador");


/* ============================================================
   FORMATEADORES
   ============================================================ */

function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}


function fmt(valor) {
    return Math.round(numero(valor))
        .toLocaleString("es-CL");
}


function fmtDecimal(valor) {
    return numero(valor)
        .toLocaleString("es-CL", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        });
}


function fmtCompact(valor) {

    const n = numero(valor);

    if (Math.abs(n) >= 1e9) {
        return "$" +
            (n / 1e9).toLocaleString("es-CL", {
                maximumFractionDigits: 1
            }) +
            " mil M";
    }

    if (Math.abs(n) >= 1e6) {
        return "$" +
            (n / 1e6).toLocaleString("es-CL", {
                maximumFractionDigits: 1
            }) +
            " M";
    }

    if (Math.abs(n) >= 1e3) {
        return "$" +
            (n / 1e3).toLocaleString("es-CL", {
                maximumFractionDigits: 1
            }) +
            " mil";
    }

    return "$" + fmt(n);
}


function escapar(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   ANIMACIÓN DE NÚMEROS
   ============================================================ */

function animarNumero(elemento, destino, duracion = 1200, tipo = "normal") {

    if (!elemento) {
        return;
    }

    const objetivo = numero(destino);
    const inicio = performance.now();

    function frame(ahora) {

        const progreso =
            Math.min(
                (ahora - inicio) / duracion,
                1
            );

        /*
         * Easing:
         * empieza rápido y termina suavemente.
         */
        const easing =
            1 - Math.pow(1 - progreso, 3);

        const actual =
            objetivo * easing;

        if (tipo === "clp") {
            elemento.textContent =
                "$" + fmt(actual);
        } else {
            elemento.textContent =
                fmt(actual);
        }

        if (progreso < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}


/* ============================================================
   ANIMACIÓN DE TARJETAS
   ============================================================ */

function animarTarjetas() {

    const elementos =
        document.querySelectorAll(
            ".kpi-card, .insight-card, .panel"
        );

    elementos.forEach((elemento, indice) => {

        elemento.style.opacity = "0";
        elemento.style.transform =
            "translateY(15px)";

        setTimeout(() => {

            elemento.style.transition =
                "opacity .55s ease, transform .55s ease";

            elemento.style.opacity = "1";
            elemento.style.transform =
                "translateY(0)";

        }, 80 + indice * 70);
    });
}


/* ============================================================
   SELECTS
   ============================================================ */

function poblarSelect(elemento, opciones) {

    if (!elemento) {
        return;
    }

    opciones.forEach(valor => {

        const option =
            document.createElement("option");

        option.value = valor;
        option.textContent = valor;

        elemento.appendChild(option);
    });
}


/* ============================================================
   FILTROS
   ============================================================ */

function filtroActual() {

    return {

        centro:
            elCentro?.value || "",

        region:
            elRegion?.value || "",

        ciudad:
            elCiudad?.value || "",

        canal:
            elCanal?.value || "",

        buscar:
            (elBuscar?.value || "")
                .toLowerCase()
                .trim()
    };
}


function filtrar() {

    const filtro =
        filtroActual();

    return datos.filter(registro => {

        const coincideCentro =
            !filtro.centro ||
            registro.Centro_Origen === filtro.centro;

        const coincideRegion =
            !filtro.region ||
            registro.Region_Zona === filtro.region;

        const coincideCiudad =
            !filtro.ciudad ||
            registro.Ciudad === filtro.ciudad;

        const coincideCanal =
            !filtro.canal ||
            registro.Canal_L4 === filtro.canal;

        const texto =
            [
                registro.Cliente,
                registro.Canal_L4,
                registro.Ciudad,
                registro.Region_Zona,
                registro.Centro_Origen
            ]
                .map(x =>
                    String(x || "").toLowerCase()
                );

        const coincideBusqueda =
            !filtro.buscar ||
            texto.some(x =>
                x.includes(filtro.buscar)
            );

        return (
            coincideCentro &&
            coincideRegion &&
            coincideCiudad &&
            coincideCanal &&
            coincideBusqueda
        );
    });
}


/* ============================================================
   AGREGACIONES
   ============================================================ */

function aggregate(filas, campo) {

    const mapa = new Map();

    filas.forEach(registro => {

        const valor =
            registro[campo] || "Sin información";

        mapa.set(
            valor,
            (mapa.get(valor) || 0) + 1
        );
    });

    return [...mapa.entries()]
        .map(([label, value]) => ({
            label,
            value
        }))
        .sort(
            (a, b) =>
                b.value - a.value
        );
}


/* ============================================================
   KPI
   ============================================================ */

function pintarKPIs(filas) {

    const clientes =
        new Set(
            filas
                .map(x => x.Cliente)
                .filter(Boolean)
        ).size;

    const centros =
        new Set(
            filas
                .map(x => x.Centro_Origen)
                .filter(Boolean)
        ).size;

    const regiones =
        new Set(
            filas
                .map(x => x.Region_Zona)
                .filter(Boolean)
        ).size;

    const pnv =
        filas.reduce(
            (total, fila) =>
                total +
                numero(fila.PNV_2025_CLP),
            0
        );

    animarNumero(
        $("kpi-clientes"),
        clientes,
        900
    );

    animarNumero(
        $("kpi-centros"),
        centros,
        1000
    );

    animarNumero(
        $("kpi-regiones"),
        regiones,
        1100
    );

    animarNumero(
        $("kpi-pnv"),
        pnv,
        1400,
        "clp"
    );

    if ($("kpi-pnv-foot")) {

        $("kpi-pnv-foot").textContent =
            filas.length === datos.length
                ? "CLP · 2025 · total"
                : "CLP · 2025 · filtrado";
    }

    if ($("filter-count")) {

        $("filter-count").textContent =
            filas.length === datos.length
                ? "Vista completa"
                : `${fmt(filas.length)} registros filtrados`;
    }
}


/* ============================================================
   BARRAS
   ============================================================ */

function pintarBarras(id, datosBarras, clickFn) {

    const contenedor = $(id);

    if (!contenedor) {
        return;
    }

    if (!datosBarras.length) {

        contenedor.innerHTML = `
            <div class="empty">
                Sin resultados con los filtros actuales.
            </div>
        `;

        return;
    }

    const top =
        datosBarras.slice(0, 10);

    const maximo =
        top[0]?.value || 1;

    contenedor.innerHTML =
        top.map((item, indice) => {

            const porcentaje =
                (
                    item.value /
                    maximo *
                    100
                ).toFixed(1);

            return `
                <div
                    class="bar-row"
                    title="${escapar(item.label)}"
                    data-indice="${indice}"
                >

                    <span class="bar-label">
                        ${escapar(item.label)}
                    </span>

                    <div class="bar-track">

                        <div
                            class="bar-fill"
                            style="--w:${porcentaje}%"
                        ></div>

                    </div>

                    <span class="bar-num">
                        ${fmt(item.value)}
                    </span>

                </div>
            `;

        }).join("");

    const filas =
        contenedor.querySelectorAll(
            ".bar-row"
        );

    filas.forEach((fila, indice) => {

        fila.addEventListener(
            "click",
            () => {
                clickFn(top[indice].label);
            }
        );
    });
}


/* ============================================================
   INSIGHTS
   ============================================================ */

function pintarInsights(filas) {

    const regiones =
        aggregate(
            filas,
            "Region_Zona"
        );

    const centros =
        aggregate(
            filas,
            "Centro_Origen"
        );

    if ($("insight-region")) {

        $("insight-region").textContent =
            regiones[0]?.label || "—";
    }

    if ($("insight-region-detail")) {

        $("insight-region-detail").textContent =
            regiones[0]
                ? `${fmt(regiones[0].value)} clientes / subcuentas`
                : "Sin datos";
    }

    if ($("insight-centro")) {

        $("insight-centro").textContent =
            centros[0]?.label || "—";
    }

    if ($("insight-centro-detail")) {

        $("insight-centro-detail").textContent =
            centros[0]
                ? `${fmt(centros[0].value)} clientes / subcuentas`
                : "Sin datos";
    }

    const mensual =
        Array.isArray(payload?.mensual)
            ? payload.mensual
            : [];

    if (
        mensual.length &&
        filas.length === datos.length
    ) {

        const mejorMes =
            mensual.reduce(
                (mejor, actual) =>
                    numero(actual.pnv) >
                    numero(mejor.pnv)
                        ? actual
                        : mejor,
                mensual[0]
            );

        if ($("insight-month")) {

            $("insight-month").textContent =
                mejorMes.mes || "—";
        }

        if ($("insight-month-detail")) {

            $("insight-month-detail").textContent =
                mejorMes.pnv
                    ? `${fmtCompact(mejorMes.pnv)} PNV`
                    : "Sin datos";
        }

    } else {

        if ($("insight-month")) {
            $("insight-month").textContent =
                "Vista filtrada";
        }

        if ($("insight-month-detail")) {
            $("insight-month-detail").textContent =
                "El histórico mensual corresponde a la vista completa";
        }
    }
}


/* ============================================================
   TOP 10 CLIENTES
   ============================================================ */

function pintarTopClientes(filas) {

    const contenedor =
        $("top-clientes");

    if (!contenedor) {
        return;
    }

    const mapa = new Map();

    filas.forEach(registro => {

        const cliente =
            registro.Cliente ||
            "Sin cliente";

        const actual =
            mapa.get(cliente) || 0;

        mapa.set(
            cliente,
            actual +
            numero(registro.PNV_2025_CLP)
        );
    });

    const ranking =
        [...mapa.entries()]
            .map(([Cliente, PNV]) => ({
                Cliente,
                PNV
            }))
            .sort(
                (a, b) =>
                    b.PNV - a.PNV
            )
            .slice(0, 10);

    if (!ranking.length) {

        contenedor.innerHTML =
            `<div class="empty">Sin datos.</div>`;

        return;
    }

    const maximo =
        ranking[0].PNV || 1;

    contenedor.innerHTML =
        ranking.map((item, indice) => {

            const porcentaje =
                (
                    item.PNV /
                    maximo *
                    100
                ).toFixed(1);

            return `
                <div class="top-item">

                    <span class="rank">
                        ${String(indice + 1).padStart(2, "0")}
                    </span>

                    <span
                        class="top-name"
                        title="${escapar(item.Cliente)}"
                    >
                        ${escapar(item.Cliente)}
                    </span>

                    <span class="top-pnv">
                        ${fmtCompact(item.PNV)}
                    </span>

                    <span class="top-track">

                        <i
                            class="top-bar-animated"
                            style="--top-width:${porcentaje}%"
                        ></i>

                    </span>

                </div>
            `;
        }).join("");

    /*
     * Animación de cada cliente.
     */

    const barras =
        contenedor.querySelectorAll(
            ".top-bar-animated"
        );

    barras.forEach((barra, indice) => {

        barra.style.width = "0%";

        setTimeout(() => {

            barra.style.transition =
                "width 900ms cubic-bezier(.2,.7,.2,1)";

            barra.style.width =
                "var(--top-width)";

        }, 100 + indice * 80);
    });
}


/* ============================================================
   GRÁFICO MENSUAL
   ============================================================ */

function pathFor(puntos) {

    return puntos
        .map(
            (punto, indice) =>
                (indice ? "L" : "M") +
                punto.x.toFixed(1) +
                " " +
                punto.y.toFixed(1)
        )
        .join(" ");
}


function pintarMensual(filas) {

    const contenedor =
        $("chart-monthly");

    if (!contenedor) {
        return;
    }

    let serie = [];

    /*
     * Vista completa:
     * usamos directamente payload.mensual
     */
    if (
        filas.length === datos.length &&
        Array.isArray(payload?.mensual)
    ) {

        serie =
            payload.mensual.map(item => ({
                label: item.mes,
                value: numero(item.pnv),
                cajas: numero(item.cajas),
                clientes: numero(item.clientes)
            }));

    } else {

        /*
         * Con filtros no tenemos histórico mensual
         * en la tabla maestra.
         */
        const total =
            filas.reduce(
                (suma, fila) =>
                    suma +
                    numero(fila.PNV_2025_CLP),
                0
            );

        serie = [
            {
                label: "Filtrado",
                value: total
            }
        ];
    }

    if (serie.length < 2) {

        const valor =
            serie[0]?.value || 0;

        contenedor.innerHTML = `
            <div
                class="empty"
                style="padding-top:110px"
            >

                PNV de la vista actual:

                <strong>
                    ${fmtCompact(valor)}
                </strong>

                <br>

                <small>
                    El histórico mensual corresponde
                    a la vista completa 2025.
                </small>

            </div>
        `;

        return;
    }

    const W = 760;
    const H = 300;

    const pad = {
        l: 35,
        r: 20,
        t: 25,
        b: 40
    };

    const anchoInterno =
        W -
        pad.l -
        pad.r;

    const altoInterno =
        H -
        pad.t -
        pad.b;

    const maximo =
        Math.max(
            ...serie.map(
                item => item.value
            )
        ) * 1.08 || 1;

    const puntos =
        serie.map((item, indice) => {

            const x =
                pad.l +
                (
                    indice /
                    (serie.length - 1)
                ) *
                anchoInterno;

            const y =
                pad.t +
                altoInterno -
                (
                    item.value /
                    maximo
                ) *
                altoInterno;

            return {
                x,
                y
            };
        });

    const linea =
        pathFor(puntos);

    const ultimo =
        puntos[puntos.length - 1];

    const primero =
        puntos[0];

    const area =
        linea +
        ` L ${ultimo.x} ${H - pad.b}` +
        ` L ${primero.x} ${H - pad.b}` +
        " Z";

    const lineasGuia = [0, .25, .5, .75, 1]
        .map(porcentaje => {

            const y =
                pad.t +
                altoInterno *
                porcentaje;

            return `
                <line
                    class="grid-line"
                    x1="${pad.l}"
                    x2="${W - pad.r}"
                    y1="${y}"
                    y2="${y}"
                />

                <text
                    class="axis-label"
                    x="${pad.l}"
                    y="${y - 6}"
                >
                    ${fmtCompact(
                        maximo *
                        (1 - porcentaje)
                    ).replace("$", "")}
                </text>
            `;
        })
        .join("");

    const puntosSVG =
        puntos.map((punto, indice) => {

            const item =
                serie[indice];

            return `
                <circle
                    class="chart-point"
                    cx="${punto.x}"
                    cy="${punto.y}"
                    r="4.5"
                    data-indice="${indice}"
                />

                <text
                    class="axis-label"
                    text-anchor="middle"
                    x="${punto.x}"
                    y="${H - 10}"
                >
                    ${escapar(item.label)}
                </text>
            `;
        }).join("");

    contenedor.innerHTML = `

        <svg
            viewBox="0 0 ${W} ${H}"
            role="img"
            aria-label="Evolución mensual del PNV"
        >

            ${lineasGuia}

            <path
                class="chart-fill"
                d="${area}"
            />

            <path
                class="chart-line"
                d="${linea}"
            />

            ${puntosSVG}

        </svg>
    `;

    animarGrafico(contenedor);

    prepararTooltipsGrafico(
        contenedor,
        serie
    );
}


/* ============================================================
   ANIMACIÓN DEL GRÁFICO
   ============================================================ */

function animarGrafico(contenedor) {

    const linea =
        contenedor.querySelector(
            ".chart-line"
        );

    if (linea) {

        const longitud =
            linea.getTotalLength();

        linea.style.strokeDasharray =
            longitud;

        linea.style.strokeDashoffset =
            longitud;

        /*
         * Forzamos al navegador a registrar
         * el estado inicial antes de animar.
         */
        linea.getBoundingClientRect();

        linea.style.transition =
            "stroke-dashoffset 1.7s cubic-bezier(.2,.7,.2,1)";

        linea.style.strokeDashoffset =
            "0";
    }

    const puntos =
        contenedor.querySelectorAll(
            ".chart-point"
        );

    puntos.forEach((punto, indice) => {

        punto.style.opacity = "0";
        punto.style.transform =
            "scale(.3)";
        punto.style.transformBox =
            "fill-box";
        punto.style.transformOrigin =
            "center";

        setTimeout(() => {

            punto.style.transition =
                "opacity .35s ease, transform .35s ease";

            punto.style.opacity = "1";
            punto.style.transform =
                "scale(1)";

        }, 500 + indice * 80);
    });
}


/* ============================================================
   TOOLTIP
   ============================================================ */

function prepararTooltipsGrafico(
    contenedor,
    serie
) {

    const puntos =
        contenedor.querySelectorAll(
            ".chart-point"
        );

    puntos.forEach(punto => {

        const indice =
            Number(
                punto.dataset.indice
            );

        const dato =
            serie[indice];

        punto.addEventListener(
            "mouseenter",
            evento => {

                mostrarTooltip(
                    evento,
                    `
                        <b>${escapar(dato.label)}</b>
                        <br>
                        PNV:
                        ${fmt(dato.value)}
                        ${dato.cajas !== undefined
                            ? `<br>Cajas: ${fmtDecimal(dato.cajas)}`
                            : ""}
                        ${dato.clientes !== undefined
                            ? `<br>Clientes: ${fmt(dato.clientes)}`
                            : ""}
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

        /*
         * Click sobre un mes:
         * mostramos información en consola.
         */
        punto.addEventListener(
            "click",
            () => {

                console.log(
                    "[Dashboard] Mes seleccionado:",
                    dato
                );
            }
        );
    });
}


function mostrarTooltip(evento, html) {

    const tooltip =
        $("tooltip");

    if (!tooltip) {
        return;
    }

    tooltip.innerHTML =
        html;

    tooltip.classList.add(
        "show"
    );

    moverTooltip(evento);
}


function moverTooltip(evento) {

    const tooltip =
        $("tooltip");

    if (!tooltip) {
        return;
    }

    tooltip.style.left =
        `${evento.clientX + 14}px`;

    tooltip.style.top =
        `${evento.clientY + 14}px`;
}


function ocultarTooltip() {

    const tooltip =
        $("tooltip");

    if (tooltip) {

        tooltip.classList.remove(
            "show"
        );
    }
}


/* ============================================================
   TABLA
   ============================================================ */

function ordenarFilas(filas) {

    return filas.sort((a, b) => {

        let valorA =
            a[ordenCol] ?? "";

        let valorB =
            b[ordenCol] ?? "";

        const numeroA =
            Number(valorA);

        const numeroB =
            Number(valorB);

        if (
            Number.isFinite(numeroA) &&
            Number.isFinite(numeroB)
        ) {

            valorA = numeroA;
            valorB = numeroB;

        } else {

            valorA =
                String(valorA)
                    .toLowerCase();

            valorB =
                String(valorB)
                    .toLowerCase();
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


function renderTable() {

    if (!elCuerpo) {
        return;
    }

    let filas =
        filtrar();

    filas =
        ordenarFilas(filas);

    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                filas.length /
                porPagina
            )
        );

    if (pagina > totalPaginas) {
        pagina = totalPaginas;
    }

    const inicio =
        (pagina - 1) *
        porPagina;

    const vista =
        filas.slice(
            inicio,
            inicio + porPagina
        );

    const totalPNV =
        filas.reduce(
            (suma, fila) =>
                suma +
                numero(fila.PNV_2025_CLP),
            0
        );

    if (elContador) {

        elContador.textContent =
            `${fmt(filas.length)} registros · ${fmt(totalPNV)} CLP en la vista`;
    }

    if (!vista.length) {

        elCuerpo.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty">
                        No hay registros para
                        los filtros seleccionados.
                    </div>
                </td>
            </tr>
        `;

    } else {

        elCuerpo.innerHTML =
            vista.map(fila => {

                return `
                    <tr>

                        <td>
                            ${escapar(fila.Centro_Origen || "—")}
                        </td>

                        <td>
                            ${escapar(fila.Region_Zona || "—")}
                        </td>

                        <td>
                            ${escapar(fila.Ciudad || "—")}
                        </td>

                        <td>
                            ${escapar(fila.Canal_L4 || "—")}
                        </td>

                        <td>
                            ${escapar(fila.Cliente || "—")}
                        </td>

                        <td class="num">
                            ${fmt(fila.Meses_Con_Venta)}
                        </td>

                        <td class="num">
                            ${fmtDecimal(fila.Cajas_2025)}
                        </td>

                        <td class="num">
                            ${fmt(fila.PNV_2025_CLP)}
                        </td>

                    </tr>
                `;

            }).join("");
    }

    /*
     * Animación de filas.
     */

    const filasDOM =
        elCuerpo.querySelectorAll(
            "tr"
        );

    filasDOM.forEach(
        (fila, indice) => {

            fila.style.opacity = "0";
            fila.style.transform =
                "translateY(7px)";

            setTimeout(() => {

                fila.style.transition =
                    "opacity .25s ease, transform .25s ease";

                fila.style.opacity = "1";
                fila.style.transform =
                    "translateY(0)";

            }, indice * 25);
        }
    );

    if ($("page-info")) {

        $("page-info").textContent =
            `Página ${pagina} de ${totalPaginas}`;
    }

    if ($("prev-page")) {

        $("prev-page").disabled =
            pagina <= 1;
    }

    if ($("next-page")) {

        $("next-page").disabled =
            pagina >= totalPaginas;
    }
}


/* ============================================================
   RENDER PRINCIPAL
   ============================================================ */

function render() {

    const filas =
        filtrar();

    pintarKPIs(filas);

    pintarInsights(filas);

    pintarMensual(filas);

    pintarBarras(
        "barras-region",
        aggregate(
            filas,
            "Region_Zona"
        ),
        valor => {

            if (elRegion) {
                elRegion.value = valor;
            }

            pagina = 1;

            render();
        }
    );

    pintarBarras(
        "barras-centro",
        aggregate(
            filas,
            "Centro_Origen"
        ),
        valor => {

            if (elCentro) {
                elCentro.value = valor;
            }

            pagina = 1;

            render();
        }
    );

    pintarTopClientes(filas);

    renderTable();
}


/* ============================================================
   RESET
   ============================================================ */

function reset() {

    if (elCentro) {
        elCentro.value = "";
    }

    if (elRegion) {
        elRegion.value = "";
    }

    if (elCiudad) {
        elCiudad.value = "";
    }

    if (elCanal) {
        elCanal.value = "";
    }

    if (elBuscar) {
        elBuscar.value = "";
    }

    pagina = 1;

    ordenCol =
        "PNV_2025_CLP";

    ordenAsc = false;

    render();
}


/* ============================================================
   INICIALIZACIÓN
   ============================================================ */

function init() {

    /*
     * Cargar opciones.
     */

    poblarSelect(
        elCentro,
        payload?.opciones?.centros || []
    );

    poblarSelect(
        elRegion,
        payload?.opciones?.regiones || []
    );

    poblarSelect(
        elCiudad,
        payload?.opciones?.ciudades || []
    );

    poblarSelect(
        elCanal,
        payload?.opciones?.canales || []
    );


    /*
     * Eventos de filtros.
     */

    [
        elCentro,
        elRegion,
        elCiudad,
        elCanal
    ].forEach(elemento => {

        if (!elemento) {
            return;
        }

        elemento.addEventListener(
            "change",
            () => {

                pagina = 1;

                render();
            }
        );
    });


    /*
     * Buscador.
     */

    if (elBuscar) {

        elBuscar.addEventListener(
            "input",
            () => {

                pagina = 1;

                render();
            }
        );
    }


    /*
     * Restablecer.
     */

    if ($("btn-reset")) {

        $("btn-reset").addEventListener(
            "click",
            reset
        );
    }


    /*
     * PDF.
     */

    if ($("btn-pdf")) {

        $("btn-pdf").addEventListener(
            "click",
            () => {
                window.print();
            }
        );
    }


    /*
     * Paginación.
     */

    if ($("prev-page")) {

        $("prev-page").addEventListener(
            "click",
            () => {

                if (pagina > 1) {
                    pagina--;
                    render();
                }
            }
        );
    }


    if ($("next-page")) {

        $("next-page").addEventListener(
            "click",
            () => {

                pagina++;
                render();
            }
        );
    }


    /*
     * Ordenamiento.
     */

    document
        .querySelectorAll(
            "th[data-col]"
        )
        .forEach(th => {

            th.addEventListener(
                "click",
                () => {

                    const columna =
                        th.dataset.col;

                    if (
                        ordenCol === columna
                    ) {

                        ordenAsc =
                            !ordenAsc;

                    } else {

                        ordenCol =
                            columna;

                        ordenAsc = true;
                    }

                    pagina = 1;

                    render();
                }
            );
        });


    /*
     * Primer render.
     */

    render();


    /*
     * Animación general.
     */

    setTimeout(
        animarTarjetas,
        50
    );
}


/* ============================================================
   CARGA DEL JSON
   ============================================================ */

console.log(
    "========================================"
);

console.log(
    " NESTLÉ CHILE — DASHBOARD 2025"
);

console.log(
    " Cargando datos..."
);

console.log(
    "========================================"
);


fetch(
    "datos_dashboard.json?v=" +
    Date.now(),
    {
        cache: "no-store"
    }
)

    .then(respuesta => {

        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        return respuesta.json();
    })

    .then(json => {

        console.log(
            "[OK] datos_dashboard.json cargado."
        );

        console.log(
            "[INFO] Registros:",
            json.tabla?.length || 0
        );

        console.log(
            "[INFO] Meses:",
            json.mensual?.length || 0
        );

        payload = json;

        datos =
            Array.isArray(json.tabla)
                ? json.tabla
                : [];

        init();
    })

    .catch(error => {

        console.error(
            "[ERROR] Dashboard:",
            error
        );

        if (elContador) {

            elContador.textContent =
                "Error cargando datos_dashboard.json: " +
                error.message;
        }

        /*
         * Mostrar también el error en el gráfico
         * para que sea visible.
         */

        if ($("chart-monthly")) {

            $("chart-monthly").innerHTML = `
                <div class="empty">
                    <strong>
                        Error cargando el dashboard
                    </strong>
                    <br><br>
                    ${escapar(error.message)}
                </div>
            `;
        }
    });
