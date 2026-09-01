const assert = require('assert');
const {
  MAX_PARAESCOLAR,
  MAX_PARAESCOLAR_REINSCRIPCION,
  PARAESCOLAR_SIN_ASIGNAR,
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
  assert.strictEqual(MAX_PARAESCOLAR, 30);
  assert.strictEqual(MAX_PARAESCOLAR_REINSCRIPCION, 10);
  assert.deepStrictEqual(obtenerConfiguracionCuposParaescolar('REINSCRIPCION'), { tipo: 'REINSCRIPCION', limite: 10 });
  assert(PARAESCOLARES_DISPONIBLES.includes('CLUB DE FRANCÉS'));
  assert(PARAESCOLARES_DISPONIBLES.includes('BOX'));
   assert.strictEqual(PARAESCOLAR_SIN_ASIGNAR, 'NINGUNO');
  assert.strictEqual(normalizarParaescolar(' club-de-frances '), 'CLUB DE FRANCÉS');
  assert.strictEqual(normalizarParaescolar('Club de Francés'), 'CLUB DE FRANCÉS');
  assert.strictEqual(normalizarParaescolar(' box '), 'BOX');
  assert.strictEqual(normalizarParaescolar('ninguno'), 'NINGUNO');

  const alumnos = Array.from({ length: 25 }, (_, i) => ({
    _id: String(i + 1).padStart(24, '0'),
    folio: `F${i}`,
    datos_alumno: { curp: `CURP${i}` },
    datos_generales: { paraescolar: i % 2 === 0 ? 'box' : 'BOX' }
  }));

  const conteos = await contarParaescolares({
    Alumno: modeloFake(alumnos),
    Paraescolar: modeloFake([])
  });

  assert.strictEqual(conteos.get('BOX'), 25);

  const resumen = construirResumenParaescolares(conteos)
    .find((item) => item.nombre === 'BOX');

  assert.deepStrictEqual(
    { ocupados: resumen.ocupados, disponibles: resumen.disponibles, limite: resumen.limite, lleno: resumen.lleno },
    { ocupados: 26, disponibles: 4, limite: 30, lleno: false }
  );

  assert.strictEqual(await puedeAsignarParaescolar({
    Alumno: modeloFake(alumnos),
    Paraescolar: modeloFake([]),
    paraescolar: 'BOX'
  }), true);

  assert.strictEqual(await puedeAsignarParaescolar({
      Alumno: modeloFake([
      ...alumnos,
      {
        _id: '000000000000000000000030',
        folio: 'F25',
        datos_alumno: { curp: 'CURP25' },
        datos_generales: { paraescolar: 'BOX' }
      }
    ]),
    Paraescolar: modeloFake([]),
    paraescolar: 'BOX'
  }), false);
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
    const reinscripcionesSinParaescolar = Array.from({ length: 30 }, (_, i) => ({
    _id: `N${i}`.padStart(24, '0'),
    numero_control: `NN${i}`,
    tipo_tramite: 'REINSCRIPCION',
    datos_generales: { paraescolar: 'NINGUNO' }
  }));

  const conteosSinParaescolar = await contarParaescolares({
    Alumno: modeloFake([]),
    Paraescolar: modeloFake([]),
    Registrado: modeloFake(reinscripcionesSinParaescolar),
    tipoTramite: 'REINSCRIPCION'
  });

  assert.strictEqual(conteosSinParaescolar.has('NINGUNO'), false);
  assert.strictEqual(await puedeAsignarParaescolar({
    Alumno: modeloFake([]),
    Paraescolar: modeloFake([]),
    Registrado: modeloFake(reinscripcionesSinParaescolar),
    paraescolar: 'NINGUNO',
    tipoTramite: 'REINSCRIPCION'
  }), true);
}

run()
  .then(() => console.log('paraescolares.test.js OK'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
