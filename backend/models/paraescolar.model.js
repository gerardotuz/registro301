const mongoose = require("mongoose");

const ParaescolarSchema = new mongoose.Schema({
  numero_control: { type: String, required: true, unique: true },
  curp: String,
  nombre: String,
  grado: String,
  grupo: String,
  paraescolar: { type: String, default: null },
  turno: String,
  fecha_registro: Date,
  bloqueado: { type: Boolean, default: false }
});

module.exports = mongoose.model("Paraescolar", ParaescolarSchema);
