/* =========================================================
   NESTLÉ CHILE — DASHBOARD COMERCIAL 2025
   SCRIPT V2
========================================================= */


/* =========================================================
   VARIABLES GLOBALES
========================================================= */

let datos = [];

let datosOriginales = [];

let ordenCol = "PNV_2025_CLP";

let ordenAsc = false;

let paginaActual = 1;

const filasPorPagina = 15;


/* =========================================================
   ELEMENTOS DOM
========================================================= */

const elCentro =
    document.getElementById("f-centro");

const elRegion =
    document.getElementById("f-region");

const elCiudad =
    document.getElementById("f-ciudad");

const elCanal =
    document.getElementById("f-canal");

const elBuscar =
    document.getElementById("f-buscar");

const elCuerpo =
    document.getElementById("cuerpo-tabla");

const elContador =
    document.getElementById("contador");

const elPageInfo =
    document.getElementById("page-info");

const elPrevPage =
    document.getElementById("prev-page");

const elNextPage =
    document.getElementById("next-page");

const elFilterCount =
    document.getElementById("filter-count");

const elTooltip =
    document.getElementById("tooltip");


/* =========================================================
   FORMATEADORES
========================================================= */


/**
 * Convierte un valor a número seguro.
 */
function numero(valor) {

    if (valor === null ||
        valor === undefined ||
        valor === "") {

        return 0;
    }

    const n = Number(
        String(valor)
            .replace(/\./g, "")
            .replace(",", ".")
    );

    return Number.isFinite(n) ? n : 0;
}


/**
 * Formato numérico Chile.
 */
function formatoNumero(valor) {

    return Math.round(
        numero(valor)
    ).toLocaleString("es-CL");
}


/**
 * Formato monetario corto.
 *
 * Ejemplo:
 * 187473235028
 * → $187,5 B
 */
function formatoCompacto(valor) {

    const n = numero(valor);

    if (Math.abs(n) >= 1000000000) {

        return (
            "$" +
            (n / 1000000000)
                .toLocaleString("es-CL", {
                    maximumFractionDigits: 1
                }) +
            " B"
        );
    }


    if (Math.abs(n) >= 1000000) {

        return (
            "$" +
            (n / 1000000)
                .toLocaleString("es-CL", {
                    maximumFractionDigits: 1
                }) +
            " M"
        );
    }


    if (Math.abs(n) >= 1000) {

        return (
            "$" +
            (n / 1000)
                .toLocaleString("es-CL", {
                    maximumFractionDigits: 1
                }) +
            " K"
        );
    }


    return "$" + formatoNumero(n);
}


/**
 * Formato monetario completo.
 */
function formatoCLP(valor) {

    return (
        "$" +
        formatoNumero(valor)
    );
}


/**
 * Escapa HTML para evitar que datos
 * provenientes del JSON rompan la página.
 */
function escapeHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   CIUDAD
========================================================= */

function extraerCiudad(regionZona) {

    if (!regionZona) {

        return "—";
    }


    const texto =
        String(regionZona).trim();


    if (texto.includes(" - ")) {

        return texto
            .split(" - ")
            .slice(1)
            .join(" - ")
            .trim();
    }


    if (texto.includes("-")) {

        return texto
            .split("-")
            .slice(1)
            .join("-")
            .trim();
    }


    return texto;
}


/* =========================================================
   CARGA DEL JSON
========================================================= */

async function cargarDatos() {

    try {

        const respuesta =
            await fetch(
                "datos_dashboard.json"
            );


        if (!respuesta.ok) {

            throw new Error(
                `No se pudo cargar datos_dashboard.json (HTTP ${respuesta.status})`
            );
        }


        const payload =
            await respuesta.json();


        datos =
            Array.isArray(payload.tabla)
                ? payload.tabla
                : [];


        /* -----------------------------------------
           NORMALIZACIÓN
        ------------------------------------------ */

        datos.forEach(fila => {

            if (!fila.Ciudad) {

                fila.Ciudad =
                    extraerCiudad(
                        fila.Region_Zona
                    );
            }

        });


        datosOriginales =
            [...datos];


        /* -----------------------------------------
           SELECTS
        ------------------------------------------ */

        prepararFiltros(payload);


        /* -----------------------------------------
           PRIMERA VISTA
        ------------------------------------------ */

        renderTodo();


        /* -----------------------------------------
           EVENTOS
        ------------------------------------------ */

        iniciarEventos();


    } catch (error) {

        console.error(error);

        if (elContador) {

            elContador.textContent =
                "Error cargando datos: " +
                error.message;
        }

    }

}


