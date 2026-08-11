function aplicarDesbloqueoInscripcion(datos) {
  datos.registro_completado = false;
  datos.bloqueado = false;
  datos.registro_habilitado = true;
  datos.fecha_deshabilitacion_registro = null;

  return datos;
}

module.exports = {
  aplicarDesbloqueoInscripcion
};
