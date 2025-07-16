const mongoose = require('mongoose');

const alumnoSchema = new mongoose.Schema({
  folio: { type: String, required: true, unique: true },
  registro_completado: { type: Boolean, default: false },

  datos_alumno: {
    primer_apellido: String,
    segundo_apellido: String,
    nombres: String,
    periodo_semestral: String,
    semestre: Number,
    grupo: String,
    turno: String,
    carrera: String,
    curp: String,
    fecha_nacimiento: String,
    edad: Number,
    sexo: String,
    estado_nacimiento: String,
    municipio_nacimiento: String,
    ciudad_nacimiento: String,
    estado_civil: Number,
    nacionalidad: String,
    pais_extranjero: String
  },

  datos_generales: {
    colonia: String,
    domicilio: String,
    codigo_postal: String,
    telefono_alumno: String,
    correo_alumno: String,
    paraescolar: String,
    entrega_diagnostico: String,
    detalle_enfermedad: String,
    responsable_emergencia: {
      nombre: String,
      telefono: String,
      parentesco: String
    },
    carta_poder: String,
    tipo_sangre: String,
    contacto_emergencia_nombre: String,
    contacto_emergencia_telefono: String,
    habla_lengua_indigena: {
      respuesta: String,
      cual: String
    },
    primera_opcion: String,
    segunda_opcion: String,
    tercera_opcion: String,
    cuarta_opcion: String,

    // ✅ Nuevos campos agregados
    estado_nacimiento_general: String,
    municipio_nacimiento_general: String,
    ciudad_nacimiento_general: String
  },

  datos_medicos: {
    numero_seguro_social: String,
    unidad_medica_familiar: String,
    enfermedad_cronica_o_alergia: {
      respuesta: String,
      detalle: String
    },
    discapacidad: String
  },

  secundaria_origen: {
    nombre_secundaria: String,
    regimen: String,
    promedio_general: Number,
    modalidad: String
  },

  tutor_responsable: {
    nombre_padre: String,
    telefono_padre: String,
    nombre_madre: String,
    telefono_madre: String,
    vive_con: String
  },

  persona_emergencia: {
    nombre: String,
    parentesco: String,
    telefono: String
  }

}, {
  timestamps: true,
  collection: 'alumnos'
});

module.exports = mongoose.model('Alumno', alumnoSchema);