/* =========================================================
   PREPARAR FILTROS
========================================================= */

function prepararFiltros(payload) {

    const opciones =
        payload.opciones || {};


    poblarSelect(
        elCentro,
        opciones.centros ||
        obtenerUnicos("Centro_Origen")
    );


    poblarSelect(
        elRegion,
        opciones.regiones ||
        obtenerUnicos("Region_Zona")
    );


    poblarSelect(
        elCiudad,
        opciones.ciudades ||
        obtenerUnicos("Ciudad")
    );


    poblarSelect(
        elCanal,
        opciones.canales ||
        obtenerUnicos("Canal_L4")
    );

}


/* =========================================================
   OPCIONES ÚNICAS
========================================================= */

function obtenerUnicos(campo) {

    return [
        ...new Set(
            datos
                .map(f => f[campo])
                .filter(
                    valor =>
                        valor !== null &&
                        valor !== undefined &&
                        String(valor).trim() !== ""
                )
                .map(valor =>
                    String(valor).trim()
                )
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
   POBLAR SELECT
========================================================= */

function poblarSelect(
    select,
    opciones
) {

    if (!select) return;


    /*
       Conservamos la primera opción:
       "Todos..."
    */

    const primera =
        select.options[0];


    select.innerHTML = "";


    if (primera) {

        select.appendChild(
            primera
        );
    }


    if (!Array.isArray(opciones)) {

        return;
    }


    opciones.forEach(opcion => {

        if (
            opcion === null ||
            opcion === undefined ||
            String(opcion).trim() === ""
        ) {

            return;
        }


        const option =
            document.createElement("option");


        option.value =
            opcion;


        option.textContent =
            opcion;


        select.appendChild(
            option
        );

    });

}


/* =========================================================
   FILTROS ACTIVOS
========================================================= */

function obtenerFilasFiltradas() {

    const centro =
        elCentro?.value || "";


    const region =
        elRegion?.value || "";


    const ciudad =
        elCiudad?.value || "";


    const canal =
        elCanal?.value || "";


    const busqueda =
        (
            elBuscar?.value ||
            ""
        )
            .toLowerCase()
            .trim();


    /*
       filter() genera un nuevo array,
       por lo que no destruimos datosOriginales.
    */

    return datos.filter(fila => {


        const coincideCentro =
            !centro ||
            fila.Centro_Origen === centro;


        const coincideRegion =
            !region ||
            fila.Region_Zona === region;


        const coincideCiudad =
            !ciudad ||
            fila.Ciudad === ciudad;


        const coincideCanal =
            !canal ||
            fila.Canal_L4 === canal;


        const textoBusqueda =
            [
                fila.Cliente,
                fila.Canal_L4,
                fila.Ciudad,
                fila.Region_Zona,
                fila.Centro_Origen
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


        const coincideBusqueda =
            !busqueda ||
            textoBusqueda.includes(
                busqueda
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


/* =========================================================
   ORDENAMIENTO
========================================================= */

function ordenarFilas(filas) {

    /*
       Creamos una copia para no alterar
       el array original.
    */

    return [...filas].sort(
        (a, b) => {

            let va =
                a[ordenCol];

            let vb =
                b[ordenCol];


            const numeroA =
                numero(va);

            const numeroB =
                numero(vb);


            const ambosNumericos =
                (
                    typeof va === "number" ||
                    !Number.isNaN(
                        Number(va)
                    )
                ) &&
                (
                    typeof vb === "number" ||
                    !Number.isNaN(
                        Number(vb)
                    )
                );


            if (ambosNumericos) {

                return ordenAsc
                    ? numeroA - numeroB
                    : numeroB - numeroA;
            }


            va =
                String(
                    va ?? ""
                ).toLowerCase();


            vb =
                String(
                    vb ?? ""
                ).toLowerCase();


            const resultado =
                va.localeCompare(
                    vb,
                    "es",
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );


            return ordenAsc
                ? resultado
                : -resultado;

        }
    );

}


/* =========================================================
   RENDER GENERAL
========================================================= */

function renderTodo() {

    const filas =
        ordenarFilas(
            obtenerFilasFiltradas()
        );


    actualizarKPIs(
        filas
    );


    actualizarInsights(
        filas
    );


    pintarGraficoMensual(
        filas
    );


    pintarBarrasRegion(
        filas
    );


    pintarBarrasCentro(
        filas
    );


    pintarTopClientes(
        filas
    );


    paginaActual = 1;


    renderTabla(
        filas
    );


    actualizarEstadoFiltros(
        filas
    );

}


/* =========================================================
   KPIs
========================================================= */

function actualizarKPIs(filas) {

    const clientes =
        new Set(
            filas
                .map(f =>
                    f.Cliente
                )
                .filter(Boolean)
        ).size;


    const centros =
        new Set(
            filas
                .map(f =>
                    f.Centro_Origen
                )
                .filter(Boolean)
        ).size;


    const regiones =
        new Set(
            filas
                .map(f =>
                    f.Region_Zona
                )
                .filter(Boolean)
        ).size;


    const pnv =
        filas.reduce(
            (
                total,
                fila
            ) =>
                total +
                numero(
                    fila.PNV_2025_CLP
                ),
            0
        );


    const kpiClientes =
        document.getElementById(
            "kpi-clientes"
        );


    const kpiCentros =
        document.getElementById(
            "kpi-centros"
        );


    const kpiRegiones =
        document.getElementById(
            "kpi-regiones"
        );


    const kpiPNV =
        document.getElementById(
            "kpi-pnv"
        );


    if (kpiClientes) {

        animarNumero(
            kpiClientes,
            clientes,
            false
        );
    }


    if (kpiCentros) {

        animarNumero(
            kpiCentros,
            centros,
            false
        );
    }


    if (kpiRegiones) {

        animarNumero(
            kpiRegiones,
            regiones,
            false
        );
    }


    if (kpiPNV) {

        animarNumero(
            kpiPNV,
            pnv,
            true
        );
    }


    const foot =
        document.getElementById(
            "kpi-pnv-foot"
        );


    if (foot) {

        foot.textContent =
            filas.length === datos.length
                ? "CLP · 2025 · Total nacional"
                : "CLP · 2025 · Vista filtrada";
    }

}


/* =========================================================
   ANIMACIÓN KPI
========================================================= */

function animarNumero(
    elemento,
    destino,
    esDinero
) {

    const valorInicial =
        numero(
            elemento.dataset.valor ||
            0
        );


    elemento.dataset.valor =
        destino;


    const duracion =
        500;


    const inicio =
        performance.now();


    function actualizar(
        tiempo
    ) {

        const progreso =
            Math.min(
                (
                    tiempo -
                    inicio
                ) / duracion,
                1
            );


        const suavizado =
            1 -
            Math.pow(
                1 - progreso,
                3
            );


        const valor =
            valorInicial +
            (
                destino -
                valorInicial
            ) *
            suavizado;


        if (esDinero) {

            elemento.textContent =
                formatoCompacto(
                    valor
                );

        } else {

            elemento.textContent =
                formatoNumero(
                    valor
                );
        }


        if (progreso < 1) {

            requestAnimationFrame(
                actualizar
            );

        }

    }


    requestAnimationFrame(
        actualizar
    );

}


/* =========================================================
   INSIGHTS
========================================================= */

function actualizarInsights(filas) {

    /* -----------------------------------------
       REGIÓN
    ------------------------------------------ */

    const regiones =
        agruparCantidad(
            filas,
            "Region_Zona"
        );


    const mejorRegion =
        regiones[0];


    const regionNombre =
        document.getElementById(
            "insight-region"
        );


    const regionDetalle =
        document.getElementById(
            "insight-region-detail"
        );


    if (mejorRegion) {

        regionNombre.textContent =
            mejorRegion.nombre;


        regionDetalle.textContent =
            formatoNumero(
                mejorRegion.valor
            ) +
            " clientes";

    } else {

        regionNombre.textContent =
            "—";

        regionDetalle.textContent =
            "Sin datos";
    }


    /* -----------------------------------------
       CENTRO
    ------------------------------------------ */

    const centros =
        agruparCantidad(
            filas,
            "Centro_Origen"
        );


    const mejorCentro =
        centros[0];


    const centroNombre =
        document.getElementById(
            "insight-centro"
        );


    const centroDetalle =
        document.getElementById(
            "insight-centro-detail"
        );


    if (mejorCentro) {

        centroNombre.textContent =
            mejorCentro.nombre;


        centroDetalle.textContent =
            formatoNumero(
                mejorCentro.valor
            ) +
            " clientes";

    } else {

        centroNombre.textContent =
            "—";

        centroDetalle.textContent =
            "Sin datos";
    }


    /* -----------------------------------------
       MES MAYOR PNV
    ------------------------------------------ */

    const mensual =
        calcularMensual(
            filas
        );


    const mejorMes =
        [...mensual]
            .sort(
                (a, b) =>
                    b.valor -
                    a.valor
            )[0];


    const mesNombre =
        document.getElementById(
            "insight-month"
        );


    const mesDetalle =
        document.getElementById(
            "insight-month-detail"
        );


    if (
        mejorMes &&
        mejorMes.valor > 0
    ) {

        mesNombre.textContent =
            mejorMes.nombre;


        mesDetalle.textContent =
            formatoCompacto(
                mejorMes.valor
            );

    } else {

        mesNombre.textContent =
            "—";

        mesDetalle.textContent =
            "Sin información mensual";
    }

}


/* =========================================================
   AGRUPAR CANTIDAD
========================================================= */

function agruparCantidad(
    filas,
    campo
) {

    const mapa =
        new Map();


    filas.forEach(fila => {

        const nombre =
            fila[campo] ||
            "—";


        mapa.set(
            nombre,
            (
                mapa.get(nombre) ||
                0
            ) + 1
        );

    });


    return [
        ...mapa.entries()
    ]
        .map(
            ([nombre, valor]) => ({
                nombre,
                valor
            })
        )
        .sort(
            (a, b) =>
                b.valor -
                a.valor
        );

}


/* =========================================================
   BARRAS REGIÓN
========================================================= */

function pintarBarrasRegion(
    filas
) {

    pintarBarrasGenericas(
        "barras-region",
        agruparCantidad(
            filas,
            "Region_Zona"
        ),
        "region"
    );

}


/* =========================================================
   BARRAS CENTRO
========================================================= */

function pintarBarrasCentro(
    filas
) {

    pintarBarrasGenericas(
        "barras-centro",
        agruparCantidad(
            filas,
            "Centro_Origen"
        ),
        "centro"
    );

}


/* =========================================================
   BARRAS GENERICAS
========================================================= */

function pintarBarrasGenericas(
    contenedorId,
    filas,
    tipo
) {

    const contenedor =
        document.getElementById(
            contenedorId
        );


    if (!contenedor) return;


    if (
        !Array.isArray(filas) ||
        filas.length === 0
    ) {

        contenedor.innerHTML =
            `<div class="empty">
                No hay datos para esta selección.
             </div>`;

        return;
    }


    /*
       Mostramos máximo 10.
    */

    const top =
        filas.slice(
            0,
            10
        );


    const maximo =
        Math.max(
            ...top.map(
                f =>
                    numero(
                        f.valor
                    )
            )
        );


    contenedor.innerHTML =
        top
            .map(fila => {

                const porcentaje =
                    maximo
                        ? (
                            fila.valor /
                            maximo
                        ) *
                        100
                        : 0;


                const nombre =
                    escapeHTML(
                        fila.nombre
                    );


                return `
                    <div
                        class="bar-row"
                        data-tipo="${tipo}"
                        data-valor="${nombre}"
                        title="Filtrar por ${nombre}"
                    >

                        <span class="bar-label">
                            ${nombre}
                        </span>

                        <div class="bar-track">

                            <div
                                class="bar-fill"
                                style="--w:${porcentaje}%"
                            ></div>

                        </div>

                        <span class="bar-num">
                            ${formatoNumero(fila.valor)}
                        </span>

                    </div>
                `;

            })
            .join("");


    /*
       Click sobre las barras.
    */

    contenedor
        .querySelectorAll(
            ".bar-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    const tipo =
                        row.dataset.tipo;


                    const valor =
                        row.dataset.valor;


                    if (
                        tipo ===
                        "region"
                    ) {

                        seleccionarFiltro(
                            elRegion,
                            valor
                        );

                    }


                    if (
                        tipo ===
                        "centro"
                    ) {

                        seleccionarFiltro(
                            elCentro,
                            valor
                        );

                    }


                    paginaActual = 1;


                    renderTodo();

                }
            );

        });

}


/* =========================================================
   SELECCIONAR FILTRO
========================================================= */

function seleccionarFiltro(
    select,
    valor
) {

    if (!select) return;


    const opcion =
        [
            ...select.options
        ]
            .find(
                option =>
                    option.value ===
                    valor
            );


    if (opcion) {

        select.value =
            valor;

    }

}


/* =========================================================
   TOP CLIENTES
========================================================= */

function pintarTopClientes(
    filas
) {

    const contenedor =
        document.getElementById(
            "top-clientes"
        );


    if (!contenedor) return;


    const mapa =
        new Map();


    filas.forEach(fila => {

        const cliente =
            fila.Cliente ||
            "Cliente sin nombre";


        const actual =
            mapa.get(
                cliente
            ) ||
            0;


        mapa.set(
            cliente,
            actual +
            numero(
                fila.PNV_2025_CLP
            )
        );

    });


    const ranking =
        [
            ...mapa.entries()
        ]
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


    if (ranking.length === 0) {

        contenedor.innerHTML =
            `<div class="empty">
                No hay clientes para esta selección.
             </div>`;

        return;
    }


    const maximo =
        ranking[0].pnv;


    contenedor.innerHTML =
        ranking
            .map(
                (cliente, indice) => {

                    const porcentaje =
                        maximo
                            ? (
                                cliente.pnv /
                                maximo
                            ) *
                            100
                            : 0;


                    return `
                        <div class="top-item">

                            <span class="rank">
                                ${String(
                                    indice + 1
                                ).padStart(2, "0")}
                            </span>

                            <span
                                class="top-name"
                                title="${escapeHTML(
                                    cliente.nombre
                                )}"
                            >
                                ${escapeHTML(
                                    cliente.nombre
                                )}
                            </span>

                            <span class="top-pnv">
                                ${formatoCompacto(
                                    cliente.pnv
                                )}
                            </span>

                            <div class="top-track">

                                <i
                                    style="width:${porcentaje}%"
                                ></i>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   DATOS MENSUALES
========================================================= */

function calcularMensual(
    filas
) {

    /*
       El JSON puede traer campos mensuales
       con nombres diferentes.

       Buscamos automáticamente columnas
       que parezcan corresponder a meses.
    */


    const mesesDefinidos = [
        {
            claves: [
                "Enero",
                "enero",
                "PNV_Enero",
                "PNV_Enero_2025",
                "PNV_2025_01",
                "01"
            ],
            nombre: "Ene"
        },
        {
            claves: [
                "Febrero",
                "febrero",
                "PNV_Febrero",
                "PNV_Febrero_2025",
                "PNV_2025_02",
                "02"
            ],
            nombre: "Feb"
        },
        {
            claves: [
                "Marzo",
                "marzo",
                "PNV_Marzo",
                "PNV_Marzo_2025",
                "PNV_2025_03",
                "03"
            ],
            nombre: "Mar"
        },
        {
            claves: [
                "Abril",
                "abril",
                "PNV_Abril",
                "PNV_Abril_2025",
                "PNV_2025_04",
                "04"
            ],
            nombre: "Abr"
        },
        {
            claves: [
                "Mayo",
                "mayo",
                "PNV_Mayo",
                "PNV_Mayo_2025",
                "PNV_2025_05",
                "05"
            ],
            nombre: "May"
        },
        {
            claves: [
                "Junio",
                "junio",
                "PNV_Junio",
                "PNV_Junio_2025",
                "PNV_2025_06",
                "06"
            ],
            nombre: "Jun"
        },
        {
            claves: [
                "Julio",
                "julio",
                "PNV_Julio",
                "PNV_Julio_2025",
                "PNV_2025_07",
                "07"
            ],
            nombre: "Jul"
        },
        {
            claves: [
                "Agosto",
                "agosto",
                "PNV_Agosto",
                "PNV_Agosto_2025",
                "PNV_2025_08",
                "08"
            ],
            nombre: "Ago"
        },
        {
            claves: [
                "Septiembre",
                "septiembre",
                "PNV_Septiembre",
                "PNV_Septiembre_2025",
                "PNV_2025_09",
                "09"
            ],
            nombre: "Sep"
        },
        {
            claves: [
                "Octubre",
                "octubre",
                "PNV_Octubre",
                "PNV_Octubre_2025",
                "PNV_2025_10",
                "10"
            ],
            nombre: "Oct"
        },
        {
            claves: [
                "Noviembre",
                "noviembre",
                "PNV_Noviembre",
                "PNV_Noviembre_2025",
                "PNV_2025_11",
                "11"
            ],
            nombre: "Nov"
        },
        {
            claves: [
                "Diciembre",
                "diciembre",
                "PNV_Diciembre",
                "PNV_Diciembre_2025",
                "PNV_2025_12",
                "12"
            ],
            nombre: "Dic"
        }
    ];


    return mesesDefinidos.map(
        mes => {

            let claveEncontrada =
                null;


            /*
               Buscar directamente en el primer
               registro disponible.
            */

            const ejemplo =
                filas[0];


            if (ejemplo) {

                claveEncontrada =
                    mes.claves.find(
                        clave =>
                            Object.prototype
                                .hasOwnProperty
                                .call(
                                    ejemplo,
                                    clave
                                )
                    );

            }


            /*
               Si encontramos una columna,
               sumamos todos sus registros.
            */

            let total = 0;


            if (claveEncontrada) {

                total =
                    filas.reduce(
                        (
                            suma,
                            fila
                        ) =>
                            suma +
                            numero(
                                fila[
                                    claveEncontrada
                                ]
                            ),
                        0
                    );

            }


            return {
                nombre:
                    mes.nombre,

                valor:
                    total
            };

        }
    );

}


/* =========================================================
   GRAFICO MENSUAL
========================================================= */

function pintarGraficoMensual(
    filas
) {

    const contenedor =
        document.getElementById(
            "chart-monthly"
        );


    if (!contenedor) return;


    const datosMensuales =
        calcularMensual(
            filas
        );


    /*
       Si el JSON no contiene información
       mensual, mostramos un mensaje.
    */

    const tieneDatos =
        datosMensuales.some(
            item =>
                item.valor > 0
        );


    if (!tieneDatos) {

        contenedor.innerHTML = `
            <div
                class="empty"
                style="
                    height:100%;
                    display:grid;
                    place-items:center;
                "
            >
                No hay columnas mensuales disponibles
                en el JSON actual.
            </div>
        `;

        return;
    }


    const width = 760;

    const height = 285;

    const margen = {
        top: 15,
        right: 20,
        bottom: 40,
        left: 58
    };


    const innerWidth =
        width -
        margen.left -
        margen.right;


    const innerHeight =
        height -
        margen.top -
        margen.bottom;


    const maximo =
        Math.max(
            ...datosMensuales.map(
                d =>
                    d.valor
            )
        );


    const escalaMax =
        maximo > 0
            ? maximo * 1.15
            : 1;


    const puntos =
        datosMensuales.map(
            (dato, indice) => {

                const x =
                    margen.left +
                    (
                        indice /
                        (
                            datosMensuales.length -
                            1
                        )
                    ) *
                    innerWidth;


                const y =
                    margen.top +
                    innerHeight -
                    (
                        dato.valor /
                        escalaMax
                    ) *
                    innerHeight;


                return {
                    ...dato,
                    x,
                    y
                };

            }
        );


    /* -----------------------------------------
       LINEA
    ------------------------------------------ */

    const linea =
        puntos
            .map(
                (
                    punto,
                    indice
                ) =>
                    `${indice === 0 ? "M" : "L"} ${punto.x} ${punto.y}`
            )
            .join(" ");


    /* -----------------------------------------
       AREA
    ------------------------------------------ */

    const baseY =
        margen.top +
        innerHeight;


    const area =
        linea +
        ` L ${puntos[puntos.length - 1].x} ${baseY}` +
        ` L ${puntos[0].x} ${baseY} Z`;


    /* -----------------------------------------
       GRID
    ------------------------------------------ */

    const gridCantidad = 4;


    let gridHTML = "";


    for (
        let i = 0;
        i <= gridCantidad;
        i++
    ) {

        const y =
            margen.top +
            (
                i /
                gridCantidad
            ) *
            innerHeight;


        const valor =
            escalaMax *
            (
                1 -
                i /
                gridCantidad
            );


        gridHTML += `
            <line
                x1="${margen.left}"
                y1="${y}"
                x2="${width - margen.right}"
                y2="${y}"
                class="grid-line"
            />

            <text
                x="${margen.left - 8}"
                y="${y + 4}"
                text-anchor="end"
                class="axis-label"
            >
                ${formatoCompacto(valor)}
            </text>
        `;

    }


    /* -----------------------------------------
       MESES
    ------------------------------------------ */

    const labels =
        puntos
            .map(
                punto => `
                    <text
                        x="${punto.x}"
                        y="${height - 13}"
                        text-anchor="middle"
                        class="axis-label"
                    >
                        ${punto.nombre}
                    </text>
                `
            )
            .join("");


    /* -----------------------------------------
       PUNTOS
    ------------------------------------------ */

    const puntosHTML =
        puntos
            .map(
                punto => `
                    <circle
                        cx="${punto.x}"
                        cy="${punto.y}"
                        r="5"
                        class="chart-point"
                        data-month="${punto.nombre}"
                        data-value="${punto.valor}"
                    ></circle>
                `
            )
            .join("");


    contenedor.innerHTML = `
        <svg
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="none"
            role="img"
            aria-label="Evolución mensual del PNV"
        >

            ${gridHTML}

            <path
                d="${area}"
                class="chart-fill"
            ></path>

            <path
                d="${linea}"
                class="chart-line"
            ></path>

            ${puntosHTML}

            ${labels}

        </svg>
    `;


    /*
       Tooltips.
    */

    contenedor
        .querySelectorAll(
            ".chart-point"
        )
        .forEach(punto => {

            punto.addEventListener(
                "mouseenter",
                evento => {

                    const mes =
                        punto.dataset.month;


                    const valor =
                        numero(
                            punto.dataset.value
                        );


                    mostrarTooltip(
                        evento.clientX,
                        evento.clientY,
                        `<strong>${escapeHTML(mes)}</strong><br>${formatoCLP(valor)}`
                    );

                }
            );


            punto.addEventListener(
                "mousemove",
                evento => {

                    moverTooltip(
                        evento.clientX,
                        evento.clientY
                    );

                }
            );


            punto.addEventListener(
                "mouseleave",
                ocultarTooltip
            );

        });

}


/* =========================================================
   TOOLTIP
========================================================= */

function mostrarTooltip(
    x,
    y,
    contenido
) {

    if (!elTooltip) return;


    elTooltip.innerHTML =
        contenido;


    elTooltip.classList.add(
        "show"
    );


    moverTooltip(
        x,
        y
    );

}


function moverTooltip(
    x,
    y
) {

    if (!elTooltip) return;


    const margen = 14;


    elTooltip.style.left =
        (
            x +
            margen
        ) +
        "px";


    elTooltip.style.top =
        (
            y +
            margen
        ) +
        "px";

}


function ocultarTooltip() {

    if (!elTooltip) return;


    elTooltip.classList.remove(
        "show"
    );

}


/* =========================================================
   TABLA
========================================================= */

function renderTabla(
    filas
) {

    if (!elCuerpo) return;


    const total =
        filas.length;


    const paginas =
        Math.max(
            1,
            Math.ceil(
                total /
                filasPorPagina
            )
        );


    if (
        paginaActual >
        paginas
    ) {

        paginaActual =
            paginas;
    }


    const inicio =
        (
            paginaActual -
            1
        ) *
        filasPorPagina;


    const fin =
        inicio +
        filasPorPagina;


    const filasPagina =
        filas.slice(
            inicio,
            fin
        );


    if (
        filasPagina.length ===
        0
    ) {

        elCuerpo.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="empty"
                >
                    No hay registros que coincidan
                    con los filtros.
                </td>
            </tr>
        `;

    } else {

        elCuerpo.innerHTML =
            filasPagina
                .map(
                    fila => `
                        <tr>

                            <td>
                                ${escapeHTML(
                                    fila.Centro_Origen ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    fila.Region_Zona ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    fila.Ciudad ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    fila.Canal_L4 ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    fila.Cliente ||
                                    "—"
                                )}
                            </td>

                            <td class="num">
                                ${formatoNumero(
                                    fila.Meses_Con_Venta
                                )}
                            </td>

                            <td class="num">
                                ${formatoNumero(
                                    fila.Cajas_2025
                                )}
                            </td>

                            <td class="num">
                                ${formatoCLP(
                                    fila.PNV_2025_CLP
                                )}
                            </td>

                        </tr>
                    `
                )
                .join("");

    }


    actualizarPaginacion(
        total,
        paginas
    );

}


/* =========================================================
   PAGINACIÓN
========================================================= */

function actualizarPaginacion(
    total,
    paginas
) {

    if (elPageInfo) {

        if (total === 0) {

            elPageInfo.textContent =
                "Sin resultados";

        } else {

            const inicio =
                (
                    paginaActual -
                    1
                ) *
                filasPorPagina +
                1;


            const fin =
                Math.min(
                    paginaActual *
                    filasPorPagina,
                    total
                );


            elPageInfo.textContent =
                `${inicio}–${fin} de ${total}`;
        }

    }


    if (elPrevPage) {

        elPrevPage.disabled =
            paginaActual <= 1;
    }


    if (elNextPage) {

        elNextPage.disabled =
            paginaActual >= paginas;
    }


    if (elContador) {

        elContador.textContent =
            `${formatoNumero(total)} registros encontrados`;
    }

}


/* =========================================================
   ESTADO DE FILTROS
========================================================= */

function actualizarEstadoFiltros(
    filas
) {

    if (!elFilterCount) return;


    const hayFiltros =
        Boolean(
            elCentro?.value ||
            elRegion?.value ||
            elCiudad?.value ||
            elCanal?.value ||
            elBuscar?.value.trim()
        );


    if (!hayFiltros) {

        elFilterCount.textContent =
            "Vista completa";

    } else {

        elFilterCount.textContent =
            `${formatoNumero(filas.length)} resultados filtrados`;

    }

}


/* =========================================================
   EVENTOS
========================================================= */

function iniciarEventos() {

    /*
       Filtros.
    */

    [
        elCentro,
        elRegion,
        elCiudad,
        elCanal
    ]
        .forEach(
            elemento => {

                if (!elemento) return;


                elemento.addEventListener(
                    "change",
                    () => {

                        paginaActual =
                            1;

                        renderTodo();

                    }
                );

            }
        );


    /*
       Buscador.
    */

    if (elBuscar) {

        elBuscar.addEventListener(
            "input",
            () => {

                paginaActual =
                    1;

                renderTodo();

            }
        );

    }


    /*
       Ordenamiento de columnas.
    */

    document
        .querySelectorAll(
            "th[data-col]"
        )
        .forEach(
            th => {

                th.addEventListener(
                    "click",
                    () => {

                        const columna =
                            th.dataset.col;


                        if (
                            ordenCol ===
                            columna
                        ) {

                            ordenAsc =
                                !ordenAsc;

                        } else {

                            ordenCol =
                                columna;

                            ordenAsc =
                                true;

                        }


                        renderTodo();

                    }
                );

            }
        );


    /*
       Página anterior.
    */

    if (elPrevPage) {

        elPrevPage.addEventListener(
            "click",
            () => {

                if (
                    paginaActual >
                    1
                ) {

                    paginaActual--;

                    renderTabla(
                        ordenarFilas(
                            obtenerFilasFiltradas()
                        )
                    );

                }

            }
        );

    }


    /*
       Página siguiente.
    */

    if (elNextPage) {

        elNextPage.addEventListener(
            "click",
            () => {

                const total =
                    obtenerFilasFiltradas()
                        .length;


                const paginas =
                    Math.max(
                        1,
                        Math.ceil(
                            total /
                            filasPorPagina
                        )
                    );


                if (
                    paginaActual <
                    paginas
                ) {

                    paginaActual++;

                    renderTabla(
                        ordenarFilas(
                            obtenerFilasFiltradas()
                        )
                    );

                }

            }
        );

    }


    /*
       Restablecer.
    */

    const btnReset =
        document.getElementById(
            "btn-reset"
        );


    if (btnReset) {

        btnReset.addEventListener(
            "click",
            restablecerFiltros
        );

    }


    /*
       PDF.
    */

    const btnPDF =
        document.getElementById(
            "btn-pdf"
        );


    if (btnPDF) {

        btnPDF.addEventListener(
            "click",
            exportarPDF
        );

    }


    /*
       Escape limpia el buscador.
    */

    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key ===
                "Escape"
            ) {

                restablecerFiltros();

            }

        }
    );

}


/* =========================================================
   RESTABLECER FILTROS
========================================================= */

function restablecerFiltros() {

    if (elCentro)
        elCentro.value = "";


    if (elRegion)
        elRegion.value = "";


    if (elCiudad)
        elCiudad.value = "";


    if (elCanal)
        elCanal.value = "";


    if (elBuscar)
        elBuscar.value = "";


    paginaActual =
        1;


    ordenCol =
        "PNV_2025_CLP";


    ordenAsc =
        false;


    renderTodo();

}


/* =========================================================
   EXPORTAR PDF
========================================================= */

function exportarPDF() {

    /*
       Utilizamos la impresión nativa del navegador.

       Esto permite:
       - Guardar como PDF
       - A4 horizontal
       - Mantener gráficos SVG
       - Mantener la tabla
       - No depender de servidores externos
    */

    window.print();

}


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarDatos();

    }
);
