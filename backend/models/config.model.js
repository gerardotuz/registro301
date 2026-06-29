// backend/models/config.model.js

const mongoose = require("mongoose");

const ConfigSchema = new mongoose.Schema({
  bloqueo_registro: {
    type: Boolean,
    default: false
  },

  mensaje_bloqueo: {
    type: String,
    default: "El registro está temporalmente deshabilitado por administración estatal."
  },

  fecha_actualizacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Config", ConfigSchema);
