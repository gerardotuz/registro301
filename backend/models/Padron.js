const mongoose = require("mongoose");

const PadronSchema = new mongoose.Schema({
  curp: { type: String, unique: true, index: true },
  nombres: String,
  primer_apellido: String,
  segundo_apellido: String
});

module.exports = mongoose.model("Padron", PadronSchema, "padron_curp");
