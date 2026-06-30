const mongoose = require('mongoose');

const MAX_PARAESCOLAR = 25;
const PARAESCOLARES_DISPONIBLES = [
'AJEDREZ',
  'FUTBOL VARONIL',
  'VOLEIBOL VARONIL',
  'BASQUETBALL VARONIL',
  'FUTBOL FEMENIL',
  'VOLEIBOL FEMENIL',
  'BASQUETBALL FEMENIL',
  'BANDA DE GUERRA',
  'ESCOLTA',
  'DIBUJO Y PINTURA',
  'FOTOGRAFÍA',
  'ARTESANÍA',
  'MÚSICA',
  'ORATORIA',
  'CANTO',
  'CLUB DE LECTURA',
  'CLUB DE ROBÓTICA',
  'CLUB DE CIENCIAS',
  'CLUB DE MATEMÁTICAS',
  'CLUB DE FRANCÉS'
];
function crearClaveParaescolar(paraescolar) {
  return String(paraescolar || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();
}

const PARAESCOLARES_POR_CLAVE = new Map(
  PARAESCOLARES_DISPONIBLES.map((nombre) => [crearClaveParaescolar(nombre), nombre])
);
function normalizarParaescolar(paraescolar) {
  const texto = String(paraescolar || '').trim().toUpperCase();
  if (!texto) return '';

  return PARAESCOLARES_POR_CLAVE.get(crearClaveParaescolar(texto)) || texto;
}

function esParaescolarDisponible(paraescolar) {
  return PARAESCOLARES_POR_CLAVE.has(crearClaveParaescolar(paraescolar));
}

function obtenerIdentificadorConteo(doc, prefijo) {
  return String(
    
    doc?.datos_alumno?.curp ||
    doc?.curp ||
    doc?.numero_control ||
    doc?.numeroControl ||
    doc?.folio ||
    `${prefijo}:${doc?._id}`
  ).trim().toUpperCase();
}

function agregarConteoParaescolar(conteos, doc, valorParaescolar, prefijo) {
  const paraescolar = normalizarParaescolar(valorParaescolar);
  if (!paraescolar) return;

  if (!conteos.has(paraescolar)) {
    conteos.set(paraescolar, new Set());
  }

  conteos.get(paraescolar).add(obtenerIdentificadorConteo(doc, prefijo));
}

function construirResumenParaescolares(conteos) {
  return PARAESCOLARES_DISPONIBLES.map((nombre) => {
    const ocupados = conteos.get(nombre) || 0;
    const disponibles = Math.max(MAX_PARAESCOLAR - ocupados, 0);
    return {
      nombre,
      ocupados,
      disponibles,
      limite: MAX_PARAESCOLAR,
      lleno: ocupados >= MAX_PARAESCOLAR
    };
  });
}

async function contarParaescolares({ Alumno, Paraescolar, alumnoId = null, paraescolarId = null }) {
  const filtroAlumnos = {
    $or: [
      { 'datos_generales.paraescolar': { $exists: true, $nin: [null, ''] } },
      { paraescolar: { $exists: true, $nin: [null, ''] } }
    ]
  };

  if (alumnoId && mongoose.Types.ObjectId.isValid(alumnoId)) {
    filtroAlumnos._id = { $ne: new mongoose.Types.ObjectId(alumnoId) };
  }

  const filtroParaescolares = { paraescolar: { $exists: true, $nin: [null, ''] } };
  if (paraescolarId && mongoose.Types.ObjectId.isValid(paraescolarId)) {
    filtroParaescolares._id = { $ne: new mongoose.Types.ObjectId(paraescolarId) };
  }

  const [alumnos, paraescolares] = await Promise.all([
    Alumno.find(filtroAlumnos, {
      _id: 1,
      folio: 1,
      paraescolar: 1,
      'datos_alumno.curp': 1,
      'datos_generales.paraescolar': 1
    }).lean(),
    Paraescolar.find(filtroParaescolares, {
      _id: 1,
      numero_control: 1,
      curp: 1,
      paraescolar: 1
    }).lean()
  ]);

  const conteos = new Map();

  alumnos.forEach((alumno) => {
    agregarConteoParaescolar(
      conteos,
      alumno,
      alumno?.datos_generales?.paraescolar || alumno?.paraescolar,
      'alumno'
    );
  });

  paraescolares.forEach((alumnoParaescolar) => {
    agregarConteoParaescolar(
      conteos,
      alumnoParaescolar,
      alumnoParaescolar?.paraescolar,
      'paraescolar'
    );
  });

  return new Map(Array.from(conteos.entries()).map(([nombre, alumnosSet]) => [nombre, alumnosSet.size]));
}

async function puedeAsignarParaescolar({ Alumno, Paraescolar, paraescolar, alumnoId = null, paraescolarId = null }) {
  const limpio = normalizarParaescolar(paraescolar);
  if (!limpio) return true;
  if (!esParaescolarDisponible(limpio)) return false;

  const conteos = await contarParaescolares({ Alumno, Paraescolar, alumnoId, paraescolarId });
  return (conteos.get(limpio) || 0) < MAX_PARAESCOLAR;
}

module.exports = {
  MAX_PARAESCOLAR,
  PARAESCOLARES_DISPONIBLES,
  normalizarParaescolar,
  esParaescolarDisponible,
  construirResumenParaescolares,
  contarParaescolares,
  puedeAsignarParaescolar
};
