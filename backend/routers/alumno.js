// backend/routers/alumno.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Config = require('../models/config.model');
const multer = require('multer');
const xlsx = require('xlsx');
const generarPDF = require('../utils/pdfGenerator');
const generarPDFRegistro = require('../utils/pdfGeneratorRegistro');
const flattenToNested = require('../utils/flattenToNested');
const path = require('path');
const fs = require('fs');

const AlumnoSchema = require('../models/Alumno').schema;
const RegistradoBase = require('../models/Registrado');
const Paraescolar = require('../models/paraescolar.model');

const {
  MAX_PARAESCOLAR,
  normalizarParaescolar,
  construirResumenParaescolares,
  obtenerConfiguracionCuposParaescolar,
  contarParaescolares,
  puedeAsignarParaescolar
} = require('../utils/paraescolares');

// ==================================================
// MODELOS DEL PLANTEL ACTUAL: REGISTRO 301
// ==================================================
//
// Este router usa la conexión principal de Mongoose.
// Esa conexión viene desde backend/server.js:
//
// mongoose.connect(process.env.MONGO_URI)
//
// Por eso, en Render, MONGO_URI debe apuntar a la base
// de datos real del registro301.
//
// NO usamos conexiones.registro272.
// NO usamos conexiones múltiples.
// NO importamos ../server para evitar dependencias circulares.
//

const Alumno = mongoose.models.Alumno || mongoose.model('Alumno', AlumnoSchema);
const Registrado = mongoose.models.Registrado || RegistradoBase;

// ============================================
// VALIDAR CURP GLOBAL ENTRE PLANTELES
// ============================================
//
// En registro272 esta función revisaba otras bases usando `conexiones`.
// En registro301 standalone no tenemos conexiones múltiples.
// Para evitar que el flujo se rompa, dejamos la función activa,
// pero solo responde que no existe en otro plantel.
//
// Si después quieres validación estatal/multiplantel, habría que agregar
// conexiones configurables o un endpoint centralizado.
//

async function curpExisteEnOtroPlantel(curpActual) {
  return { existe: false };
}

router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true, plantel: 'registro301' });
});

