const mongoose = require('mongoose');

const HermanoControlUsadoSchema = new mongoose.Schema({
  numero_control: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  folio_registro: { type: String, trim: true, uppercase: true },
  curp_registro: { type: String, trim: true, uppercase: true },
  nombres_registro: { type: String, trim: true, uppercase: true },
  origen: { type: String, trim: true, uppercase: true, default: 'FORMULARIO_REGISTRO' }
}, {
  timestamps: true,
  collection: 'hermanos_control_usados'
});

HermanoControlUsadoSchema.index({ numero_control: 1 }, { unique: true });

module.exports = mongoose.model('HermanoControlUsado', HermanoControlUsadoSchema);
