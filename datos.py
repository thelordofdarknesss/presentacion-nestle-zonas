# %% ==========================================
# 1. DEPENDENCIAS Y CONFIGURACIÓN
# ==========================================
import glob
import html
from html.parser import HTMLParser
import json
import os
import re
import pandas as pd

try:
  from IPython.display import clear_output, display
  import ipywidgets as widgets

  HAY_WIDGETS = True
except ImportError:
  HAY_WIDGETS = False

CARPETA_BASE = (
    os.path.dirname(os.path.abspath(__file__)) if '__file__' in locals() else '.'
)


# %% ==========================================
# 2. PARSER Y CARGA DEL .XLS (MHTML DE SAP)
# ==========================================
class ExcelMHTMLParser(HTMLParser):

  def __init__(self):
    super().__init__()
    self.in_td = False
    self.current_cell = []
    self.current_row = []
    self.rows = []

  def handle_starttag(self, tag, attrs):
    if tag in ['td', 'th']:
      self.in_td = True
      self.current_cell = []

  def handle_endtag(self, tag):
    if tag in ['td', 'th']:
      self.in_td = False
      val = (
          ''.join(self.current_cell)
          .replace('\n', ' ')
          .replace('\r', '')
          .strip()
      )
      self.current_row.append(re.sub(r'\s+', ' ', html.unescape(val)))
    elif tag == 'tr':
      if len(self.current_row) == 15:
        self.rows.append(self.current_row)
      self.current_row = []

  def handle_data(self, data):
    if self.in_td:
      self.current_cell.append(data)


def encontrar_archivo_xls(carpeta: str = CARPETA_BASE) -> str:
  candidatos = sorted(glob.glob(os.path.join(carpeta, '*.xls')))
  if not candidatos:
    raise FileNotFoundError(f"No se encontró ningún .xls en '{carpeta}'.")
  return candidatos[0]


def dividir_region_ciudad(val):
  val = str(val).strip()
  if ' - ' in val:
    partes = val.split(' - ', 1)
    return partes[0].strip(), partes[1].strip()
  elif '-' in val:
    partes = val.split('-', 1)
    return partes[0].strip(), partes[1].strip()
  return val, val


def cargar_datos(ruta_archivo: str = None) -> pd.DataFrame:
  if ruta_archivo is None:
    ruta_archivo = encontrar_archivo_xls()

  print(f'[*] Cargando: {ruta_archivo}...')
  with open(ruta_archivo, 'r', encoding='utf-8', errors='ignore') as f:
    contenido = f.read()

  parser = ExcelMHTMLParser()
  parser.feed(contenido)

  columnas = [
      'Anio',
      'Periodo',
      'Org_Ventas',
      'Centro_Cod',
      'Centro_Origen',
      'Canal_L4',
      'Cod_Cliente',
      'Segmento_L5',
      'Region_Zona',
      'Cajas',
      'KG_Litros',
      'UM_Venta',
      'UM_Venta_Total',
      'PNV_CLP',
      'UM_Base',
  ]
  df = pd.DataFrame(parser.rows, columns=columnas)
  df = df[df['Centro_Cod'].str.strip() != ''].copy()

  for col in ['PNV_CLP', 'Cajas']:
    df[col] = (
        df[col]
        .astype(str)
        .str.replace('.', '', regex=False)
        .str.replace(',', '.', regex=False)
    )
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

  # Separar Región y Ciudad
  df[['Region', 'Ciudad']] = (
      df['Region_Zona'].apply(dividir_region_ciudad).tolist()
  )

  print(f'[✓] {len(df):,} registros cargados con Ciudad identificada.\n')
  return df


# %% ==========================================
# 3. FUNCIONES DE RESUMEN Y CONSULTA
# ==========================================
def total_clientes(df: pd.DataFrame) -> int:
  """Cantidad de clientes/subcuentas únicas."""
  return df['Segmento_L5'].nunique()


def clientes_por_region(df: pd.DataFrame) -> pd.DataFrame:
  """Cantidad de clientes únicos por Region_Zona."""
  return (
      df.groupby(['Region_Zona', 'Region', 'Ciudad'])['Segmento_L5']
      .nunique()
      .reset_index(name='Cantidad_Clientes')
      .sort_values('Cantidad_Clientes', ascending=False)
      .reset_index(drop=True)
  )


