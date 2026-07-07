const BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3001'
  : 'https://registro301.onrender.com';

const COLECCION_ALUMNOS = 'alumnos';
const COLECCION_REGISTRADOS = 'registrados';

const obtenerValor = (id) => document.getElementById(id)?.value || '';
const asignarValor = (id, valor = '') => {
  const campo = document.getElementById(id);
  if (campo) campo.value = valor ?? '';
};
const obtenerChecked = (id) => Boolean(document.getElementById(id)?.checked);
const asignarChecked = (id, valor = false) => {
  const campo = document.getElementById(id);
  if (campo) campo.checked = Boolean(valor);
};
function normalizarAlumno(alumno = {}, coleccion = COLECCION_ALUMNOS) {
  const da = alumno.datos_alumno || {};
  const dg = alumno.datos_generales || {};
  const dm = alumno.datos_medicos || {};
  const so = alumno.secundaria_origen || {};
  const tr = alumno.tutor_responsable || {};
  const pe = alumno.persona_emergencia || {};

  return {
    id: alumno._id,
    coleccion,
    folio: alumno.folio || alumno.numero_control || alumno.numeroControl || '',
    numero_control: alumno.numero_control || alumno.numeroControl || da.numero_control || '',
    estatus: alumno.estatus || '',
    materias_reprobadas: alumno.materias_reprobadas ?? alumno.adeudo ?? '',
    permitir_reimpresion_pdf: Boolean(alumno.permitir_reimpresion_pdf),
    tipo_tramite: alumno.tipo_tramite || (coleccion === COLECCION_REGISTRADOS ? 'REINSCRIPCION' : 'INSCRIPCION'),
    datos_alumno: {
      nombres: da.nombres || alumno.nombres || alumno.nombre || '',
      primer_apellido: da.primer_apellido || alumno.primer_apellido || '',
      segundo_apellido: da.segundo_apellido || alumno.segundo_apellido || '',
      periodo_semestral: da.periodo_semestral || alumno.periodo_semestral || '',
      semestre: da.semestre || alumno.semestre || alumno.grado || '',
      grupo: da.grupo || alumno.grupo || '',
      turno: da.turno || alumno.turno || '',
      carrera: da.carrera || alumno.carrera || '',
      curp: da.curp || alumno.curp || '',
      fecha_nacimiento: da.fecha_nacimiento || alumno.fecha_nacimiento || '',
      edad: da.edad || alumno.edad || '',
      sexo: da.sexo || alumno.sexo || '',
      estado_nacimiento: da.estado_nacimiento || alumno.estado_nacimiento || '',
      municipio_nacimiento: da.municipio_nacimiento || alumno.municipio_nacimiento || '',
      ciudad_nacimiento: da.ciudad_nacimiento || alumno.ciudad_nacimiento || '',
      estado_civil: da.estado_civil || alumno.estado_civil || '',
      nacionalidad: da.nacionalidad || alumno.nacionalidad || '',
      pais_extranjero: da.pais_extranjero || alumno.pais_extranjero || ''
    },
    datos_generales: {
      colonia: dg.colonia || alumno.colonia || '',
      domicilio: dg.domicilio || alumno.domicilio || '',
      codigo_postal: dg.codigo_postal || alumno.codigo_postal || '',
      telefono_alumno: dg.telefono_alumno || alumno.telefono_alumno || '',
      correo_alumno: dg.correo_alumno || alumno.correo_alumno || '',
      paraescolar: dg.paraescolar || alumno.paraescolar || '',
      entrega_diagnostico: dg.entrega_diagnostico || alumno.entrega_diagnostico || '',
      detalle_enfermedad: dg.detalle_enfermedad || alumno.detalle_enfermedad || '',
      responsable_emergencia: dg.responsable_emergencia || {},
      carta_poder: dg.carta_poder || alumno.carta_poder || '',
      tipo_sangre: dg.tipo_sangre || alumno.tipo_sangre || '',
      contacto_emergencia_nombre: dg.contacto_emergencia_nombre || alumno.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: dg.contacto_emergencia_telefono || alumno.contacto_emergencia_telefono || '',
      habla_lengua_indigena: dg.habla_lengua_indigena || {},
      hermanos_activos: dg.hermanos_activos || alumno.hermanos_activos || '',
      primera_opcion: dg.primera_opcion || alumno.primera_opcion || '',
      segunda_opcion: dg.segunda_opcion || alumno.segunda_opcion || '',
      tercera_opcion: dg.tercera_opcion || alumno.tercera_opcion || '',
      cuarta_opcion: dg.cuarta_opcion || alumno.cuarta_opcion || '',
      quinta_opcion: dg.quinta_opcion || alumno.quinta_opcion || '',
      estado_nacimiento_general: dg.estado_nacimiento_general || alumno.estado_nacimiento_general || '',
      municipio_nacimiento_general: dg.municipio_nacimiento_general || alumno.municipio_nacimiento_general || '',
      ciudad_nacimiento_general: dg.ciudad_nacimiento_general || alumno.ciudad_nacimiento_general || ''
    },
    datos_medicos: {
      numero_seguro_social: dm.numero_seguro_social || alumno.numero_seguro_social || '',
      unidad_medica_familiar: dm.unidad_medica_familiar || alumno.unidad_medica_familiar || '',
      enfermedad_cronica_o_alergia: dm.enfermedad_cronica_o_alergia || {},
      discapacidad: dm.discapacidad || alumno.discapacidad || ''
    },
    secundaria_origen: {
      nombre_secundaria: so.nombre_secundaria || alumno.nombre_secundaria || '',
      cct_secundaria: so.cct_secundaria || alumno.cct_secundaria || '',
      regimen: so.regimen || alumno.regimen || '',
      promedio_general: so.promedio_general || alumno.promedio_general || '',
      modalidad: so.modalidad || alumno.modalidad || '',
      participaciones_secundaria: so.participaciones_secundaria || alumno.participaciones_secundaria || ''
    },
    tutor_responsable: tr,
    persona_emergencia: pe
  };
}

