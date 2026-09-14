import html
from html.parser import HTMLParser
import json
import re
import pandas as pd


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


# 1. Cargar archivo
with open('YGTTGD063 (3) 1.xls', 'r', encoding='utf-8', errors='ignore') as f:
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

# Conversión numérica limpia
for col in ['PNV_CLP', 'Cajas']:
  df[col] = (
      df[col]
      .astype(str)
      .str.replace('.', '', regex=False)
      .str.replace(',', '.', regex=False)
  )
  df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)


# 2. Separar Región y Ciudad
def dividir_region_ciudad(val):
  val = str(val).strip()
  if ' - ' in val:
    partes = val.split(' - ', 1)
    return partes[0].strip(), partes[1].strip()
  elif '-' in val:
    partes = val.split('-', 1)
    return partes[0].strip(), partes[1].strip()
  return val, val


df[['Region', 'Ciudad']] = df['Region_Zona'].apply(dividir_region_ciudad).tolist()

# 3. Agrupación por Región / Ciudad con Cajas y PNV
por_region = (
    df.groupby(['Region_Zona', 'Region', 'Ciudad'])
    .agg(
        Cantidad_Clientes=('Segmento_L5', 'nunique'),
        Clientes_L4=('Canal_L4', 'nunique'),
        Cajas=('Cajas', 'sum'),
        PNV=('PNV_CLP', 'sum'),
    )
    .reset_index()
    .sort_values(by='PNV', ascending=False)
)

# 4. Agrupación por Centro de Origen con Cajas y PNV
por_centro = (
    df.groupby('Centro_Origen')
    .agg(
        Cantidad_Clientes=('Segmento_L5', 'nunique'),
        Clientes_L4=('Canal_L4', 'nunique'),
        Cajas=('Cajas', 'sum'),
        PNV=('PNV_CLP', 'sum'),
    )
    .reset_index()
    .sort_values(by='PNV', ascending=False)
)

# 5. Tabla detallada
tabla = (
    df.groupby(
        ['Centro_Origen', 'Region_Zona', 'Ciudad', 'Canal_L4', 'Segmento_L5']
    )
    .agg(
        Meses_Con_Venta=('Periodo', 'nunique'),
        Cajas_2025=('Cajas', 'sum'),
        PNV_2025_CLP=('PNV_CLP', 'sum'),
    )
    .reset_index()
    .rename(columns={'Segmento_L5': 'Cliente'})
)

payload = {
    'kpis': {
        'clientes_unicos': int(df['Segmento_L5'].nunique()),
        'centros': int(df['Centro_Origen'].nunique()),
        'regiones': int(df['Region_Zona'].nunique()),
        'pnv_total': float(df['PNV_CLP'].sum()),
        'cajas_total': float(df['Cajas'].sum()),
    },
    'por_region': por_region.to_dict(orient='records'),
    'por_centro': por_centro.to_dict(orient='records'),
    'opciones': {
        'centros': sorted(df['Centro_Origen'].dropna().unique().tolist()),
        'regiones': sorted(df['Region_Zona'].dropna().unique().tolist()),
        'ciudades': sorted(df['Ciudad'].dropna().unique().tolist()),
        'canales': sorted(df['Canal_L4'].dropna().unique().tolist()),
    },
    'tabla': tabla.to_dict(orient='records'),
}

with open('datos_dashboard.json', 'w', encoding='utf-8') as f:
  json.dump(payload, f, ensure_ascii=False, indent=2)

print('[✓] datos_dashboard.json generado con éxito.')
