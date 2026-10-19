import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
// Planilla de la app de fichas (solo lectura): de ahí se importan usuarios y se leen cursos y ediciones.
const FICHAS_SHEET_ID = process.env.FICHAS_SHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Vercel guarda los saltos de línea como \n literal en la env var
      private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

// Cliente autenticado cacheado mientras la función serverless está "tibia" (evita reautenticar
// en cada lectura). Con límite de 10s para no quedar colgado si Google no responde.
let clientePromise = null;
async function getSheetsClient() {
  if (!clientePromise) {
    clientePromise = (async () => {
      const auth = getAuth();
      const client = await Promise.race([
        auth.getClient(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout autenticando con Google (10s)')), 10000))
      ]);
      return google.sheets({ version: 'v4', auth: client });
    })().catch((err) => { clientePromise = null; throw err; });
  }
  return clientePromise;
}

// Sheets interpreta valores que arrancan con +, - o = como fórmulas. Un WhatsApp "+549..." rompe.
// Se antepone un apóstrofe para forzar texto (Sheets lo usa como señal, no lo guarda).
function protegerValor(v) {
  if (typeof v === 'string' && /^[+\-=]/.test(v)) return `'${v}`;
  return v;
}

function conTimeout(promesa, segundos, etiqueta) {
  return Promise.race([
    promesa,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${segundos}s) esperando a Google Sheets: ${etiqueta}`)), segundos * 1000))
  ]);
}

function columnaExcel(indice) {
  let letras = '', n = indice + 1;
  while (n > 0) { const r = (n - 1) % 26; letras = String.fromCharCode(65 + r) + letras; n = Math.floor((n - 1) / 26); }
  return letras;
}

// ---- Cache de lectura en memoria (5s), invalidado al escribir esa pestaña. Mitiga la cuota de Sheets. ----
const cache = new Map(); // tab -> { t, data }
const CACHE_MS = 5000;
function invalidar(tab) { cache.delete(tab); }

// Lee una pestaña como array de objetos usando la primera fila como headers.
// Pedido de Diego (login bloqueado por "Timeout esperando a Google Sheets: leer Usuarios"):
// un único intento fallido (frío, de red, o un cliente autenticado que quedó en mal estado)
// ya dejaba a cualquiera afuera sin poder loguearse. Un reintento con un cliente nuevo cubre
// ese caso puntual — no soluciona que Google esté caído o con cuota agotada (ahí vuelve a
// fallar igual), pero sí el blip de una sola vez, que es el caso más común.
export async function readSheet(tabName, { noCache = false } = {}) {
  const hit = cache.get(tabName);
  if (!noCache && hit && Date.now() - hit.t < CACHE_MS) return hit.data;

  let ultimoError;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const sheets = await getSheetsClient();
      const res = await conTimeout(
        sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tabName }),
        20, `leer ${tabName}`
      );
      const rows = res.data.values || [];
      if (rows.length === 0) { cache.set(tabName, { t: Date.now(), data: [] }); return []; }
      const headers = rows[0].map((h) => (h || '').trim());
      const data = rows.slice(1).map((row, idx) => {
        const obj = { _rowIndex: idx + 2 };
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });
      cache.set(tabName, { t: Date.now(), data });
      return data;
    } catch (err) {
      ultimoError = err;
      // Error real de Google (puede ser distinto del mensaje de Timeout de arriba: por ejemplo,
      // un 429 "cuota agotada" a veces tarda en manifestarse porque la librería reintenta sola
      // puertas adentro antes de rendirse). Se deja en los logs para poder diagnosticar la causa.
      console.error(`[sheets] intento ${intento + 1}/2 falló leyendo ${tabName}:`, err?.code || err?.response?.status || '', err?.message || err);
      clientePromise = null; // por si el cliente autenticado quedó colgado/vencido
      if (intento === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw ultimoError;
}

// Devuelve solo la fila de encabezados (o [] si la pestaña está vacía).
export async function readHeaders(tabName) {
  const sheets = await getSheetsClient();
  const res = await conTimeout(
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!1:1` }),
    20, `leer headers de ${tabName}`
  );
  return (res.data.values?.[0] || []).map((h) => (h || '').trim());
}

export async function appendRow(tabName, values) {
  const sheets = await getSheetsClient();
  await conTimeout(
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: tabName, valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values.map(protegerValor)] }
    }), 20, `agregar fila en ${tabName}`
  );
  invalidar(tabName);
}

