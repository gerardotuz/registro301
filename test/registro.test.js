const assert = require('assert');
const { aplicarDesbloqueoInscripcion } = require('../backend/utils/registro');

const actualizacion = aplicarDesbloqueoInscripcion({
  registro_completado: true,
  bloqueado: true,
  registro_habilitado: false,
  fecha_deshabilitacion_registro: new Date('2026-08-01T00:00:00.000Z')
});

assert.deepStrictEqual(actualizacion, {
  registro_completado: false,
  bloqueado: false,
  registro_habilitado: true,
  fecha_deshabilitacion_registro: null
});

console.log('registro.test.js OK');
