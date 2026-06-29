const mongoose = require('mongoose');

const RegistradoSchema = new mongoose.Schema({
  carrera: { type: String, trim: true, uppercase: true },
  numero_control: { type: String, trim: true, uppercase: true },
  curp: { type: String, trim: true, uppercase: true },
  nombres: { type: String, trim: true, uppercase: true },
  primer_apellido: { type: String, trim: true, uppercase: true },
  segundo_apellido: { type: String, trim: true, uppercase: true },
  semestre: { type: String, trim: true, uppercase: true },
  grupo: { type: String, trim: true, uppercase: true },
  turno: { type: String, trim: true, uppercase: true },
  estatus: { type: String, trim: true, uppercase: true },

  // Campos del flujo de reinscripción
  materias_reprobadas: { type: Number, default: 0 },
  tipo_tramite: { type: String, trim: true, uppercase: true, default: 'REGISTRADO' }
}, {
  timestamps: true,
  collection: 'registrados',
  strict: false
});


module.exports = mongoose.model('Registrado', RegistradoSchema);
