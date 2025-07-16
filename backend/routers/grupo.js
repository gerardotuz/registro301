const express = require('express');
const router = express.Router();
const Grupo = require('../models/Grupo');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

router.get('/consultar-grupo/:folio', async (req, res) => {
  try {
    const folio = req.params.folio.trim().toUpperCase();
    const grupo = await Grupo.findOne({ folio: folio });
    if (!grupo) {
      return res.status(404).json({ message: 'Folio no encontrado' });
    }
    res.json(grupo);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/cargar-grupos', upload.single('archivo'), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const datos = xlsx.utils.sheet_to_json(sheet);
    await Grupo.deleteMany({});
    await Grupo.insertMany(datos);
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Datos cargados correctamente' }); // <<--- siempre usar 'message'
  } catch (err) {
    console.error("❌ Error al cargar grupos:", err);
    res.status(500).json({ message: 'Error al cargar los datos' });
  }
});

module.exports = router;