router.get('/paraescolares/cupos', async (req, res) => {
  try {
    const { tipo, limite } = obtenerConfiguracionCuposParaescolar(req.query.tipo);
    const conteos = await obtenerConteosParaescolares(null, tipo);

    res.json({
     tipo,
      limite,
      paraescolares: construirResumenParaescolares(conteos, limite)
    });

  } catch (error) {
    console.error('❌ Error al consultar cupos de paraescolar:', error);
    res.status(500).json({
      message: 'Error al consultar cupos de paraescolar'
    });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// ---------- Helpers ----------

const CLAVES_EXENTAS = new Set([
  'estado_nacimiento',
  'municipio_nacimiento',
  'ciudad_nacimiento',
  'estado_nacimiento_general',
  'municipio_nacimiento_general',
  'ciudad_nacimiento_general'
]);
const CURP_PENDIENTE_PREFIX = 'CURP_PENDIENTE_DASHBOARD_';
function toUpperData(obj) {
  return JSON.parse(JSON.stringify(obj), (key, value) => {
    return typeof value === 'string' && !CLAVES_EXENTAS.has(key)
      ? value.toUpperCase()
      : value;
  });
}
function obtenerMensajeErrorMongo(error, accion = 'procesar') {
  if (error?.name === 'ValidationError') {
    const campos = Object.values(error.errors || {})
      .map((campo) => campo?.path)
      .filter(Boolean)
      .join(', ');

    return {
      status: 400,
      message: campos
        ? `Faltan o son inválidos los campos requeridos: ${campos}`
        : `No se pudo ${accion} el alumno por campos inválidos`
    };
  }

  if (error?.code === 11000) {
    const camposDuplicados = Object.keys(error.keyPattern || error.keyValue || {})
      .join(', ');

    return {
      status: 400,
      message: camposDuplicados
        ? `Ya existe un registro con el mismo valor en: ${camposDuplicados}`
        : 'Ya existe un registro duplicado'
    };
  }

  return {
    status: 500,
    message: `Error al ${accion} alumno`
  };
}

function crearCurpPendienteDashboard(numeroControl) {
  return `${CURP_PENDIENTE_PREFIX}${numeroControl}`;
}

function esCurpPendienteDashboard(curp) {
  return String(curp || '').startsWith(CURP_PENDIENTE_PREFIX);
}

function ocultarCurpPendienteDashboard(alumno) {
  if (!alumno) return alumno;

  const alumnoLimpio = typeof alumno.toObject === 'function'
    ? alumno.toObject()
    : { ...alumno };

  if (esCurpPendienteDashboard(alumnoLimpio?.datos_alumno?.curp)) {
    alumnoLimpio.datos_alumno = {
      ...alumnoLimpio.datos_alumno,
      curp: ''
    };
  }

  return alumnoLimpio;
}

function obtenerMensajeErrorMongo(error, accion = 'procesar') {
  if (error?.name === 'ValidationError') {
    const campos = Object.values(error.errors || {})
      .map((campo) => campo?.path)
      .filter(Boolean)
      .join(', ');

    return {
      status: 400,
      message: campos
        ? `Faltan o son inválidos los campos requeridos: ${campos}`
        : `No se pudo ${accion} el alumno por campos inválidos`
    };
  }

  if (error?.code === 11000) {
    const camposDuplicados = Object.keys(error.keyPattern || error.keyValue || {})
      .join(', ');

    return {
      status: 400,
      message: camposDuplicados
        ? `Ya existe un registro con el mismo valor en: ${camposDuplicados}`
        : 'Ya existe un registro duplicado'
    };
  }

  return {
    status: 500,
    message: `Error al ${accion} alumno`
  };
}


function obtenerConteosParaescolares(alumnoId = null, tipoTramite = 'INSCRIPCION') {
  return contarParaescolares({
    Alumno,
    Paraescolar,
    Registrado,
    alumnoId,
    tipoTramite
  });
}

async function validarCupoParaescolar(paraescolar, alumnoId = null, tipoTramite = 'INSCRIPCION') {
  return puedeAsignarParaescolar({
    Alumno,
    Registrado,
    Paraescolar,
    paraescolar,
    alumnoId,
    tipoTramite
  });
}

function formatearFechaNacimiento(fecha) {
  const partes = String(fecha || '').trim().split('-');

  if (partes.length !== 3) return fecha || '';

  const [a, b, c] = partes;

  if (a.length === 4) return `${c}-${b}-${a}`;

  return `${a}-${b}-${c}`;
}

function escaparRegex(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizarNumeroSeguroSocial(data) {
  if (!data || typeof data !== 'object') return data;

  if (data.datos_medicos?.numero_seguro_social !== undefined) {
    data.datos_medicos.numero_seguro_social = String(
      data.datos_medicos.numero_seguro_social || ''
    ).replace(/\D/g, '');
  }

  if (data.numero_seguro_social !== undefined) {
    data.numero_seguro_social = String(
      data.numero_seguro_social || ''
    ).replace(/\D/g, '');
  }

  return data;
}

function normalizarEstadoCivilAlumno(data) {
  if (!data?.datos_alumno) return data;

  const estadoCivilMap = {
    soltero: 1,
    casado: 2,
    'unión libre': 3,
    'union libre': 3,
    otro: 4
  };

  const valor = data.datos_alumno.estado_civil;

  if (valor === undefined || valor === null || valor === '') {
    data.datos_alumno.estado_civil = 0;
    return data;
  }

  if (typeof valor === 'number') {
    data.datos_alumno.estado_civil = valor;
    return data;
  }

  const texto = String(valor).trim().toLowerCase();

  data.datos_alumno.estado_civil =
    estadoCivilMap[texto] || parseInt(texto, 10) || 0;

  return data;
}

function alumnoYaTieneRegistroFinal(alumno) {
  return Boolean(alumno?.registro_completado || alumno?.bloqueado);
}

function reinscripcionYaFueCapturada(registrado) {
  return Boolean(
    registrado?.reinscripcion_completada === true ||
    registrado?.bloqueado_reinscripcion === true
  );
}

function obtenerMateriasReprobadas(registrado) {
  const valor =
    registrado?.materias_reprobadas ??
    registrado?.materiasReprobadas ??
    registrado?.adeudo;

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}
function permiteReimpresionPDF(registrado) {
  return Boolean(registrado?.permitir_reimpresion_pdf === true);
}
function requiereControlEscolarParaPDF(registrado) {
   if (permiteReimpresionPDF(registrado)) {
    return false;
  }
  return Boolean(
    registrado?.requiere_control_escolar === true ||
    obtenerMateriasReprobadas(registrado) > 2
  );
}

function aplicarEstadoControlEscolarPorMaterias(data) {
  const tieneMaterias =
    data?.materias_reprobadas !== undefined ||
    data?.materiasReprobadas !== undefined ||
    data?.adeudo !== undefined;

  if (!tieneMaterias) return data;

  const materiasReprobadas = obtenerMateriasReprobadas(data);

  data.materias_reprobadas = materiasReprobadas;
  data.adeudo = materiasReprobadas;
  data.requiere_control_escolar = materiasReprobadas > 2;

  
  
  
  if (materiasReprobadas <= 2 || permiteReimpresionPDF(data)) {
    data.pdf_generado = true;
  } else {
    data.pdf_generado = false;
  }

  return data;
}

function crearFiltroNumeroControl(numeroControl) {
  const limpio = String(numeroControl || '').trim().toUpperCase();
  const comoNumero = Number(limpio);
  const exactoConEspacios = new RegExp(
    `^\\s*${escaparRegex(limpio)}\\s*$`,
    'i'
  );

  const posiblesValores = [limpio, exactoConEspacios];

  if (!Number.isNaN(comoNumero)) {
    posiblesValores.push(comoNumero);
  }

  return {
    $or: [
      { numero_control: { $in: posiblesValores } },
      { numeroControl: { $in: posiblesValores } },
      { numero_de_control: { $in: posiblesValores } },
      { no_control: { $in: posiblesValores } },
      { num_control: { $in: posiblesValores } },
      { control: { $in: posiblesValores } },
      { matricula: { $in: posiblesValores } },
      { matrícula: { $in: posiblesValores } },
      { folio: { $in: posiblesValores } },

      { 'datos_alumno.numero_control': { $in: posiblesValores } },
      { 'datos_alumno.numeroControl': { $in: posiblesValores } },
      { 'datos_alumno.numero_de_control': { $in: posiblesValores } },
      { 'datos_alumno.no_control': { $in: posiblesValores } },
      { 'datos_alumno.num_control': { $in: posiblesValores } },
      { 'datos_alumno.control': { $in: posiblesValores } },
      { 'datos_alumno.matricula': { $in: posiblesValores } },
      { 'datos_alumno.matrícula': { $in: posiblesValores } },

      { 'NUMERO CONTROL': { $in: posiblesValores } },
      { 'NÚMERO CONTROL': { $in: posiblesValores } },
      { 'Numero Control': { $in: posiblesValores } },
      { 'Número Control': { $in: posiblesValores } },
      { 'numero control': { $in: posiblesValores } },

      { 'NUMERO DE CONTROL': { $in: posiblesValores } },
      { 'NÚMERO DE CONTROL': { $in: posiblesValores } },
      { 'Numero de Control': { $in: posiblesValores } },
      { 'Número de Control': { $in: posiblesValores } },
      { 'Numero de control': { $in: posiblesValores } },
      { 'Número de control': { $in: posiblesValores } },
      { 'numero de control': { $in: posiblesValores } },

      { 'No. Control': { $in: posiblesValores } },
      { 'NO. CONTROL': { $in: posiblesValores } },
      { 'No. de Control': { $in: posiblesValores } },
      { 'No. de control': { $in: posiblesValores } },
      { 'NO. DE CONTROL': { $in: posiblesValores } },
      { 'No Control': { $in: posiblesValores } },
      { 'NO CONTROL': { $in: posiblesValores } },

      { 'MATRICULA': { $in: posiblesValores } },
      { 'MATRÍCULA': { $in: posiblesValores } },
      { 'Matricula': { $in: posiblesValores } },
      { 'Matrícula': { $in: posiblesValores } }
    ]
  };
}
function crearExpresionCoincidenciaNumeroControl(valor, regexExacto) {
  return {
    $cond: [
      {
        $in: [
          { $type: valor },
          ['string', 'int', 'long', 'double', 'decimal']
        ]
      },
      {
        $regexMatch: {
          input: { $toString: valor },
          regex: regexExacto,
          options: 'i'
        }
      },
      false
    ]
  };
}

function crearFiltroFlexibleNumeroControl(numeroControl) {
  const limpio = String(numeroControl || '').trim().toUpperCase();
  const regexExacto = `^\\s*${escaparRegex(limpio)}\\s*$`;

  return {
    $expr: {
     $let: {
        vars: { campos: { $objectToArray: '$$ROOT' } },
        in: {
          $anyElementTrue: {
            $concatArrays: [
              {
              $map: {
                  input: '$$campos',
                  as: 'campo',
                  in: crearExpresionCoincidenciaNumeroControl('$$campo.v', regexExacto)
                }
              },
              {
                  $reduce: {
                  input: '$$campos',
                  initialValue: [],
                  in: {
                    $concatArrays: [
                      '$$value',
                      {
                        $cond: [
                          { $eq: [{ $type: '$$this.v' }, 'object'] },
                          {
                            $map: {
                              input: { $objectToArray: '$$this.v' },
                              as: 'subcampo',
                              in: crearExpresionCoincidenciaNumeroControl('$$subcampo.v', regexExacto)
                            }
                          },
                          []
                        ]
                      }
                    ]
                  }
                }
                }
              
            ]
          }
        }
      }
    }
  };
}

async function buscarEnModeloPorNumeroControl(Modelo, numeroControl) {
  const filtro = crearFiltroNumeroControl(numeroControl);

  const encontradoPorCampos = await Modelo.findOne(filtro).lean();

  if (encontradoPorCampos) return encontradoPorCampos;

  // Último recurso:
  // busca el número en cualquier campo superior string/numérico del documento.
  return Modelo.findOne(
    crearFiltroFlexibleNumeroControl(numeroControl)
  ).lean();
}

function normalizarNumeroControl(numeroControl) {
  return String(numeroControl || '').trim().toUpperCase();
}

function tieneHermanosActivos(valor) {
  const limpio = String(valor || '').trim().toUpperCase();

  return ['SI', 'SÍ', 'YES', 'TRUE', '1'].includes(limpio);
}

async function buscarRegistradoPorNumeroControl(numeroControl) {
  // Buscar en la colección `registrados` de la base del registro301.
  const registradoPlantel = await buscarEnModeloPorNumeroControl(
    Registrado,
    numeroControl
  );

  if (registradoPlantel) {
    return {
      alumno: registradoPlantel,
      origen: 'registrados'
    };
  }
// Fallback:
  // Buscar alumnos capturados en el dashboard dentro de la colección
  // `alumnos`. En el inicio, los identificadores numéricos se tratan como
  // número de control y se consultan directo en `/api/reinscripcion`, por lo
  // que este respaldo evita rechazar alumnos visibles en el dashboard pero
  // guardados fuera de `registrados`.
  const alumnoDashboard = await buscarEnModeloPorNumeroControl(
    Alumno,
    numeroControl
  );

  if (alumnoDashboard) {
    return {
      alumno: alumnoDashboard,
      origen: 'alumnos'
    };
  }
  // Fallback:
  // Buscar alumnos cargados desde el módulo de paraescolares
  // usando número de control.
  const paraescolar = await buscarEnModeloPorNumeroControl(
    Paraescolar,
    numeroControl
  );

  if (paraescolar) {
    return {
      alumno: paraescolar,
      origen: 'paraescolar'
    };
  }

  return null;
}

// ---------- Endpoints ----------

router.get('/folio/:folio', async (req, res) => {
  try {
    const folio = String(req.params.folio || '').trim().toUpperCase();

    const alumno = await Alumno.findOne(crearFiltroNumeroControl(folio));

    if (!alumno) {
      return res.status(404).json({
        message: 'Folio no encontrado'
      });
    }

   res.json(ocultarCurpPendienteDashboard(alumno));

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

router.get('/preregistro/:folio', async (req, res) => {
  try {
    const folio = String(req.params.folio || '').trim().toUpperCase();

    const alumno = await Alumno.findOne(crearFiltroNumeroControl(folio)).lean();

    if (!alumno) {
      return res.status(404).json({
        message: 'Folio no encontrado en preregistro'
      });
    }

    res.json({
      message: 'Datos de preregistro encontrados',
      alumno: ocultarCurpPendienteDashboard(alumno)
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

router.get('/reinscripcion/:numeroControl', async (req, res) => {
  try {
    const numeroControl = String(
      req.params.numeroControl || ''
    ).trim().toUpperCase();

    const encontrado = await buscarRegistradoPorNumeroControl(numeroControl);

    if (!encontrado) {
      return res.status(404).json({
        message: 'Número de control no encontrado en registrados'
      });
    }

    res.json({
      message: 'Datos de reinscripción encontrados',
      alumno: encontrado.alumno,
      origen: encontrado.origen
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

function normalizarRegistradoParaPDF(registrado, numeroControl) {
  const raw = registrado || {};
const tipoTramite = 'REINSCRIPCION';
  if (raw.datos_alumno) {
    return {
      ...raw,
      folio: raw.folio || numeroControl,
      numero_control: raw.numero_control || numeroControl,
      numeroControl: raw.numeroControl || raw.numero_control || numeroControl,
      tipo_tramite: tipoTramite
    };
  }

  return {
    folio: numeroControl,
    numero_control: numeroControl,
numeroControl: numeroControl,
    tipo_tramite: tipoTramite,
    datos_alumno: {
      nombres: raw.nombres || raw.nombre || '',
      primer_apellido: raw.primer_apellido || '',
      segundo_apellido: raw.segundo_apellido || '',
      curp: raw.curp || '',
      carrera: raw.carrera || '',
      periodo_semestral: raw.periodo_semestral || '',
      semestre: raw.semestre || raw.grado || '',
      grupo: raw.grupo || '',
      nacionalidad: raw.nacionalidad || '',
      pais_extranjero: raw.pais_extranjero || '',
      estado_civil: raw.estado_civil || '',
      fecha_nacimiento: raw.fecha_nacimiento || '',
      edad: raw.edad || '',
      sexo: raw.sexo || '',
      estado_nacimiento: raw.estado_nacimiento || '',
      municipio_nacimiento: raw.municipio_nacimiento || '',
      ciudad_nacimiento: raw.ciudad_nacimiento || '',
      turno: raw.turno || ''
    },

    datos_generales: raw.datos_generales || {
      colonia: raw.colonia || '',
      domicilio: raw.domicilio || '',
      codigo_postal: raw.codigo_postal || '',
      telefono_alumno: raw.telefono_alumno || '',
      correo_alumno: raw.correo_alumno || '',
      tipo_sangre: raw.tipo_sangre || '',
      contacto_emergencia_nombre: raw.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: raw.contacto_emergencia_telefono || '',
      habla_lengua_indigena: {
        respuesta: raw.habla_lengua_indigena_respuesta || '',
        cual: raw.habla_lengua_indigena_cual || ''
      }
    },

    datos_medicos: raw.datos_medicos || {},
    secundaria_origen: raw.secundaria_origen || {},
    tutor_responsable: raw.tutor_responsable || {},
    persona_emergencia: raw.persona_emergencia || {}
  };
}
// ===================================
// GENERAR FOLIO AUTOMÁTICO
// ===================================

async function generarFolio() {
  const prefijo = "CBTIS301-";

  const ultimo = await Alumno.findOne({
    folio: { $regex: `^${prefijo}` }
  })
    .sort({ folio: -1 })
    .lean();

  let consecutivo = 1;

  if (ultimo?.folio) {
    const num = parseInt(ultimo.folio.replace(prefijo, ""), 10);

    if (!Number.isNaN(num)) {
      consecutivo = num + 1;
    }
  }

  return `${prefijo}${String(consecutivo).padStart(4, "0")}`;
}

router.post('/guardar', async (req, res) => {
  try {
    // ==========================================
    // 🔒 BLOQUEO GLOBAL / ADMINISTRATIVO
    // ==========================================
    const config = await Config.findOne();

    if (config?.bloqueo_registro) {
      return res.status(403).json({
        error: "El registro está temporalmente deshabilitado por administración"
      });
    }

    const data = normalizarNumeroSeguroSocial(
      normalizarEstadoCivilAlumno(req.body)
    );

    if (data?.datos_alumno) {
      data.datos_alumno.fecha_nacimiento = formatearFechaNacimiento(
        data.datos_alumno.fecha_nacimiento
      );
    }

    if (data?.datos_generales) {
      data.datos_generales.numero_control_hermano = '';
    }

    const curp = data.datos_alumno?.curp?.toUpperCase();

    if (!curp) {
      return res.status(400).json({
        error: "CURP no válida"
      });
    }

    // ==========================================
    // 🔎 VALIDACIÓN GLOBAL ENTRE PLANTELES
    // ==========================================
    //
    // En registro301 standalone esta función regresa { existe: false },
    // según el bloque anterior adaptado.
    //
    // Si después se agrega validación estatal real, aquí seguirá funcionando.
    //

    const resultado = await curpExisteEnOtroPlantel(curp);

    if (resultado.existe) {
      return res.status(400).json({
        error: `La CURP ya está registrada en el plantel ${resultado.plantel} con folio ${resultado.folio}`
      });
    }

    // ==========================================
    // 🚫 VALIDACIÓN LOCAL
    // ==========================================

    const existe = await Alumno.findOne({
      "datos_alumno.curp": curp
    });

    if (existe?.registro_completado || existe?.bloqueado) {
      return res.status(400).json({
        message: "Este alumno ya completó su registro"
      });
    }

    // ==========================================
    // 🔢 GENERAR O CONSERVAR FOLIO DE PREREGISTRO
    // ==========================================

    const folio = existe?.folio || await generarFolio();

    data.folio = folio;

    // El formulario inicial solo crea/actualiza el preregistro.
    // Debe quedar abierto para que el alumno complete formulario-registro.html.
    data.registro_completado = false;
    data.bloqueado = false;

    // ==========================================
    // 🎯 VALIDAR CUPO DE PARAESCOLAR
    // ==========================================

    const paraescolarSolicitado = normalizarParaescolar(
      data?.datos_generales?.paraescolar
    );

    if (paraescolarSolicitado) {
      const okParaescolar = await validarCupoParaescolar(
        paraescolarSolicitado,
        existe?._id
      );

      if (!okParaescolar) {
        return res.status(400).json({
          message: `El paraescolar ${paraescolarSolicitado} ya alcanzó el límite de ${MAX_PARAESCOLAR} alumno(s).`
        });
      }

      data.datos_generales.paraescolar = paraescolarSolicitado;
    }

    // ==========================================
    // 💾 GUARDAR EN BD
    // ==========================================

    const actualizado = existe
      ? await Alumno.findOneAndUpdate(
          { _id: existe._id },
          data,
          { new: true }
        )
      : await Alumno.create(data);

    // ==========================================
    // 📄 GENERAR PDF DE PREREGISTRO
    // ==========================================

    const datosAnidados = flattenToNested(actualizado.toObject());
    const nombreArchivo = `${folio}.pdf`;
    const pdfUrl = await generarPDF(datosAnidados, nombreArchivo);

    // ==========================================
    // ✅ RESPUESTA FINAL
    // ==========================================

    res.status(200).json({
      message: "Preregistro guardado. Conserva tu folio para completar el registro.",
      folio,
      registro_completado: false,
      bloqueado: false,
      pdf_url: pdfUrl
    });

  } catch (err) {
    console.error("❌ ERROR EN /guardar:", err);

    res.status(err.status || 500).json({
      message: err.message
    });
  }
});

router.post('/cargar-excel', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No se envió archivo'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const datos = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!datos || datos.length === 0) {
      return res.status(400).json({
        message: 'El archivo está vacío o mal formado'
      });
    }

    const nestedDocs = datos.map(flattenToNested);

    for (const doc of nestedDocs) {
      delete doc._id;

      if (doc.folio) {
        await Alumno.findOneAndUpdate(
          { folio: doc.folio },
          toUpperData(doc),
          {
            upsert: true,
            new: true
          }
        );
      }
    }

    res.status(200).json({
      message: '✅ Alumnos cargados o actualizados correctamente'
    });

  } catch (error) {
    console.error('❌ Error al cargar Excel:', error);

    res.status(500).json({
      message: 'Error al procesar el archivo'
    });
  }
});

router.get('/reimprimir/:folio', async (req, res) => {
  try {
    const identificador = String(req.params.folio || '').trim().toUpperCase();

    const alumno = await Alumno.findOne({
      folio: identificador
    });

    if (alumno) {
      const datosAlumnoPDF = flattenToNested(alumno.toObject());

      const esRegistroCompleto = Boolean(
        alumno?.registro_completado ||
        alumno?.bloqueado ||
        alumno?.datos_generales?.quinta_opcion ||
        alumno?.datos_alumno?.nacionalidad ||
        alumno?.secundaria_origen?.estudias
      );

      const nombreArchivoAlumno = esRegistroCompleto
        ? `${datosAlumnoPDF.datos_alumno?.curp || alumno.folio}_registro.pdf`
        : `${alumno.folio}.pdf`;

      const rutaPDFAlumno = esRegistroCompleto
        ? await generarPDFRegistro(datosAlumnoPDF, nombreArchivoAlumno)
        : await generarPDF(datosAlumnoPDF, nombreArchivoAlumno);

      const fullPathAlumno = path.join(
        __dirname,
        '../public',
        rutaPDFAlumno
      );

      return res.sendFile(fullPathAlumno);
    }

    const encontrado = await buscarRegistradoPorNumeroControl(identificador);

    if (!encontrado) {
      return res.status(404).json({
        message: 'Folio o número de control no encontrado'
      });
    }

    if (requiereControlEscolarParaPDF(encontrado.alumno)) {
      return res.status(403).json({
        message: 'No se puede reimprimir la ficha porque tienes 3 o más materias reprobadas. Acude a control escolar.',
        requiere_control_escolar: true,
        pdf_generado: false
      });
    }

    const datosRegistradoPDF = normalizarRegistradoParaPDF(
      encontrado.alumno,
      identificador
    );

    const nombreArchivoRegistrado = `${identificador}.pdf`;

    const rutaPDFRegistrado = await generarPDFRegistro(
      datosRegistradoPDF,
      nombreArchivoRegistrado
    );

    const fullPathRegistrado = path.join(
      __dirname,
      '../public',
      rutaPDFRegistrado
    );

    return res.sendFile(fullPathRegistrado);

  } catch (err) {
    console.error("❌ Error al reimprimir:", err);

    res.status(500).json({
      message: 'Error interno al generar PDF'
    });
  }
});

// ---------- Dashboard: búsqueda ----------

function construirRegexBusqueda(valor) {
  const limpio = String(valor || '').trim();

  return limpio
    ? { $regex: escaparRegex(limpio), $options: 'i' }
    : null;
}


function construirRegexFlexible(valor) {
  const limpio = String(valor || '').trim();

  if (!limpio) return null;

  const caracteres = Array.from(limpio.replace(/[\s\-_/\.]+/g, ''));

  if (!caracteres.length) return null;

  return {
    $regex: caracteres.map(escaparRegex).join('[\\s\\-_/\\.]*'),
    $options: 'i'
  };
}

function obtenerVariantesIdentificador(valor) {
  const limpio = String(valor || '').trim();

  if (!limpio) return [];

  const variantes = new Set([limpio]);
  const soloAlfanumerico = limpio.replace(/[^a-zA-Z0-9]/g, '');
  const soloDigitos = limpio.replace(/\D/g, '');

  if (soloAlfanumerico) variantes.add(soloAlfanumerico);
  if (soloDigitos) variantes.add(soloDigitos);
  if (/^0+\d+$/.test(soloDigitos)) variantes.add(String(Number(soloDigitos)));

  return Array.from(variantes);
}
function agregarOrigenDashboard(doc, coleccion) {
  const plano = typeof doc.toObject === 'function'
    ? doc.toObject()
    : doc;

  return {
    ...plano,
    _dashboardCollection: coleccion
  };
}
const CAMPOS_IDENTIFICADOR_DASHBOARD = [
  'folio',
  'Folio',
  'FOLIO',
  'numero_control',
  'numeroControl',
  'numero_de_control',
  'no_control',
  'num_control',
  'control',
  'matricula',
  'matrícula',
  'curp',
  'CURP',
  'datos_alumno.folio',
  'datos_alumno.Folio',
  'datos_alumno.FOLIO',
  'datos_alumno.numero_control',
  'datos_alumno.numeroControl',
  'datos_alumno.numero_de_control',
  'datos_alumno.no_control',
  'datos_alumno.num_control',
  'datos_alumno.control',
  'datos_alumno.matricula',
  'datos_alumno.matrícula',
  'datos_alumno.curp',
  'datos_alumno.CURP'
];

function construirFiltroIdentificadorDashboard(regex, valorOriginal = '') {
   const filtros = [];
  const variantes = obtenerVariantesIdentificador(valorOriginal);
  const regexFlexible = construirRegexFlexible(valorOriginal);

  CAMPOS_IDENTIFICADOR_DASHBOARD.forEach((campo) => {
    if (regex) filtros.push({ [campo]: regex });
    if (regexFlexible) filtros.push({ [campo]: regexFlexible });

    variantes.forEach((variante) => {
      filtros.push({ [campo]: variante });
      filtros.push({ [campo]: construirRegexBusqueda(variante) });
    });
  });

  // Algunos folios importados desde Excel pueden quedar guardados como número.
  // MongoDB no aplica $regex sobre campos numéricos, por eso agregamos una
  // comparación exacta numérica para que el dashboard sí los encuentre.
   variantes
    .filter((variante) => /^\d+$/.test(variante))
    .forEach((variante) => {
      const valorNumerico = Number(variante);

      if (Number.isSafeInteger(valorNumerico)) {
        CAMPOS_IDENTIFICADOR_DASHBOARD.forEach((campo) => {
          filtros.push({ [campo]: valorNumerico });
        });
      }
    });

  return filtros;
}

async function obtenerUltimoFolioAsignado() {
  const prefijo = 'CBTIS301-';

  const [ultimo] = await Alumno.aggregate([
    {
      $match: {
        folio: { $regex: `^${prefijo}` }
      }
    },
    {
      $addFields: {
        folioConsecutivo: {
          $convert: {
            input: {
              $arrayElemAt: [
                { $split: ['$folio', prefijo] },
                1
              ]
            },
            to: 'int',
            onError: 0,
            onNull: 0
          }
        }
      }
    },
    {
      $sort: {
        folioConsecutivo: -1,
        folio: -1
      }
    },
    {
      $project: {
        folio: 1
      }
    },
    {
      $limit: 1
    }
  ]);

  return ultimo?.folio || null;
}

router.get('/dashboard/ultimo-folio', async (req, res) => {
  try {
    const folio = await obtenerUltimoFolioAsignado();

    res.json({ folio });

  } catch (error) {
    res.status(500).json({
      message: 'Error al consultar el último folio asignado',
      error
    });
  }
});

router.get('/dashboard/alumnos', async (req, res) => {
  const { folio, apellidos } = req.query;

  const folioRegex = construirRegexBusqueda(folio);
  const apellidosRegex = construirRegexBusqueda(apellidos);

  const queryAlumnos = {};
  const queryRegistrados = {};

  if (folioRegex) {
   queryAlumnos.$or = construirFiltroIdentificadorDashboard(folioRegex, folio);
    queryRegistrados.$or = construirFiltroIdentificadorDashboard(folioRegex, folio);
  }

  if (apellidosRegex) {
   const filtroNombresAlumnos = [
      { 'datos_alumno.primer_apellido': apellidosRegex },
      { 'datos_alumno.segundo_apellido': apellidosRegex },
      { 'datos_alumno.nombres': apellidosRegex }
    ];
  queryAlumnos.$and = queryAlumnos.$or
      ? [
          { $or: queryAlumnos.$or },
          { $or: filtroNombresAlumnos }
        ]
      : [
          { $or: filtroNombresAlumnos }
        ];

    delete queryAlumnos.$or;
    const filtroNombresRegistrados = [
      { primer_apellido: apellidosRegex },
      { segundo_apellido: apellidosRegex },
      { nombres: apellidosRegex },
      { 'datos_alumno.primer_apellido': apellidosRegex },
      { 'datos_alumno.segundo_apellido': apellidosRegex },
      { 'datos_alumno.nombres': apellidosRegex }
    ];

    queryRegistrados.$and = queryRegistrados.$or
      ? [
          { $or: queryRegistrados.$or },
          { $or: filtroNombresRegistrados }
        ]
      : [
          { $or: filtroNombresRegistrados }
        ];

    delete queryRegistrados.$or;
  }

  try {
    const [alumnos, registrados] = await Promise.all([
      Alumno.find(queryAlumnos).limit(100),
      Registrado.find(queryRegistrados).limit(100)
    ]);

    res.json([
      ...alumnos.map((alumno) =>
        ocultarCurpPendienteDashboard(agregarOrigenDashboard(alumno, 'alumnos'))
      ),
      ...registrados.map((registrado) =>
        agregarOrigenDashboard(registrado, 'registrados')
      )
    ]);

  } catch (error) {
    res.status(500).json({
      message: 'Error al buscar registros del dashboard',
      error
    });
  }
});


router.get('/dashboard/:coleccion/:id/ficha', async (req, res) => {
  try {
    const { coleccion, id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (coleccion === 'registrados') {
      const registrado = await Registrado.findById(id);

      if (!registrado) {
        return res.status(404).json({ message: 'No encontrado' });
      }

      const numeroControl = String(
        registrado.numero_control ||
        registrado.numeroControl ||
        registrado.folio ||
        registrado.datos_alumno?.numero_control ||
        id
      ).trim().toUpperCase();
      const datosRegistradoPDF = normalizarRegistradoParaPDF(registrado, numeroControl);
      const nombreArchivo = `${numeroControl}.pdf`;
      const rutaPDF = await generarPDFRegistro(datosRegistradoPDF, nombreArchivo);

      return res.json({
        message: 'Ficha de inscripción generada correctamente',
        pdf_url: rutaPDF
      });
    }

    if (coleccion === 'alumnos') {
      const alumno = await Alumno.findById(id);

      if (!alumno) {
        return res.status(404).json({ message: 'No encontrado' });
      }

      const datosAlumnoPDF = flattenToNested(alumno.toObject());
      const esRegistroCompleto = Boolean(
        alumno?.registro_completado ||
        alumno?.bloqueado ||
        alumno?.datos_generales?.quinta_opcion ||
        alumno?.datos_alumno?.nacionalidad ||
        alumno?.secundaria_origen?.estudias
      );
      const nombreArchivo = esRegistroCompleto
        ? `${datosAlumnoPDF.datos_alumno?.curp || alumno.folio}_registro.pdf`
        : `${alumno.folio}.pdf`;
      const rutaPDF = esRegistroCompleto
        ? await generarPDFRegistro(datosAlumnoPDF, nombreArchivo)
        : await generarPDF(datosAlumnoPDF, nombreArchivo);

      return res.json({
        message: 'Ficha de inscripción generada correctamente',
        pdf_url: rutaPDF
      });
    }

    return res.status(400).json({ message: 'Colección inválida' });
  } catch (error) {
    console.error('❌ Error al generar ficha desde dashboard:', error);
    res.status(500).json({
      message: 'Error interno al generar ficha de inscripción'
    });
  }
});

router.get('/dashboard/registrados/:id', async (req, res) => {
  try {
    const registrado = await Registrado.findById(req.params.id);

    if (!registrado) {
      return res.status(404).json({
        message: 'No encontrado'
      });
    }

    res.json(registrado);

  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener registrado',
      error
    });
  }
});

router.get('/dashboard/alumnos/:id', async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id);

    if (!alumno) {
      return res.status(404).json({
        message: 'No encontrado'
      });
    }

    res.json(ocultarCurpPendienteDashboard(alumno));

  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener alumno',
      error
    });
  }
});

router.put('/dashboard/registrados/:id', async (req, res) => {
  try {
    const bodyUpper = normalizarNumeroSeguroSocial(
      toUpperData(req.body)
    );
 const desbloquearRegistro = Boolean(bodyUpper.desbloquear_registro);
    delete bodyUpper.desbloquear_registro;
   
    bodyUpper.permitir_reimpresion_pdf = Boolean(bodyUpper.permitir_reimpresion_pdf);

    aplicarEstadoControlEscolarPorMaterias(bodyUpper);

   if (desbloquearRegistro) {
      bodyUpper.reinscripcion_completada = false;
      bodyUpper.bloqueado_reinscripcion = false;
      bodyUpper.requiere_control_escolar = false;
    }
    
    const registrado = await Registrado.findByIdAndUpdate(
      req.params.id,
      bodyUpper,
      {
        new: true,
        strict: false
      }
    );

    if (!registrado) {
      return res.status(404).json({
        message: 'No encontrado'
      });
    }

    res.json(registrado);

  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar registrado',
      error
    });
  }
});

router.post('/dashboard/registrados', async (req, res) => {
  try {
    const bodyUpper = normalizarNumeroSeguroSocial(
      toUpperData(req.body)
    );
  delete bodyUpper.desbloquear_registro;
    
    bodyUpper.permitir_reimpresion_pdf = Boolean(bodyUpper.permitir_reimpresion_pdf);

    if (!bodyUpper.tipo_tramite) {
      bodyUpper.tipo_tramite = 'REINSCRIPCION';
    }
    const nuevoRegistrado = new Registrado(bodyUpper);

    await nuevoRegistrado.save();

    res.status(201).json(nuevoRegistrado);

  } catch (error) {
    res.status(500).json({
      message: 'Error al crear registrado',
      error
    });
  }
});

router.delete('/dashboard/registrados/:id', async (req, res) => {
  try {
    const registrado = await Registrado.findByIdAndDelete(req.params.id);

    if (!registrado) {
      return res.status(404).json({
        message: 'No encontrado'
      });
    }

    res.json({
      message: 'Registrado eliminado'
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar registrado'
    });
  }
});
router.put('/dashboard/alumnos/:id', async (req, res) => {
  try {
    const alumnoActual = await Alumno.findById(req.params.id);

    if (!alumnoActual) {
      return res.status(404).json({
        message: 'No encontrado'
      });
    }

    const bodyUpper = normalizarNumeroSeguroSocial(
      toUpperData(req.body)
    );
 const desbloquearRegistro = Boolean(bodyUpper.desbloquear_registro);
    delete bodyUpper.desbloquear_registro;

    if (desbloquearRegistro) {
      bodyUpper.registro_completado = false;
      bodyUpper.bloqueado = false;
    }
    const nuevoPara = normalizarParaescolar(
      bodyUpper?.datos_generales?.paraescolar
    );

    const previoPara = normalizarParaescolar(
      alumnoActual?.datos_generales?.paraescolar
    );

    const cambiando = Boolean(
      nuevoPara && nuevoPara !== previoPara
    );

    if (cambiando) {
      const ok = await validarCupoParaescolar(
        nuevoPara,
        alumnoActual._id
      );

      if (!ok) {
        return res.status(400).json({
          message: `No se puede cambiar a ${nuevoPara}, ya alcanzó su límite de ${MAX_PARAESCOLAR}.`
        });
      }

      if (!bodyUpper.datos_generales) {
        bodyUpper.datos_generales = {};
      }

      bodyUpper.datos_generales.paraescolar = nuevoPara;
    }

    const actualizado = await Alumno.findByIdAndUpdate(
      req.params.id,
      bodyUpper,
      { new: true }
    );

    res.json(actualizado);

  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar alumno',
      error
    });
  }
});

router.post('/dashboard/alumnos', async (req, res) => {
  try {
    const bodyUpper = normalizarNumeroSeguroSocial(
      toUpperData(req.body)
    );
const desbloquearRegistro = Boolean(bodyUpper.desbloquear_registro);
    delete bodyUpper.desbloquear_registro;
    const numeroControl = String(
      bodyUpper.numero_control ||
      bodyUpper.numeroControl ||
      bodyUpper.datos_alumno?.numero_control ||
      bodyUpper.folio ||
      ''
    ).trim();

    bodyUpper.folio = numeroControl;
    bodyUpper.numero_control = numeroControl;
    bodyUpper.numeroControl = numeroControl;

    if (!bodyUpper.datos_alumno) {
      bodyUpper.datos_alumno = {};
    }

    bodyUpper.datos_alumno.numero_control = numeroControl;
     if (desbloquearRegistro) {
      bodyUpper.registro_completado = false;
      bodyUpper.bloqueado = false;
    }


    if (bodyUpper.datos_alumno?.curp) {
      bodyUpper.datos_alumno.curp = String(bodyUpper.datos_alumno.curp).trim();
    }

    if (!numeroControl) {
      return res.status(400).json({
        message: 'Captura el número de control del alumno antes de guardar'
      });
    }

    if (!bodyUpper.datos_alumno.curp) {
      bodyUpper.datos_alumno.curp = crearCurpPendienteDashboard(numeroControl);
    }
    
    bodyUpper.folio = String(bodyUpper.folio || '').trim();

    if (bodyUpper.datos_alumno?.curp) {
      bodyUpper.datos_alumno.curp = String(bodyUpper.datos_alumno.curp).trim();
    }

    if (!bodyUpper.folio) {
      return res.status(400).json({
        message: 'Captura el folio del alumno antes de guardar'
      });
    }

    if (!bodyUpper.datos_alumno?.curp) {
      return res.status(400).json({
        message: 'Captura la CURP del alumno antes de guardar'
      });
    }
    
    const nuevoPara = normalizarParaescolar(
      bodyUpper?.datos_generales?.paraescolar
    );

    if (nuevoPara) {
      const ok = await validarCupoParaescolar(nuevoPara);

      if (!ok) {
        return res.status(400).json({
          message: `El paraescolar ${nuevoPara} ya alcanzó el límite de ${MAX_PARAESCOLAR} alumno(s).`
        });
      }

      if (!bodyUpper.datos_generales) {
        bodyUpper.datos_generales = {};
      }

      bodyUpper.datos_generales.paraescolar = nuevoPara;
    }

    const nuevoAlumno = new Alumno(bodyUpper);

    await nuevoAlumno.save();

    res.status(201).json(nuevoAlumno);

  } catch (error) {
     console.error('❌ Error al crear alumno desde dashboard:', error);
    const errorMongo = obtenerMensajeErrorMongo(error, 'crear');
    res.status(errorMongo.status).json({
      message: errorMongo.message
    });
  }
});

router.delete('/dashboard/alumnos/:id', async (req, res) => {
  try {
    const eliminado = await Alumno.findByIdAndDelete(req.params.id);

    if (!eliminado) {
      return res.status(404).json({
        message: 'No encontrado'
      });
    }

    res.json({
      message: 'Alumno eliminado'
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar alumno'
    });
  }
});

// VALIDAR CURP EN ALUMNOS REGISTRADOS
router.get('/curp/:curp', async (req, res) => {
  try {
    const curp = String(req.params.curp || '').trim().toUpperCase();

    const alumno = await Alumno.findOne({
      "datos_alumno.curp": curp
    });

    if (!alumno) {
      return res.json({
        registrado: false
      });
    }

    res.json({
      registrado: true,
      folio: alumno.folio
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

function normalizarValorExcel(valor) {
  if (valor === null || valor === undefined) return '';

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (valor && typeof valor === 'object') {
    if (typeof valor.toHexString === 'function') {
      return valor.toHexString();
    }

    return JSON.stringify(valor);
  }

  return valor;
}

function aplanarDocumentoParaExcel(documento, prefijo = '', salida = {}) {
  Object.entries(documento || {}).forEach(([clave, valor]) => {
    if (clave === '__v') return;

    const nombreColumna = prefijo
      ? `${prefijo}_${clave}`
      : clave;

    if (
      valor &&
      typeof valor === 'object' &&
      !(valor instanceof Date) &&
      typeof valor.toHexString !== 'function' &&
      !Array.isArray(valor)
    ) {
      aplanarDocumentoParaExcel(valor, nombreColumna, salida);
      return;
    }

    salida[nombreColumna] = normalizarValorExcel(valor);
  });

  return salida;
}

function prepararFilasExportacion(documentos, coleccion) {
  return documentos.map((documento, index) => ({
    orden: index + 1,
    coleccion,
    ...aplanarDocumentoParaExcel(documento)
  }));
}

function ajustarAnchoColumnas(worksheet, filas) {
  const columnas = new Set();

  filas.forEach((fila) => {
    Object.keys(fila).forEach((columna) => {
      columnas.add(columna);
    });
  });

  worksheet['!cols'] = Array.from(columnas).map((columna) => {
    const anchoMaximo = filas.reduce((maximo, fila) => {
      const longitud = String(fila[columna] ?? '').length;
      return Math.max(maximo, longitud);
    }, columna.length);

    return {
      wch: Math.min(Math.max(anchoMaximo + 2, 12), 45)
    };
  });
}

function agregarHojaExcel(workbook, nombreHoja, filas) {
  const worksheet = xlsx.utils.json_to_sheet(filas);

  ajustarAnchoColumnas(worksheet, filas);

  xlsx.utils.book_append_sheet(
    workbook,
    worksheet,
    nombreHoja
  );
}

router.get('/exportar-excel', async (req, res) => {
  try {
    const [alumnos, registrados] = await Promise.all([
      Alumno.find({ registro_completado: true })
        .sort({ createdAt: -1 })
        .lean(),

      Registrado.find({})
        .sort({ createdAt: -1 })
        .lean()
    ]);

    if (!alumnos.length && !registrados.length) {
      return res.status(404).json({
        message: 'No hay alumnos ni registrados para exportar.'
      });
    }

    const filasAlumnos = prepararFilasExportacion(
      alumnos,
      'alumnos'
    );

    const filasRegistrados = prepararFilasExportacion(
      registrados,
      'registrados'
    );

    const filasGeneral = [
      ...filasAlumnos,
      ...filasRegistrados
    ];

    const workbook = xlsx.utils.book_new();

    if (filasGeneral.length) {
      agregarHojaExcel(
        workbook,
        'Todos',
        filasGeneral
      );
    }

    if (filasAlumnos.length) {
      agregarHojaExcel(
        workbook,
        'Alumnos',
        filasAlumnos
      );
    }

    if (filasRegistrados.length) {
      agregarHojaExcel(
        workbook,
        'Registrados',
        filasRegistrados
      );
    }

    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=alumnos_registrados_completo.xlsx'
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.send(buffer);

  } catch (err) {
    console.error('❌ Error al exportar Excel:', err);

    res.status(500).json({
      message: 'Error al exportar datos.'
    });
  }
});

// ============================================
// 🧪 DIAGNÓSTICO DE CURP EN REGISTRO 301
// ============================================
//
// En registro272 este endpoint revisaba todas las conexiones.
// En registro301 standalone solo revisa la base actual.
//

router.get('/debug/curp-global/:curp', async (req, res) => {
  try {
    const curp = String(req.params.curp || '').trim().toUpperCase();

    const alumno = await Alumno.findOne({
      "datos_alumno.curp": curp
    }).lean();

    res.json({
      curp_consultada: curp,
      base_actual: Alumno.db.name,
      resultados: [
        {
          plantel: 'registro301',
          encontrado: alumno ? true : false,
          folio: alumno?.folio || null,
          registro_completado: alumno?.registro_completado ?? null
        }
      ]
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

router.post('/guardar-registro', async (req, res) => {
  try {
    const data = req.body;

    const folio = String(data?.folio || '').trim().toUpperCase();

    if (
      !folio ||
      !data.datos_alumno?.curp ||
      !data.datos_generales?.correo_alumno
    ) {
      return res.status(400).json({
        message: 'Faltan datos obligatorios'
      });
    }

    const registroExistente = await Alumno.findOne({
      folio
    }).lean();

    if (alumnoYaTieneRegistroFinal(registroExistente)) {
      return res.status(409).json({
        message: 'Este folio ya tiene un registro finalizado y no puede editarse. Si necesitas cambios, acude a control escolar.'
      });
    }

    data.folio = folio;

    const clavesExentas = [
      'estado_nacimiento',
      'municipio_nacimiento',
      'ciudad_nacimiento',
      'estado_nacimiento_general',
      'municipio_nacimiento_general',
      'ciudad_nacimiento_general'
    ];

    const upperCaseData = JSON.parse(
      JSON.stringify(data),
      (key, value) =>
        typeof value === 'string' && !clavesExentas.includes(key)
          ? value.toUpperCase()
          : value
    );

    normalizarEstadoCivilAlumno(upperCaseData);
    normalizarNumeroSeguroSocial(upperCaseData);

    upperCaseData.datos_alumno.fecha_nacimiento =
      formatearFechaNacimiento(
        upperCaseData.datos_alumno.fecha_nacimiento
      );

    upperCaseData.datos_generales.numero_control_hermano = '';

    upperCaseData.datos_generales.primera_opcion =
      data.datos_generales.primera_opcion || '';

    upperCaseData.datos_generales.segunda_opcion =
      data.datos_generales.segunda_opcion || '';

    upperCaseData.datos_generales.tercera_opcion =
      data.datos_generales.tercera_opcion || '';

    upperCaseData.datos_generales.cuarta_opcion =
      data.datos_generales.cuarta_opcion || '';

    upperCaseData.datos_generales.quinta_opcion =
      data.datos_generales.quinta_opcion || '';

    const nuevoParaescolar = normalizarParaescolar(
      upperCaseData?.datos_generales?.paraescolar
    );

    if (nuevoParaescolar) {
      const okParaescolar = await validarCupoParaescolar(
        nuevoParaescolar,
        registroExistente?._id
      );

      if (!okParaescolar) {
        return res.status(400).json({
          message: `El paraescolar ${nuevoParaescolar} ya alcanzó el límite de ${MAX_PARAESCOLAR} alumno(s).`
        });
      }

      upperCaseData.datos_generales.paraescolar = nuevoParaescolar;
    }

    upperCaseData.registro_completado = true;

    await Alumno.findOneAndUpdate(
      { folio },
      upperCaseData,
      { upsert: true }
    );

    const datosAnidados = flattenToNested(upperCaseData);

    const nombreArchivo = `${
      datosAnidados.datos_alumno?.curp || 'formulario'
    }_registro.pdf`;

    await generarPDFRegistro(
      datosAnidados,
      nombreArchivo
    );

    res.status(200).json({
      message: 'Registro exitoso y PDF generado',
      pdf_url: `/pdfs/${nombreArchivo}`
    });

  } catch (err) {
    console.error('Error en /guardar-registro:', err);

    res.status(err.status || 500).json({
      message: err.message
    });
  }
});

router.post('/guardar-reinscripcion', async (req, res) => {
  try {
    const data = req.body;

    const numeroControl = String(
      data?.numero_control ||
      data?.numeroControl ||
      ''
    ).trim().toUpperCase();

    if (!numeroControl) {
      return res.status(400).json({
        message: 'Falta número de control'
      });
    }

    const reinscripcionExistente =
      await buscarRegistradoPorNumeroControl(numeroControl);

    if (reinscripcionYaFueCapturada(reinscripcionExistente?.alumno)) {
      return res.status(409).json({
        message: 'Este número de control ya tiene una reinscripción capturada y no puede editarse. Si necesitas cambios, acude a control escolar.'
      });
    }

    const materiasReprobadas = Number(
      data?.materias_reprobadas ??
      data?.materiasReprobadas ??
      data?.adeudo ??
      0
    );

    const requiereControlEscolar = materiasReprobadas > 2;

    normalizarNumeroSeguroSocial(data);
  const nuevoParaescolar = normalizarParaescolar(data?.datos_generales?.paraescolar);
    if (nuevoParaescolar) {
    const puedeAsignar = await validarCupoParaescolar(nuevoParaescolar, null, 'REINSCRIPCION');
      if (!puedeAsignar) {
        return res.status(400).json({
         message: `El paraescolar ${nuevoParaescolar} ya alcanzó el límite de ${obtenerConfiguracionCuposParaescolar('REINSCRIPCION').limite} alumno(s).`
        });
      }
      data.datos_generales.paraescolar = nuevoParaescolar;
    }
    const payload = {
      ...data,
      numero_control: numeroControl,
      numeroControl,
      folio: numeroControl,
      adeudo: materiasReprobadas,
      materias_reprobadas: materiasReprobadas,
      tipo_tramite: 'REINSCRIPCION',
      reinscripcion_completada: true,
      bloqueado_reinscripcion: true,
      requiere_control_escolar: requiereControlEscolar,
      pdf_generado: !requiereControlEscolar,
      updatedAt: new Date()
    };

    await Registrado.findOneAndUpdate(
      crearFiltroNumeroControl(numeroControl),
      {
        $set: payload,
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    if (requiereControlEscolar) {
      return res.status(200).json({
        message: 'Reinscripción guardada. Debes acudir a control escolar por tener 3 o más materias reprobadas.',
        pdf_generado: false,
        requiere_control_escolar: true
      });
    }

    const nombreArchivo = `${numeroControl}.pdf`;
    const datosAnidados = flattenToNested(payload);

    await generarPDFRegistro(
      datosAnidados,
      nombreArchivo
    );

    res.status(200).json({
      message: 'Reinscripción guardada y PDF generado (REINSCRIPCIÓN)',
      pdf_generado: true,
      requiere_control_escolar: false,
      pdf_url: `/pdfs/${nombreArchivo}`
    });

  } catch (err) {
    console.error('Error en /guardar-reinscripcion:', err);

    res.status(500).json({
      message: err.message
    });
  }
});

module.exports = router;
