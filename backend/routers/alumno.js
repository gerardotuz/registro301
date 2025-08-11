const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');
const multer = require('multer');
const xlsx = require('xlsx');
const generarPDF = require('../utils/pdfGenerator');
const flattenToNested = require('../utils/flattenToNested');
const path = require('path');
const fs = require('fs');

// --- Salud ---
router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true });
});

const upload = multer({ storage: multer.memoryStorage() });
const MAX_PARAESCOLAR = 50;

// --- Util: middleware de token admin (opcional) ---
function checkAdminToken(req, res, next) {
  const required = !!process.env.ADMIN_TOKEN;
  const token = req.query.token || req.headers['x-admin-token'];
  if (required && token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  next();
}

// --- Consulta por folio ---
router.get('/folio/:folio', async (req, res) => {
  try {
    const alumno = await Alumno.findOne({ folio: req.params.folio });
    if (!alumno) return res.status(404).json({ message: 'Folio no encontrado' });
    res.json(alumno);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Guardar registro (y generar PDF) ---
router.post('/guardar', async (req, res) => {
  try {
    const data = req.body;

    if (!data.folio || !data.datos_alumno?.curp || !data.datos_generales?.correo_alumno) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const yaRegistrado = await Alumno.findOne({ folio: data.folio });

    if (yaRegistrado?.registro_completado) {
      return res.status(403).json({ message: 'Este folio ya fue registrado y no se puede modificar.' });
    }

    const clavesExentas = [
      'estado_nacimiento', 'municipio_nacimiento', 'ciudad_nacimiento',
      'estado_nacimiento_general', 'municipio_nacimiento_general', 'ciudad_nacimiento_general'
    ];

    const upperCaseData = JSON.parse(JSON.stringify(data), (key, value) => {
      return typeof value === 'string' && !clavesExentas.includes(key) ? value.toUpperCase() : value;
    });

    // Validar cupos de paraescolar
    const paraescolar = data.datos_generales?.paraescolar;
    if (paraescolar) {
      const count = await Alumno.countDocuments({ 'datos_generales.paraescolar': paraescolar.toUpperCase() });
      const paraescolarPrevio = yaRegistrado?.datos_generales?.paraescolar;
      const estaCambiando = paraescolarPrevio && paraescolarPrevio.toUpperCase() !== paraescolar.toUpperCase();

      if (!yaRegistrado && count >= MAX_PARAESCOLAR) {
        return res.status(400).json({ message: `El paraescolar ${paraescolar} ya alcanzó el límite de ${MAX_PARAESCOLAR} alumno(s).` });
      }
      if (yaRegistrado && estaCambiando && count >= MAX_PARAESCOLAR) {
        return res.status(400).json({ message: `No se puede cambiar a ${paraescolar}, ya alcanzó su límite.` });
      }
    }

    // Estado civil a número
    const estadoCivilNum = parseInt(data.datos_alumno?.estado_civil);
    if (!isNaN(estadoCivilNum)) {
      upperCaseData.datos_alumno.estado_civil = estadoCivilNum;
    }

    // Asegurar opciones vacías
    upperCaseData.datos_generales.primera_opcion = data.datos_generales.primera_opcion || '';
    upperCaseData.datos_generales.segunda_opcion = data.datos_generales.segunda_opcion || '';
    upperCaseData.datos_generales.tercera_opcion = data.datos_generales.tercera_opcion || '';
    upperCaseData.datos_generales.cuarta_opcion = data.datos_generales.cuarta_opcion || '';

    // Claves generales
    upperCaseData.datos_generales.estado_nacimiento_general = data.datos_generales.estado_nacimiento_general || '';
    upperCaseData.datos_generales.municipio_nacimiento_general = data.datos_generales.municipio_nacimiento_general || '';
    upperCaseData.datos_generales.ciudad_nacimiento_general = data.datos_generales.ciudad_nacimiento_general || '';

    // Registro completado
    upperCaseData.registro_completado = true;

    await Alumno.findOneAndUpdate({ folio: data.folio }, upperCaseData, { upsert: true });

    // Generar PDF
    const datosAnidados = flattenToNested(upperCaseData);
    const nombreArchivo = `${datosAnidados.datos_alumno?.curp || 'formulario'}.pdf`;
    await generarPDF(datosAnidados, nombreArchivo);

    res.status(200).json({
      message: 'Registro exitoso y PDF generado',
      pdf_url: `/pdfs/${nombreArchivo}`
    });
  } catch (err) {
    console.error('Error al guardar o generar PDF:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Carga masiva desde Excel ---
router.post('/cargar-excel', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió archivo' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const datos = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!datos || datos.length === 0) {
      return res.status(400).json({ message: 'El archivo está vacío o mal formado' });
    }

    const nestedDocs = datos.map(flattenToNested);

    for (const doc of nestedDocs) {
      delete doc._id;
      if (doc.folio) {
        await Alumno.findOneAndUpdate(
          { folio: doc.folio },
          doc,
          { upsert: true, new: true }
        );
      }
    }

    res.status(200).json({ message: '✅ Alumnos cargados o actualizados correctamente' });
  } catch (error) {
    console.error('❌ Error al cargar Excel:', error);
    res.status(500).json({ message: 'Error al procesar el archivo' });
  }
});

// --- Reimprimir PDF (público del flujo normal) ---
router.get('/reimprimir/:folio', async (req, res) => {
  try {
    const alumno = await Alumno.findOne({ folio: req.params.folio });

    if (!alumno || !alumno.registro_completado) {
      return res.status(404).json({ message: 'Folio no registrado o incompleto.' });
    }

    const datosAnidados = flattenToNested(alumno.toObject());
    const nombreArchivo = `${datosAnidados.datos_alumno?.curp || 'formulario'}.pdf`;

    await generarPDF(datosAnidados, nombreArchivo);

    res.json({ pdf: `/pdfs/${nombreArchivo}` });
  } catch (err) {
    console.error('❌ Error al reimprimir PDF:', err);
    res.status(500).json({ message: 'Error interno al generar PDF.' });
  }
});

// --- ENDPOINTS DASHBOARD (buscar/editar/eliminar/crear) ---
router.get('/dashboard/alumnos', async (req, res) => {
  const { folio, apellidos } = req.query;
  let query = {};
  if (folio) query.folio = folio;
  if (apellidos) {
    query['datos_alumno.primer_apellido'] = { $regex: apellidos, $options: 'i' };
  }
  try {
    const alumnos = await Alumno.find(query);
    res.json(alumnos);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar alumnos', error });
  }
});

router.get('/dashboard/alumnos/:id', async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id);
    if (!alumno) return res.status(404).json({ message: 'No encontrado' });
    res.json(alumno);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener alumno', error });
  }
});

router.put('/dashboard/alumnos/:id', async (req, res) => {
  try {
    const actualizado = await Alumno.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar alumno', error });
  }
});

router.delete('/dashboard/alumnos/:id', async (req, res) => {
  try {
    await Alumno.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alumno eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar alumno', error });
  }
});

router.post('/dashboard/alumnos', async (req, res) => {
  try {
    const nuevoAlumno = new Alumno(req.body);
    await nuevoAlumno.save();
    res.status(201).json(nuevoAlumno);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear alumno', error });
  }
});

// --- Exportar Excel de registrados ---
router.get('/exportar-excel', async (req, res) => {
  try {
    const alumnos = await Alumno.find({ registro_completado: true }).lean();
    if (!alumnos.length) {
      return res.status(404).json({ message: 'No hay alumnos registrados aún.' });
    }

    const datos = alumnos.map(al => ({
      folio: al.folio || '',
      // DATOS ALUMNO
      primer_apellido: al.datos_alumno?.primer_apellido || '',
      segundo_apellido: al.datos_alumno?.segundo_apellido || '',
      nombres: al.datos_alumno?.nombres || '',
      periodo_semestral: al.datos_alumno?.periodo_semestral || '',
      semestre: al.datos_alumno?.semestre || '',
      grupo: al.datos_alumno?.grupo || '',
      turno: al.datos_alumno?.turno || '',
      carrera: al.datos_alumno?.carrera || '',
      curp: al.datos_alumno?.curp || '',
      fecha_nacimiento: al.datos_alumno?.fecha_nacimiento || '',
      edad: al.datos_alumno?.edad || '',
      sexo: al.datos_alumno?.sexo || '',
      estado_nacimiento: al.datos_alumno?.estado_nacimiento || '',
      municipio_nacimiento: al.datos_alumno?.municipio_nacimiento || '',
      ciudad_nacimiento: al.datos_alumno?.ciudad_nacimiento || '',
      estado_civil: al.datos_alumno?.estado_civil || '',
      nacionalidad: al.datos_alumno?.nacionalidad || '',
      pais_extranjero: al.datos_alumno?.pais_extranjero || '',

      // DATOS GENERALES
      colonia: al.datos_generales?.colonia || '',
      domicilio: al.datos_generales?.domicilio || '',
      codigo_postal: al.datos_generales?.codigo_postal || '',
      telefono_alumno: al.datos_generales?.telefono_alumno || '',
      correo_alumno: al.datos_generales?.correo_alumno || '',
      paraescolar: al.datos_generales?.paraescolar || '',
      nivel_ingles: al.datos_generales?.nivel_ingles || '',
      certificacion_ingles: al.datos_generales?.certificacion_ingles || '',
      gustaria_certificarse: al.datos_generales?.gustaria_certificarse || '',
      entrega_diagnostico: al.datos_generales?.entrega_diagnostico || '',
      detalle_enfermedad: al.datos_generales?.detalle_enfermedad || '',
      responsable_emergencia_nombre: al.datos_generales?.responsable_emergencia?.nombre || '',
      responsable_emergencia_telefono: al.datos_generales?.responsable_emergencia?.telefono || '',
      responsable_emergencia_parentesco: al.datos_generales?.responsable_emergencia?.parentesco || '',
      carta_poder: al.datos_generales?.carta_poder || '',
      tipo_sangre: al.datos_generales?.tipo_sangre || '',
      contacto_emergencia_nombre: al.datos_generales?.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: al.datos_generales?.contacto_emergencia_telefono || '',
      habla_lengua_indigena_respuesta: al.datos_generales?.habla_lengua_indigena?.respuesta || '',
      habla_lengua_indigena_cual: al.datos_generales?.habla_lengua_indigena?.cual || '',
      primera_opcion: al.datos_generales?.primera_opcion || '',
      segunda_opcion: al.datos_generales?.segunda_opcion || '',
      tercera_opcion: al.datos_generales?.tercera_opcion || '',
      cuarta_opcion: al.datos_generales?.cuarta_opcion || '',
      estado_nacimiento_general: al.datos_generales?.estado_nacimiento_general || '',
      municipio_nacimiento_general: al.datos_generales?.municipio_nacimiento_general || '',
      ciudad_nacimiento_general: al.datos_generales?.ciudad_nacimiento_general || '',

      // DATOS MEDICOS
      numero_seguro_social: al.datos_medicos?.numero_seguro_social || '',
      unidad_medica_familiar: al.datos_medicos?.unidad_medica_familiar || '',
      enfermedad_cronica_respuesta: al.datos_medicos?.enfermedad_cronica_o_alergia?.respuesta || '',
      enfermedad_cronica_detalle: al.datos_medicos?.enfermedad_cronica_o_alergia?.detalle || '',
      discapacidad: al.datos_medicos?.discapacidad || '',

      // SECUNDARIA ORIGEN
      nombre_secundaria: al.secundaria_origen?.nombre_secundaria || '',
      regimen: al.secundaria_origen?.regimen || '',
      promedio_general: al.secundaria_origen?.promedio_general || '',
      modalidad: al.secundaria_origen?.modalidad || '',

      // TUTOR RESPONSABLE
      nombre_padre: al.tutor_responsable?.nombre_padre || '',
      telefono_padre: al.tutor_responsable?.telefono_padre || '',
      nombre_madre: al.tutor_responsable?.nombre_madre || '',
      telefono_madre: al.tutor_responsable?.telefono_madre || '',
      vive_con: al.tutor_responsable?.vive_con || '',
      tutores_trabajan: al.tutor_responsable?.tutores_trabajan || '',

      // PERSONA EMERGENCIA
      persona_emergencia_nombre: al.persona_emergencia?.nombre || '',
      persona_emergencia_parentesco: al.persona_emergencia?.parentesco || '',
      persona_emergencia_telefono: al.persona_emergencia?.telefono || ''
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(datos);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Alumnos');

    const exportPath = path.join(__dirname, '../exports', 'alumnos_registrados.xlsx');
    xlsx.writeFile(workbook, exportPath);

    res.download(exportPath, 'alumnos_registrados.xlsx', (err) => {
      if (err) {
        console.error('❌ Error al descargar:', err);
      }
      fs.unlinkSync(exportPath);
    });
  } catch (err) {
    console.error('❌ Error al exportar Excel:', err);
    res.status(500).json({ message: 'Error al exportar datos.' });
  }
});

// ===================== RUTAS ADMIN PARA GENERAR PDF =====================

// Devuelve JSON con la URL o redirige directo si ?redirect=1
router.get('/admin/generar-pdf/:folio', checkAdminToken, async (req, res) => {
  try {
    const { folio } = req.params;
    const alumno = await Alumno.findOne({ folio });
    if (!alumno) return res.status(404).json({ message: 'Alumno no encontrado' });

    const datos = flattenToNested(alumno.toObject());
    const nombreArchivo = `${datos.datos_alumno?.curp || 'formulario'}.pdf`;

    await generarPDF(datos, nombreArchivo);

    const pdfUrl = `/pdfs/${nombreArchivo}`;
    if (req.query.redirect === '1') {
      return res.redirect(pdfUrl);
    }
    return res.json({ ok: true, pdf_url: pdfUrl, folio, curp: datos.datos_alumno?.curp || '' });
  } catch (err) {
    console.error('❌ Error admin generar PDF:', err);
    res.status(500).json({ message: 'Error generando PDF' });
  }
});

// Redirige siempre directo al PDF (atajo)
router.get('/admin/pdf-direct/:folio', checkAdminToken, async (req, res) => {
  try {
    const { folio } = req.params;
    const alumno = await Alumno.findOne({ folio });
    if (!alumno) return res.status(404).send('Alumno no encontrado');

    const datos = flattenToNested(alumno.toObject());
    const nombreArchivo = `${datos.datos_alumno?.curp || 'formulario'}.pdf`;

    await generarPDF(datos, nombreArchivo);

    return res.redirect(`/pdfs/${nombreArchivo}`);
  } catch (err) {
    console.error('❌ Error admin pdf-direct:', err);
    res.status(500).send('Error generando PDF');
  }
});

module.exports = router;
