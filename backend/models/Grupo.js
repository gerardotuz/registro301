// backend/models/Grupo.js
const mongoose = require('mongoose');

const GrupoSchema = new mongoose.Schema({
  folio: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombres: {
    type: String,
    required: true,
    trim: true
  },
  primer_apellido: {
    type: String,
    required: true,
    trim: true
  },
  segundo_apellido: {
    type: String,
    required: true,
    trim: true
  },
  grupo: {
    type: String,
    required: true,
    trim: true
  },
   turno: {
    type: String,
    required: true,
    trim: true
  },
  especialidad: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'grupos'
});

module.exports = mongoose.model('Grupo', GrupoSchema);

