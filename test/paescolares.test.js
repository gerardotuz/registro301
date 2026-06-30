const assert = require('assert');
const {
  MAX_PARAESCOLAR,
  MAX_PARAESCOLAR_REINSCRIPCION,
  PARAESCOLARES_DISPONIBLES,
  normalizarParaescolar,
  construirResumenParaescolares,
  contarParaescolares,
   puedeAsignarParaescolar,
  obtenerConfiguracionCuposParaescolar
  
} = require('../backend/utils/paraescolares');

function modeloFake(documentos) {
  return {
    find() {
      return { lean: async () => documentos };
    }
  };
}

async function run() {
  assert.strictEqual(MAX_PARAESCOLAR, 25);
  assert.strictEqual(MAX_PARAESCOLAR_REINSCRIPCION, 10);
  assert.deepStrictEqual(obtenerConfiguracionCuposParaescolar('REINSCRIPCION'), { tipo: 'REINSCRIPCION', limite: 10 });
  assert(PARAESCOLARES_DISPONIBLES.includes('CLUB DE FRANCÉS'));
  assert.strictEqual(normalizarParaescolar(' club-de-frances '), 'CLUB DE FRANCÉS');
  assert.strictEqual(normalizarParaescolar('Club de Francés'), 'CLUB DE FRANCÉS');

  const alumnos = Array.from({ length: 25 }, (_, i) => ({
    _id: String(i + 1).padStart(24, '0'),
    folio: `F${i}`,
    datos_alumno: { curp: `CURP${i}` },
    datos_generales: { paraescolar: i % 2 === 0 ? 'club-de-frances' : 'CLUB DE FRANCÉS' }
  }));

  const conteos = await contarParaescolares({
    Alumno: modeloFake(alumnos),
    Paraescolar: modeloFake([])
  });

  assert.strictEqual(conteos.get('CLUB DE FRANCÉS'), 25);

  const resumen = construirResumenParaescolares(conteos)
    .find((item) => item.nombre === 'CLUB DE FRANCÉS');

  assert.deepStrictEqual(
    { ocupados: resumen.ocupados, disponibles: resumen.disponibles, limite: resumen.limite, lleno: resumen.lleno },
    { ocupados: 25, disponibles: 0, limite: 25, lleno: true }
  );

  assert.strictEqual(await puedeAsignarParaescolar({
    Alumno: modeloFake(alumnos),
    Paraescolar: modeloFake([]),
    paraescolar: 'CLUB DE FRANCÉS'
  }), false);

  assert.strictEqual(await puedeAsignarParaescolar({
    Alumno: modeloFake(alumnos.slice(0, 24)),
    Paraescolar: modeloFake([]),
    paraescolar: 'CLUB DE FRANCÉS'
  }), true);
   const reinscripciones = Array.from({ length: 10 }, (_, i) => ({
    _id: `R${i}`.padStart(24, '0'),
    numero_control: `NC${i}`,
    tipo_tramite: 'REINSCRIPCION',
    datos_generales: { paraescolar: 'CLUB DE FRANCÉS' }
  }));

  const conteosReinscripcion = await contarParaescolares({
    Alumno: modeloFake([]),
    Paraescolar: modeloFake([]),
    Registrado: modeloFake(reinscripciones),
    tipoTramite: 'REINSCRIPCION'
  });

  const resumenReinscripcion = construirResumenParaescolares(conteosReinscripcion, 10)
    .find((item) => item.nombre === 'CLUB DE FRANCÉS');

  assert.deepStrictEqual(
    { ocupados: resumenReinscripcion.ocupados, disponibles: resumenReinscripcion.disponibles, limite: resumenReinscripcion.limite, lleno: resumenReinscripcion.lleno },
    { ocupados: 10, disponibles: 0, limite: 10, lleno: true }
  );

  assert.strictEqual(await puedeAsignarParaescolar({
    Alumno: modeloFake([]),
    Paraescolar: modeloFake([]),
    Registrado: modeloFake(reinscripciones),
    paraescolar: 'CLUB DE FRANCÉS',
    tipoTramite: 'REINSCRIPCION'
  }), false);
}

run()
  .then(() => console.log('paraescolares.test.js OK'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
