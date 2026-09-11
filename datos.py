# %% ==========================================
# 1. DEPENDENCIAS
# ==========================================
import glob
import html
from html.parser import HTMLParser
import os
import re
from IPython.display import clear_output, display
import ipywidgets as widgets
import pandas as pd

CARPETA_BASE = os.path.dirname(os.path.abspath(__file__))


# %% ==========================================
# 2. CARGA DEL .XLS (MHTML DE SAP)
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


def cargar_datos(ruta_archivo: str = None) -> pd.DataFrame:
  if ruta_archivo is None:
    ruta_archivo = encontrar_archivo_xls()

  print(f'[*] Cargando: {ruta_archivo}...')
  with open(ruta_archivo, 'r', encoding='utf-8', errors='ignore') as f:
    contenido = f.read()

  parser = ExcelMHTMLParser()
  parser.feed(contenido)

  columnas = [
      'Anio', 'Periodo', 'Org_Ventas', 'Centro_Cod', 'Centro_Origen',
      'Canal_L4', 'Cod_Cliente', 'Segmento_L5', 'Region_Zona', 'Cajas',
      'KG_Litros', 'UM_Venta', 'UM_Venta_Total', 'PNV_CLP', 'UM_Base',
  ]
  df = pd.DataFrame(parser.rows, columns=columnas)
  df = df[df['Centro_Cod'].str.strip() != ''].copy()

  for col in ['PNV_CLP', 'Cajas']:
    df[col] = (
        df[col].astype(str)
        .str.replace('.', '', regex=False)
        .str.replace(',', '.', regex=False)
    )
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

  print(f'[✓] {len(df):,} registros cargados.\n')
  return df


# %% ==========================================
# 3. RESUMEN DE CLIENTES (Segmento_L5 = cliente)
# ==========================================
def total_clientes(df: pd.DataFrame) -> int:
  """Cantidad de clientes únicos en todo el archivo."""
  return df['Segmento_L5'].nunique()


def clientes_por_region(df: pd.DataFrame) -> pd.DataFrame:
  """Cantidad de clientes únicos por Region_Zona, de mayor a menor."""
  return (
      df.groupby('Region_Zona')['Segmento_L5']
      .nunique()
      .reset_index(name='Cantidad_Clientes')
      .sort_values('Cantidad_Clientes', ascending=False)
      .reset_index(drop=True)
  )


def clientes_por_centro(df: pd.DataFrame) -> pd.DataFrame:
  """Cantidad de clientes únicos por Centro_Origen, de mayor a menor."""
  return (
      df.groupby('Centro_Origen')['Segmento_L5']
      .nunique()
      .reset_index(name='Cantidad_Clientes')
      .sort_values('Cantidad_Clientes', ascending=False)
      .reset_index(drop=True)
  )


def listar_clientes(df: pd.DataFrame, columna: str, valor: str) -> list:
  """Devuelve el listado de nombres de clientes (Segmento_L5) dentro de una
  Region_Zona o Centro_Origen específico. Útil para verificar los conteos."""
  return sorted(df[df[columna] == valor]['Segmento_L5'].unique().tolist())


# %% ==========================================
# 4. PANEL INTERACTIVO DE RESUMEN
# ==========================================
def iniciar_panel_resumen(df: pd.DataFrame):
  """Muestra el resumen y permite hacer drill-down: elegir una región o un
  centro y ver el listado de clientes que hay dentro."""
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
# 5. EJECUCIÓN — correr celda por celda (Run Cell)
# ==========================================
df = cargar_datos()

# %%
print(f'TOTAL DE CLIENTES ÚNICOS: {total_clientes(df)}\n')
print('Clientes por Region_Zona:')
print(clientes_por_region(df).to_string(index=False))
print()
print('Clientes por Centro_Origen:')
print(clientes_por_centro(df).to_string(index=False))

# %%
iniciar_panel_resumen(df)



# %% ==========================================
# 6. EXPORTACIÓN DE DATOS PARA EL DASHBOARD WEB
# ==========================================
import json


def _tabla_maestra_clientes(df: pd.DataFrame) -> pd.DataFrame:
  """Una fila por cada combinación única de Centro / Región / Canal /
  Cliente, con el total vendido en 2025."""
  return (
      df.groupby(
          ['Centro_Origen', 'Region_Zona', 'Canal_L4', 'Segmento_L5'],
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


def exportar_datos_json(df: pd.DataFrame, ruta_salida: str = None) -> str:
  """Calcula KPIs, resúmenes y tabla maestra, y los guarda en
  datos_dashboard.json para que lo consuma el dashboard web (script.js)."""
  if ruta_salida is None:
    ruta_salida = os.path.join(CARPETA_BASE, 'datos_dashboard.json')

  por_region = clientes_por_region(df)
  por_centro = clientes_por_centro(df)
  tabla = _tabla_maestra_clientes(df)

  payload = {
      'kpis': {
          'clientes_unicos': int(total_clientes(df)),
          'centros': int(len(por_centro)),
          'regiones': int(len(por_region)),
          'pnv_total': float(tabla['PNV_2025_CLP'].sum()),
      },
      'por_region': por_region.to_dict(orient='records'),
      'por_centro': por_centro.to_dict(orient='records'),
      'tabla': tabla.to_dict(orient='records'),
      'opciones': {
          'centros': sorted(df['Centro_Origen'].unique().tolist()),
          'regiones': sorted(df['Region_Zona'].unique().tolist()),
          'canales': sorted(df['Canal_L4'].unique().tolist()),
      },
  }

  with open(ruta_salida, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

  print(f'[✓] Datos exportados en: {ruta_salida}')
  return ruta_salida


# %% ==========================================
# 7. EJECUCIÓN — genera datos_dashboard.json
# ==========================================
exportar_datos_json(df)