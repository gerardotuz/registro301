// backend/controllers/dashboardController.js
const Alumno = require('../models/Alumno');

// Obtener todos los alumnos
exports.getAllAlumnos = async (req, res) => {
  try {
    const alumnos = await Alumno.find();
    res.json(alumnos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Obtener un alumno por ID
exports.getAlumno = async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id);
    res.json(alumno);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Actualizar un alumno
exports.updateAlumno = async (req, res) => {
  try {
    await Alumno.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: 'Alumno actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Borrar un alumno
exports.deleteAlumno = async (req, res) => {
  try {
    await Alumno.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alumno eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