// Igual que appendRow pero para muchas filas de una sola vez (por ejemplo, una importación
// de respuestas históricas). Un solo pedido a la API de Sheets en vez de uno por fila —
// mucho más rápido y evita pegarle a la cuota de escritura con importaciones de cientos
// de filas.
export async function appendRows(tabName, filas) {
  if (!filas || filas.length === 0) return;
  const sheets = await getSheetsClient();
  await conTimeout(
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: tabName, valueInputOption: 'USER_ENTERED',
      requestBody: { values: filas.map((f) => f.map(protegerValor)) }
    }), 30, `agregar ${filas.length} filas en ${tabName}`
  );
  invalidar(tabName);
}

export async function updateRow(tabName, rowIndex, values, startCol = 'A') {
  const sheets = await getSheetsClient();
  const inicio = startCol.charCodeAt(0) - 65;
  const endCol = columnaExcel(inicio + values.length - 1);
  await conTimeout(
    sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: `${tabName}!${startCol}${rowIndex}:${endCol}${rowIndex}`,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [values.map(protegerValor)] }
    }), 20, `actualizar fila en ${tabName}`
  );
  invalidar(tabName);
}

// Escribe/actualiza la fila 1 (encabezados) de una pestaña.
export async function setHeaders(tabName, headers) {
  const sheets = await getSheetsClient();
  const endCol = columnaExcel(headers.length - 1);
  await conTimeout(
    sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: `${tabName}!A1:${endCol}1`,
      valueInputOption: 'RAW', requestBody: { values: [headers] }
    }), 20, `escribir headers de ${tabName}`
  );
  invalidar(tabName);
}

// Crea la pestaña (con sus encabezados) si todavía no existe. Se usa para las pestañas nuevas de "Evaluaciones finales": así no hace falta
// crearlas a mano en la planilla antes de usar la sección. Es idempotente y recuerda las que ya verificó en esta instancia del servidor.
const pestanasListas = new Set();
export async function asegurarPestana(tabName, headers) {
  if (pestanasListas.has(tabName)) return;
  const sheets = await getSheetsClient();
  const meta = await conTimeout(
    sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' }),
    20, `ver pestañas (${tabName})`
  );
  const existe = (meta.data.sheets || []).some((x) => x.properties && x.properties.title === tabName);
  if (!existe) {
    try {
      await conTimeout(
        sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] } }),
        20, `crear la pestaña ${tabName}`
      );
    } catch (e) {
      // Si otra instancia la creó justo antes, no es un error.
      if (!/already exists|ya existe/i.test(String(e && e.message))) throw e;
    }
  }
  const actuales = await readHeaders(tabName);
  if (actuales.length === 0) await setHeaders(tabName, headers);
  pestanasListas.add(tabName);
}


// ---- Lectura de la planilla de la app de fichas (otra planilla; solo se lee, nunca se escribe) ----
export function fichasConfigurada() { return !!FICHAS_SHEET_ID; }
const cacheFichas = new Map();
export async function readSheetFichas(tabName, { noCache = false } = {}) {
  if (!FICHAS_SHEET_ID) throw new Error('Falta la variable FICHAS_SHEET_ID (ID de la planilla de la app de fichas).');
  const hit = cacheFichas.get(tabName);
  if (!noCache && hit && Date.now() - hit.t < 60 * 1000) return hit.data;
  const sheets = await getSheetsClient();
  const res = await conTimeout(
    sheets.spreadsheets.values.get({ spreadsheetId: FICHAS_SHEET_ID, range: tabName }),
    20, `leer ${tabName} (planilla de fichas)`
  );
  const rows = res.data.values || [];
  if (rows.length === 0) { cacheFichas.set(tabName, { t: Date.now(), data: [] }); return []; }
  const headers = rows[0].map((h) => (h || '').trim());
  const data = rows.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
  cacheFichas.set(tabName, { t: Date.now(), data });
  return data;
}

// Actualiza varias celdas sueltas de una pestaña en un solo pedido. updates: [{ celda: 'B5', valor: 3 }, ...]
export async function actualizarCeldas(tabName, updates) {
  if (!updates || !updates.length) return;
  const sheets = await getSheetsClient();
  await conTimeout(
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates.map((u) => ({ range: `${tabName}!${u.celda}`, values: [[protegerValor(u.valor)]] })) }
    }), 30, `actualizar celdas de ${tabName}`
  );
  invalidar(tabName);
}
