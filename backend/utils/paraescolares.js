const mongoose = require('mongoose');

const MAX_PARAESCOLAR_INSCRIPCION = 25;
const MAX_PARAESCOLAR_REINSCRIPCION = 10;
const MAX_PARAESCOLAR = MAX_PARAESCOLAR_INSCRIPCION;
const PARAESCOLAR_SIN_ASIGNAR = 'NINGUNO';
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
  [
    ...PARAESCOLARES_DISPONIBLES,
    PARAESCOLAR_SIN_ASIGNAR
  ].map((nombre) => [crearClaveParaescolar(nombre), nombre])
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
    if (!paraescolar || paraescolar === PARAESCOLAR_SIN_ASIGNAR) return;

  if (!conteos.has(paraescolar)) {
    conteos.set(paraescolar, new Set());
  }

  conteos.get(paraescolar).add(obtenerIdentificadorConteo(doc, prefijo));
}

function construirResumenParaescolares(conteos, limite = MAX_PARAESCOLAR) {
  return PARAESCOLARES_DISPONIBLES.map((nombre) => {
    const ocupados = conteos.get(nombre) || 0;
   const disponibles = Math.max(limite - ocupados, 0);
    return {
      nombre,
      ocupados,
      disponibles,
       limite,
      lleno: ocupados >= limite
    };
  });
}

function obtenerConfiguracionCuposParaescolar(tipoTramite = 'INSCRIPCION') {
  const tipo = String(tipoTramite || '').trim().toUpperCase();
  if (tipo === 'REINSCRIPCION') {
    return { tipo: 'REINSCRIPCION', limite: MAX_PARAESCOLAR_REINSCRIPCION };
  }
  return { tipo: 'INSCRIPCION', limite: MAX_PARAESCOLAR_INSCRIPCION };
}

async function contarParaescolares({ Alumno, Paraescolar, Registrado = null, alumnoId = null, paraescolarId = null, tipoTramite = 'INSCRIPCION' }) {
  const { tipo } = obtenerConfiguracionCuposParaescolar(tipoTramite);
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

  const consultaAlumnos = tipo === 'INSCRIPCION'
    ? Alumno.find(filtroAlumnos, {
      _id: 1,
      folio: 1,
      paraescolar: 1,
      'datos_alumno.curp': 1,
      'datos_generales.paraescolar': 1
    }).lean()
    : Promise.resolve([]);

  const consultaParaescolares = tipo === 'INSCRIPCION'
    ? Paraescolar.find(filtroParaescolares, {
      _id: 1,
      numero_control: 1,
      curp: 1,
      paraescolar: 1
    }).lean()
      : Promise.resolve([]);

  const consultaRegistrados = tipo === 'REINSCRIPCION' && Registrado
    ? Registrado.find({
      $or: [
        { 'datos_generales.paraescolar': { $exists: true, $nin: [null, ''] } },
        { paraescolar: { $exists: true, $nin: [null, ''] } }
      ],
      tipo_tramite: 'REINSCRIPCION'
    }, {
      _id: 1,
      numero_control: 1,
      numeroControl: 1,
      folio: 1,
      curp: 1,
      paraescolar: 1,
      'datos_generales.paraescolar': 1
    }).lean()
    : Promise.resolve([]);

  const [alumnos, paraescolares, registrados] = await Promise.all([
    consultaAlumnos,
    consultaParaescolares,
    consultaRegistrados
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
 registrados.forEach((registrado) => {
    agregarConteoParaescolar(
      conteos,
      registrado,
      registrado?.datos_generales?.paraescolar || registrado?.paraescolar,
      'reinscripcion'
    );
  });
  return new Map(Array.from(conteos.entries()).map(([nombre, alumnosSet]) => [nombre, alumnosSet.size]));
}

async function puedeAsignarParaescolar({ Alumno, Paraescolar, Registrado = null, paraescolar, alumnoId = null, paraescolarId = null, tipoTramite = 'INSCRIPCION' }) {
  const { limite } = obtenerConfiguracionCuposParaescolar(tipoTramite);
  const limpio = normalizarParaescolar(paraescolar);
  if (!limpio) return true;
  if (!esParaescolarDisponible(limpio)) return false;
 if (limpio === PARAESCOLAR_SIN_ASIGNAR) return true;
  const conteos = await contarParaescolares({ Alumno, Paraescolar, Registrado, alumnoId, paraescolarId, tipoTramite });
  return (conteos.get(limpio) || 0) < limite;
}

module.exports = {
  MAX_PARAESCOLAR,
   MAX_PARAESCOLAR_INSCRIPCION,
  MAX_PARAESCOLAR_REINSCRIPCION,
  PARAESCOLAR_SIN_ASIGNAR,
  PARAESCOLARES_DISPONIBLES,
  normalizarParaescolar,
  esParaescolarDisponible,
  construirResumenParaescolares,
  obtenerConfiguracionCuposParaescolar,
  contarParaescolares,
  puedeAsignarParaescolar
};