def clientes_por_centro(df: pd.DataFrame) -> pd.DataFrame:
  """Cantidad de clientes únicos por Centro_Origen."""
  return (
      df.groupby('Centro_Origen')['Segmento_L5']
      .nunique()
      .reset_index(name='Cantidad_Clientes')
      .sort_values('Cantidad_Clientes', ascending=False)
      .reset_index(drop=True)
  )


def listar_clientes(df: pd.DataFrame, columna: str, valor: str) -> list:
  return sorted(df[df[columna] == valor]['Segmento_L5'].unique().tolist())


# %% ==========================================
# 4. PANEL INTERACTIVO (JUPYTER / VS CODE)
# ==========================================
def iniciar_panel_resumen(df: pd.DataFrame):
  if not HAY_WIDGETS:
    print('ipywidgets no está instalado; saltando interfaz de celdas.')
    return

  regiones = sorted(df['Region_Zona'].unique().tolist())
  centros = sorted(df['Centro_Origen'].unique().tolist())

  drop_region = widgets.Dropdown(
      options=['(ninguna)'] + regiones, description='Ver región:'
  )
  drop_centro = widgets.Dropdown(
      options=['(ninguno)'] + centros, description='Ver centro:'
  )
  salida = widgets.Output()

  def actualizar(change=None):
    with salida:
      clear_output(wait=True)
      print(f'TOTAL DE CLIENTES ÚNICOS: {total_clientes(df)}\n')
      print('--- Clientes por Region_Zona ---')
      display(clientes_por_region(df))
      print('\n--- Clientes por Centro_Origen ---')
      display(clientes_por_centro(df))

      if drop_region.value != '(ninguna)':
        print(f"\n--- Clientes en '{drop_region.value}' ---")
        for c in listar_clientes(df, 'Region_Zona', drop_region.value):
          print(f'  - {c}')

      if drop_centro.value != '(ninguno)':
        print(f"\n--- Clientes en '{drop_centro.value}' ---")
        for c in listar_clientes(df, 'Centro_Origen', drop_centro.value):
          print(f'  - {c}')

  drop_region.observe(actualizar, names='value')
  drop_centro.observe(actualizar, names='value')
  display(widgets.HBox([drop_region, drop_centro]), salida)
  actualizar()


# %% ==========================================
# 5. EXPORTACIÓN DE DATOS PARA EL DASHBOARD WEB
# ==========================================

def _tabla_maestra_clientes(df: pd.DataFrame) -> pd.DataFrame:
  """Agrupación relacional tipo SQL incluyendo Ciudad."""

  return (
      df.groupby(
          [
              'Centro_Origen',
              'Region_Zona',
              'Ciudad',
              'Canal_L4',
              'Segmento_L5'
          ],
          as_index=False,
      )
      .agg(
          Meses_Con_Venta=('Periodo', 'nunique'),
          Cajas_2025=('Cajas', 'sum'),
          PNV_2025_CLP=('PNV_CLP', 'sum'),
      )
      .rename(columns={'Segmento_L5': 'Cliente'})
      .sort_values('PNV_2025_CLP', ascending=False)
      .reset_index(drop=True)
  )


def _resumen_mensual_pnv(df: pd.DataFrame) -> pd.DataFrame:
  """
  Genera el PNV total por mes para el año 2025.

  El resultado queda preparado para que el dashboard
  pueda construir la gráfica de evolución mensual.
  """

  meses = {
      '01': 'Enero',
      '02': 'Febrero',
      '03': 'Marzo',
      '04': 'Abril',
      '05': 'Mayo',
      '06': 'Junio',
      '07': 'Julio',
      '08': 'Agosto',
      '09': 'Septiembre',
      '10': 'Octubre',
      '11': 'Noviembre',
      '12': 'Diciembre',
  }

  datos = df.copy()

  # Normalizamos Periodo.
  datos['Periodo'] = (
      datos['Periodo']
      .astype(str)
      .str.strip()
  )

  # Intentamos quedarnos con el número de mes.
  datos['Mes_Numero'] = (
      datos['Periodo']
      .str.extract(r'(\d{1,2})', expand=False)
  )

  datos['Mes_Numero'] = pd.to_numeric(
      datos['Mes_Numero'],
      errors='coerce'
  )

  datos = datos[
      datos['Mes_Numero'].between(1, 12)
  ].copy()

  resumen = (
      datos.groupby('Mes_Numero', as_index=False)
      .agg(
          PNV_2025_CLP=('PNV_CLP', 'sum'),
          Cajas_2025=('Cajas', 'sum'),
      )
  )

  # Nos aseguramos de tener los 12 meses.
  calendario = pd.DataFrame({
      'Mes_Numero': range(1, 13)
  })

  resumen = calendario.merge(
      resumen,
      on='Mes_Numero',
      how='left'
  )

  resumen['PNV_2025_CLP'] = (
      resumen['PNV_2025_CLP']
      .fillna(0)
  )

  resumen['Cajas_2025'] = (
      resumen['Cajas_2025']
      .fillna(0)
  )

  resumen['Mes'] = resumen['Mes_Numero'].apply(
      lambda x: meses[f'{int(x):02d}']
  )

  resumen['Periodo'] = resumen['Mes_Numero'].apply(
      lambda x: f'{int(x):02d}'
  )

  return resumen[
      [
          'Periodo',
          'Mes',
          'Mes_Numero',
          'PNV_2025_CLP',
          'Cajas_2025'
      ]
  ]