function construirDatosFormulario() {
  const coleccion = obtenerValor('editCollection') || COLECCION_ALUMNOS;
  const folio = obtenerValor('folio');
  const numeroControl = obtenerValor('numero_control') || folio;
  const datos = {
    folio,
    datos_alumno: {
      primer_apellido: obtenerValor('primer_apellido'),
      segundo_apellido: obtenerValor('segundo_apellido'),
      nombres: obtenerValor('nombres'),
      periodo_semestral: obtenerValor('periodo_semestral'),
      semestre: obtenerValor('semestre'),
      grupo: obtenerValor('grupo'),
      turno: obtenerValor('turno'),
      carrera: obtenerValor('carrera'),
      curp: obtenerValor('curp'),
      fecha_nacimiento: obtenerValor('fecha_nacimiento'),
      edad: obtenerValor('edad'),
      sexo: obtenerValor('sexo'),
      estado_nacimiento: obtenerValor('estado_nacimiento'),
      municipio_nacimiento: obtenerValor('municipio_nacimiento'),
      ciudad_nacimiento: obtenerValor('ciudad_nacimiento'),
      estado_civil: obtenerValor('estado_civil'),
      nacionalidad: obtenerValor('nacionalidad'),
      pais_extranjero: obtenerValor('pais_extranjero')
    },
    datos_generales: {
      colonia: obtenerValor('colonia'),
      domicilio: obtenerValor('domicilio'),
      codigo_postal: obtenerValor('codigo_postal'),
      telefono_alumno: obtenerValor('telefono_alumno'),
      correo_alumno: obtenerValor('correo_alumno'),
      paraescolar: obtenerValor('paraescolar'),
      entrega_diagnostico: obtenerValor('entrega_diagnostico'),
      detalle_enfermedad: obtenerValor('detalle_enfermedad'),
      responsable_emergencia: {
        nombre: obtenerValor('responsable_emergencia_nombre'),
        telefono: obtenerValor('responsable_emergencia_telefono'),
        parentesco: obtenerValor('responsable_emergencia_parentesco')
      },
      carta_poder: obtenerValor('carta_poder'),
      tipo_sangre: obtenerValor('tipo_sangre'),
      contacto_emergencia_nombre: obtenerValor('contacto_emergencia_nombre'),
      contacto_emergencia_telefono: obtenerValor('contacto_emergencia_telefono'),
      habla_lengua_indigena: {
        respuesta: obtenerValor('habla_lengua_indigena_respuesta'),
        cual: obtenerValor('habla_lengua_indigena_cual')
      },
      hermanos_activos: obtenerValor('hermanos_activos'),
      primera_opcion: obtenerValor('primera_opcion'),
      segunda_opcion: obtenerValor('segunda_opcion'),
      tercera_opcion: obtenerValor('tercera_opcion'),
      cuarta_opcion: obtenerValor('cuarta_opcion'),
      quinta_opcion: obtenerValor('quinta_opcion'),
      estado_nacimiento_general: obtenerValor('estado_nacimiento_general'),
      municipio_nacimiento_general: obtenerValor('municipio_nacimiento_general'),
      ciudad_nacimiento_general: obtenerValor('ciudad_nacimiento_general')
    },
    datos_medicos: {
      numero_seguro_social: obtenerValor('numero_seguro_social'),
      unidad_medica_familiar: obtenerValor('unidad_medica_familiar'),
      enfermedad_cronica_o_alergia: {
        respuesta: obtenerValor('enfermedad_cronica_respuesta'),
        detalle: obtenerValor('enfermedad_cronica_detalle')
      },
      discapacidad: obtenerValor('discapacidad')
    },
    secundaria_origen: {
      nombre_secundaria: obtenerValor('nombre_secundaria'),
      cct_secundaria: obtenerValor('cct_secundaria'),
      regimen: obtenerValor('regimen'),
      promedio_general: obtenerValor('promedio_general'),
      modalidad: obtenerValor('modalidad'),
      participaciones_secundaria: obtenerValor('participaciones_secundaria')
    },
    tutor_responsable: {
      nombre_padre: obtenerValor('nombre_padre'),
      telefono_padre: obtenerValor('telefono_padre'),
      nombre_madre: obtenerValor('nombre_madre'),
      telefono_madre: obtenerValor('telefono_madre'),
      vive_con: obtenerValor('vive_con')
    },
    persona_emergencia: {
      nombre: obtenerValor('persona_emergencia_nombre'),
      parentesco: obtenerValor('persona_emergencia_parentesco'),
      telefono: obtenerValor('persona_emergencia_telefono')
    }
  };

    datos.tipo_tramite = obtenerValor('tipo_tramite') || (coleccion === COLECCION_REGISTRADOS ? 'REINSCRIPCION' : 'INSCRIPCION');

  if (obtenerChecked('desbloquear_registro')) {
    datos.desbloquear_registro = true;
  }

  if (coleccion === COLECCION_REGISTRADOS) {
    datos.numero_control = numeroControl;
    datos.numeroControl = numeroControl;
    datos.estatus = obtenerValor('estatus');
    datos.materias_reprobadas = obtenerValor('materias_reprobadas');
    datos.adeudo = obtenerValor('materias_reprobadas');
    datos.permitir_reimpresion_pdf = obtenerChecked('permitir_reimpresion_pdf');
    datos.tipo_tramite = obtenerValor('tipo_tramite') || 'REINSCRIPCION';
    datos.nombres = datos.datos_alumno.nombres;
    datos.primer_apellido = datos.datos_alumno.primer_apellido;
    datos.segundo_apellido = datos.datos_alumno.segundo_apellido;
    datos.curp = datos.datos_alumno.curp;
    datos.carrera = datos.datos_alumno.carrera;
    datos.semestre = datos.datos_alumno.semestre;
    datos.grupo = datos.datos_alumno.grupo;
    datos.turno = datos.datos_alumno.turno;
  }

  return datos;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('login')) {
    window.location.href = '/login.html';
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('login');
    window.location.href = '/login.html';
  });

  const searchFolio = document.getElementById('searchFolio');
  const searchApellidos = document.getElementById('searchApellidos');
  const btnBuscar = document.getElementById('btnBuscar');
  const resultadosTable = document.getElementById('resultadosTable');
  const ultimoFolioAsignado = document.getElementById('ultimoFolioAsignado');

  async function cargarUltimoFolioAsignado() {
    if (!ultimoFolioAsignado) return;

    ultimoFolioAsignado.textContent = 'Cargando...';

    try {
      const res = await fetch(`${BASE_URL}/api/dashboard/ultimo-folio`);
      if (!res.ok) throw new Error('No se pudo consultar el último folio');

      const data = await res.json();
      ultimoFolioAsignado.textContent = data.folio || 'Sin folios';
    } catch (error) {
      console.error('Error al cargar el último folio asignado:', error);
      ultimoFolioAsignado.textContent = 'No disponible';
    }
  }

  cargarUltimoFolioAsignado();
  function configurarFormularioPorColeccion(coleccion) {
    const esRegistrado = coleccion === COLECCION_REGISTRADOS;
    document.getElementById('editModalTitle').textContent = esRegistrado
      ? 'Editar Alumno Registrado / Reinscripción'
      : 'Editar Alumno de Registro';
    document.getElementById('tipoFormularioBadge').textContent = esRegistrado
      ? 'Colección: registrados'
      : 'Colección: alumnos';
    document.querySelectorAll('[data-registrado-only]').forEach((el) => {
      el.classList.toggle('d-none', !esRegistrado);
    });
    const tipoTramite = document.getElementById('tipo_tramite');
    if (tipoTramite && !obtenerValor('editId')) {
      tipoTramite.value = esRegistrado ? 'REINSCRIPCION' : 'INSCRIPCION';
    }
    document.getElementById('folioLabel').textContent = esRegistrado ? 'Folio / Número de Control' : 'Número de Control';
  }

  function renderizarResultados(data) {
    resultadosTable.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) {
      resultadosTable.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron resultados</td></tr>';
      return;
    }

    data.forEach((item) => {
      const coleccion = item._dashboardCollection || COLECCION_ALUMNOS;
      const alumno = normalizarAlumno(item, coleccion);
      const da = alumno.datos_alumno;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${alumno.folio || alumno.numero_control || ''}</td>
        <td><span class="badge ${coleccion === COLECCION_REGISTRADOS ? 'bg-info text-dark' : 'bg-secondary'}">${coleccion}</span></td>
        <td>${da.primer_apellido} ${da.segundo_apellido} ${da.nombres}</td>
        <td>${da.curp}</td>
        <td>${da.semestre}</td>
        <td>${da.grupo}</td>
        <td>
        <button class="btn btn-sm btn-warning btnEditar" data-id="${alumno.id}" data-collection="${coleccion}">Editar</button>
          <button class="btn btn-sm btn-danger btnEliminar" data-id="${alumno.id}" data-collection="${coleccion}">Eliminar</button>
        </td>
      `;
      resultadosTable.appendChild(row);
    });

     document.querySelectorAll('.btnEditar').forEach(btn => btn.addEventListener('click', abrirModalEdicion));
    document.querySelectorAll('.btnEliminar').forEach(btn => btn.addEventListener('click', eliminarAlumno));
  }

  btnBuscar.addEventListener('click', async () => {
    resultadosTable.innerHTML = '<tr><td colspan="7" class="text-center">Buscando...</td></tr>';
    const folio = encodeURIComponent(searchFolio.value.trim());
    const apellidos = encodeURIComponent(searchApellidos.value.trim());
    const res = await fetch(`${BASE_URL}/api/dashboard/alumnos?folio=${folio}&apellidos=${apellidos}`);
    const data = await res.json();
    renderizarResultados(data);
  });
function cargarFormulario(alumnoOriginal, coleccion) {
    const alumno = normalizarAlumno(alumnoOriginal, coleccion);
    const da = alumno.datos_alumno;
    const dg = alumno.datos_generales;
    const dm = alumno.datos_medicos;
    const so = alumno.secundaria_origen;
    const tr = alumno.tutor_responsable || {};
    const pe = alumno.persona_emergencia || {};

    asignarValor('editId', alumno.id);
    asignarValor('editCollection', coleccion);
    asignarValor('folio', alumno.folio);
    asignarValor('numero_control', alumno.numero_control || alumno.folio);
    asignarValor('estatus', alumno.estatus);
    asignarValor('materias_reprobadas', alumno.materias_reprobadas);
  asignarChecked('permitir_reimpresion_pdf', alumno.permitir_reimpresion_pdf);
    asignarValor('tipo_tramite', alumno.tipo_tramite);
 asignarChecked('desbloquear_registro', false);
    Object.entries(da).forEach(([key, value]) => asignarValor(key, value));
    asignarValor('colonia', dg.colonia);
    asignarValor('domicilio', dg.domicilio);
    asignarValor('codigo_postal', dg.codigo_postal);
    asignarValor('telefono_alumno', dg.telefono_alumno);
    asignarValor('correo_alumno', dg.correo_alumno);
    asignarValor('paraescolar', dg.paraescolar);
    asignarValor('entrega_diagnostico', dg.entrega_diagnostico);
    asignarValor('detalle_enfermedad', dg.detalle_enfermedad);
    asignarValor('responsable_emergencia_nombre', dg.responsable_emergencia?.nombre);
    asignarValor('responsable_emergencia_telefono', dg.responsable_emergencia?.telefono);
    asignarValor('responsable_emergencia_parentesco', dg.responsable_emergencia?.parentesco);
    asignarValor('carta_poder', dg.carta_poder);
    asignarValor('tipo_sangre', dg.tipo_sangre);
    asignarValor('contacto_emergencia_nombre', dg.contacto_emergencia_nombre);
    asignarValor('contacto_emergencia_telefono', dg.contacto_emergencia_telefono);
    asignarValor('habla_lengua_indigena_respuesta', dg.habla_lengua_indigena?.respuesta);
    asignarValor('habla_lengua_indigena_cual', dg.habla_lengua_indigena?.cual);
    asignarValor('hermanos_activos', dg.hermanos_activos);
    asignarValor('primera_opcion', dg.primera_opcion);
    asignarValor('segunda_opcion', dg.segunda_opcion);
    asignarValor('tercera_opcion', dg.tercera_opcion);
    asignarValor('cuarta_opcion', dg.cuarta_opcion);
    asignarValor('quinta_opcion', dg.quinta_opcion);
    asignarValor('estado_nacimiento_general', dg.estado_nacimiento_general);
    asignarValor('municipio_nacimiento_general', dg.municipio_nacimiento_general);
    asignarValor('ciudad_nacimiento_general', dg.ciudad_nacimiento_general);

    asignarValor('numero_seguro_social', dm.numero_seguro_social);
    asignarValor('unidad_medica_familiar', dm.unidad_medica_familiar);
    asignarValor('enfermedad_cronica_respuesta', dm.enfermedad_cronica_o_alergia?.respuesta);
    asignarValor('enfermedad_cronica_detalle', dm.enfermedad_cronica_o_alergia?.detalle);
    asignarValor('discapacidad', dm.discapacidad);

    asignarValor('nombre_secundaria', so.nombre_secundaria);
    asignarValor('cct_secundaria', so.cct_secundaria);
    asignarValor('regimen', so.regimen);
    asignarValor('promedio_general', so.promedio_general);
    asignarValor('modalidad', so.modalidad);
    asignarValor('participaciones_secundaria', so.participaciones_secundaria);

    asignarValor('nombre_padre', tr.nombre_padre);
    asignarValor('telefono_padre', tr.telefono_padre);
    asignarValor('nombre_madre', tr.nombre_madre);
    asignarValor('telefono_madre', tr.telefono_madre);
    asignarValor('vive_con', tr.vive_con);

    asignarValor('persona_emergencia_nombre', pe.nombre);
    asignarValor('persona_emergencia_parentesco', pe.parentesco);
    asignarValor('persona_emergencia_telefono', pe.telefono);
  }
  function abrirModalEdicion(e) {
    const id = e.target.dataset.id;
    const coleccion = e.target.dataset.collection || COLECCION_ALUMNOS;
    configurarFormularioPorColeccion(coleccion);
    fetch(`/api/dashboard/${coleccion}/${id}`)
      .then(res => res.json())
      .then(alumno => {
        cargarFormulario(alumno, coleccion);

        new bootstrap.Modal(document.getElementById('editModal')).show();
      });
  }

  const btnGenerarFicha = document.getElementById('btnGenerarFicha');
  if (btnGenerarFicha) {
    btnGenerarFicha.addEventListener('click', async () => {
      const id = obtenerValor('editId');
      const coleccion = obtenerValor('editCollection') || COLECCION_ALUMNOS;

      if (!id) {
        alert('Guarda el alumno antes de generar la ficha de inscripción.');
        return;
      }

      btnGenerarFicha.disabled = true;
      btnGenerarFicha.textContent = 'Generando...';

      try {
        const res = await fetch(`/api/dashboard/${coleccion}/${id}/ficha`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || 'No se pudo generar la ficha de inscripción');
        }

        if (data.pdf_url) {
          window.open(data.pdf_url, '_blank');
        }
      } catch (error) {
        alert(error.message);
      } finally {
        btnGenerarFicha.disabled = false;
        btnGenerarFicha.textContent = 'Generar Ficha de inscripción';
      }
    });
  }
  
document.getElementById('btnGuardar').addEventListener('click', async () => {
    const id = obtenerValor('editId');
    const coleccion = obtenerValor('editCollection') || COLECCION_ALUMNOS;
    const datos = construirDatosFormulario();
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/dashboard/${coleccion}/${id}` : `/api/dashboard/${coleccion}`;

  const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error.message || 'No se pudo guardar el registro');
      return;
    }

 
    alert('Guardado correctamente');
    location.reload();
  });



  function eliminarAlumno(e) {
    const id = e.target.dataset.id;
   const coleccion = e.target.dataset.collection || COLECCION_ALUMNOS;
    if (confirm(`¿Eliminar este registro de la colección ${coleccion}?`)) {
      fetch(`/api/dashboard/${coleccion}/${id}`, { method: 'DELETE' })
        .then(() => {
          alert('Registro eliminado');
          location.reload();
        });
    }
  }

  document.getElementById('excelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await fetch(`${BASE_URL}/api/cargar-excel`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      alert(result.message);
    } catch (err) {
      alert('Error al cargar archivo');
    }
  });

  document.getElementById('formGrupos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const archivo = document.getElementById('archivoGrupos').files[0];
    if (!archivo) return alert('Selecciona un archivo');
    const formData = new FormData();
    formData.append('archivo', archivo);
    try {
      const res = await fetch(`${BASE_URL}/api/cargar-grupos`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      alert(result.message);
    } catch (err) {
      alert('Error al cargar archivo');
    }
  });

document.getElementById('btnAgregarNuevo').addEventListener('click', () => {
  const coleccion = obtenerValor('tipoNuevoAlumno') === COLECCION_REGISTRADOS
      ? COLECCION_REGISTRADOS
      : COLECCION_ALUMNOS;
    const inputs = document.querySelectorAll('#editForm input, #editForm select, #editForm textarea');
    inputs.forEach(input => {
      if (input.type === 'checkbox') input.checked = false;
      else input.value = '';
    });
    document.getElementById('editId').value = '';
   document.getElementById('editCollection').value = coleccion;
    configurarFormularioPorColeccion(coleccion);
    asignarValor('tipo_tramite', coleccion === COLECCION_REGISTRADOS ? 'REINSCRIPCION' : 'INSCRIPCION');
    new bootstrap.Modal(document.getElementById('editModal')).show();
  });

  
});
