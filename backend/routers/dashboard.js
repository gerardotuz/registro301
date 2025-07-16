// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/alumnos', dashboardController.getAllAlumnos);
router.get('/alumno/:id', dashboardController.getAlumno);
router.put('/alumno/:id', dashboardController.updateAlumno);
router.delete('/alumno/:id', dashboardController.deleteAlumno);

module.exports = router;
