const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Ruta para login
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('🔐 Intentando login con:', username);

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });

    res.status(200).json({ message: 'Login exitoso' });
  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});
// Ruta para ver todos los usuarios (SOLO PARA PRUEBA, BORRAR DESPUÉS)
router.get('/auth/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});


// Ruta para crear el primer admin
router.post('/auth/register-admin', async (req, res) => {
  const { username, password } = req.body;
  console.log('🛠️ Registrando nuevo admin:', username);

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashed });
    await newUser.save();

    res.status(201).json({ message: 'Administrador creado' });
  } catch (err) {
    console.error('❌ Error en register-admin:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