def exportar_datos_json(
    df: pd.DataFrame,
    ruta_salida: str = None
) -> str:

  if ruta_salida is None:
    ruta_salida = os.path.join(
        CARPETA_BASE,
        'datos_dashboard.json'
    )

  # ==========================================
  # RESÚMENES
  # ==========================================

  por_region = clientes_por_region(df)

  por_centro = clientes_por_centro(df)

  tabla = _tabla_maestra_clientes(df)

  por_mes = _resumen_mensual_pnv(df)

  # ==========================================
  # PAYLOAD PRINCIPAL
  # ==========================================

  payload = {

      # ----------------------------------------
      # KPIs
      # ----------------------------------------

      'kpis': {

          'clientes_unicos': int(
              total_clientes(df)
          ),

          'centros': int(
              len(por_centro)
          ),

          'regiones': int(
              df['Region_Zona'].nunique()
          ),

          'pnv_total': float(
              tabla['PNV_2025_CLP'].sum()
          ),
      },

      # ----------------------------------------
      # CLIENTES POR REGIÓN
      # ----------------------------------------

      'por_region': (
          por_region
          .to_dict(orient='records')
      ),

      # ----------------------------------------
      # CLIENTES POR CENTRO
      # ----------------------------------------

      'por_centro': (
          por_centro
          .to_dict(orient='records')
      ),

      # ----------------------------------------
      # EVOLUCIÓN MENSUAL
      # ----------------------------------------

      'por_mes': (
          por_mes
          .to_dict(orient='records')
      ),

      # ----------------------------------------
      # TABLA DE CLIENTES
      # ----------------------------------------

      'tabla': (
          tabla
          .to_dict(orient='records')
      ),

      # ----------------------------------------
      # OPCIONES DE FILTROS
      # ----------------------------------------

      'opciones': {

          'centros': sorted(
              df['Centro_Origen']
              .dropna()
              .unique()
              .tolist()
          ),

          'regiones': sorted(
              df['Region_Zona']
              .dropna()
              .unique()
              .tolist()
          ),

          'ciudades': sorted(
              df['Ciudad']
              .dropna()
              .unique()
              .tolist()
          ),

          'canales': sorted(
              df['Canal_L4']
              .dropna()
              .unique()
              .tolist()
          ),
      },
  }

  # ==========================================
  # GUARDAR JSON
  # ==========================================

  with open(
      ruta_salida,
      'w',
      encoding='utf-8'
  ) as f:

    json.dump(
        payload,
        f,
        ensure_ascii=False,
        indent=2
    )

  print(
      f'[✓] Datos exportados con éxito en: '
      f'{ruta_salida}'
  )

  print(
      f'[✓] Resumen mensual generado: '
      f'{len(por_mes)} meses'
  )

  print('\n--- PNV POR MES ---')

  for _, fila in por_mes.iterrows():

    print(
        f"  {fila['Mes']:<12} "
        f"$ {fila['PNV_2025_CLP']:,.0f}"
    )

  return ruta_salida


# %% ==========================================
# 6. EJECUCIÓN PRINCIPAL
# ==========================================
if __name__ == '__main__':
  df = cargar_datos()
  exportar_datos_json(df)
  iniciar_panel_resumen(df)
