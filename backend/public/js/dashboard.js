const BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3001'
  : 'https://registro272.onrender.com';

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

  btnBuscar.addEventListener('click', async () => {
    resultadosTable.innerHTML = '';
    const folio = searchFolio.value.trim();
    const apellidos = searchApellidos.value.trim();
    const res = await fetch(`${BASE_URL}/api/dashboard/alumnos?folio=${folio}&apellidos=${apellidos}`);
    const data = await res.json();

    data.forEach(alumno => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${alumno.folio}</td>
        <td>${alumno.datos_alumno.primer_apellido} ${alumno.datos_alumno.segundo_apellido} ${alumno.datos_alumno.nombres}</td>
        <td>${alumno.datos_alumno.curp}</td>
        <td>${alumno.datos_alumno.semestre}</td>
        <td>${alumno.datos_alumno.grupo}</td>
        <td>
          <button class="btn btn-sm btn-warning btnEditar" data-id="${alumno._id}">Editar</button>
          <button class="btn btn-sm btn-danger btnEliminar" data-id="${alumno._id}">Eliminar</button>
        </td>
      `;
      resultadosTable.appendChild(row);
    });

    document.querySelectorAll('.btnEditar').forEach(btn => {
      btn.addEventListener('click', abrirModalEdicion);
    });
    document.querySelectorAll('.btnEliminar').forEach(btn => {
      btn.addEventListener('click', eliminarAlumno);
    });
  });

  function abrirModalEdicion(e) {
    const id = e.target.dataset.id;
    fetch(`/api/dashboard/alumnos/${id}`)
      .then(res => res.json())
      .then(alumno => {
        document.getElementById('editId').value = alumno._id;
        document.getElementById('folio').value = alumno.folio || '';
        const da = alumno.datos_alumno || {};
        document.getElementById('primer_apellido').value = da.primer_apellido || '';
        document.getElementById('segundo_apellido').value = da.segundo_apellido || '';
        document.getElementById('nombres').value = da.nombres || '';
        document.getElementById('periodo_semestral').value = da.periodo_semestral || '';
        document.getElementById('semestre').value = da.semestre || '';
        document.getElementById('grupo').value = da.grupo || '';
        document.getElementById('turno').value = da.turno || '';
        document.getElementById('carrera').value = da.carrera || '';
        document.getElementById('curp').value = da.curp || '';
        document.getElementById('fecha_nacimiento').value = da.fecha_nacimiento || '';
        document.getElementById('edad').value = da.edad || '';
        document.getElementById('sexo').value = da.sexo || '';
        document.getElementById('estado_nacimiento').value = da.estado_nacimiento || '';
        document.getElementById('municipio_nacimiento').value = da.municipio_nacimiento || '';
        document.getElementById('ciudad_nacimiento').value = da.ciudad_nacimiento || '';
        document.getElementById('estado_civil').value = da.estado_civil || '';
        document.getElementById('nacionalidad').value = da.nacionalidad || '';
        document.getElementById('pais_extranjero').value = da.pais_extranjero || '';

        const dg = alumno.datos_generales || {};
        document.getElementById('colonia').value = dg.colonia || '';
        document.getElementById('domicilio').value = dg.domicilio || '';
        document.getElementById('codigo_postal').value = dg.codigo_postal || '';
        document.getElementById('telefono_alumno').value = dg.telefono_alumno || '';
        document.getElementById('correo_alumno').value = dg.correo_alumno || '';
        document.getElementById('paraescolar').value = dg.paraescolar || '';
        document.getElementById('entrega_diagnostico').value = dg.entrega_diagnostico || '';
        document.getElementById('detalle_enfermedad').value = dg.detalle_enfermedad || '';
        document.getElementById('responsable_emergencia_nombre').value = dg.responsable_emergencia?.nombre || '';
        document.getElementById('responsable_emergencia_telefono').value = dg.responsable_emergencia?.telefono || '';
        document.getElementById('responsable_emergencia_parentesco').value = dg.responsable_emergencia?.parentesco || '';
        document.getElementById('carta_poder').value = dg.carta_poder || '';
        document.getElementById('tipo_sangre').value = dg.tipo_sangre || '';
        document.getElementById('contacto_emergencia_nombre').value = dg.contacto_emergencia_nombre || '';
        document.getElementById('contacto_emergencia_telefono').value = dg.contacto_emergencia_telefono || '';
        document.getElementById('habla_lengua_indigena_respuesta').value = dg.habla_lengua_indigena?.respuesta || '';
        document.getElementById('habla_lengua_indigena_cual').value = dg.habla_lengua_indigena?.cual || '';
        document.getElementById('primera_opcion').value = dg.primera_opcion || '';
        document.getElementById('segunda_opcion').value = dg.segunda_opcion || '';
        document.getElementById('tercera_opcion').value = dg.tercera_opcion || '';
        document.getElementById('cuarta_opcion').value = dg.cuarta_opcion || '';
        document.getElementById('estado_nacimiento_general').value = dg.estado_nacimiento_general || '';
        document.getElementById('municipio_nacimiento_general').value = dg.municipio_nacimiento_general || '';
        document.getElementById('ciudad_nacimiento_general').value = dg.ciudad_nacimiento_general || '';

        const dm = alumno.datos_medicos || {};
        document.getElementById('numero_seguro_social').value = dm.numero_seguro_social || '';
        document.getElementById('unidad_medica_familiar').value = dm.unidad_medica_familiar || '';
        document.getElementById('enfermedad_cronica_respuesta').value = dm.enfermedad_cronica_o_alergia?.respuesta || '';
        document.getElementById('enfermedad_cronica_detalle').value = dm.enfermedad_cronica_o_alergia?.detalle || '';
        document.getElementById('discapacidad').value = dm.discapacidad || '';

        const so = alumno.secundaria_origen || {};
        document.getElementById('nombre_secundaria').value = so.nombre_secundaria || '';
        document.getElementById('regimen').value = so.regimen || '';
        document.getElementById('promedio_general').value = so.promedio_general || '';
        document.getElementById('modalidad').value = so.modalidad || '';

        const tr = alumno.tutor_responsable || {};
        document.getElementById('nombre_padre').value = tr.nombre_padre || '';
        document.getElementById('telefono_padre').value = tr.telefono_padre || '';
        document.getElementById('nombre_madre').value = tr.nombre_madre || '';
        document.getElementById('telefono_madre').value = tr.telefono_madre || '';
        document.getElementById('vive_con').value = tr.vive_con || '';

        const pe = alumno.persona_emergencia || {};
        document.getElementById('persona_emergencia_nombre').value = pe.nombre || '';
        document.getElementById('persona_emergencia_parentesco').value = pe.parentesco || '';
        document.getElementById('persona_emergencia_telefono').value = pe.telefono || '';

        new bootstrap.Modal(document.getElementById('editModal')).show();
      });
  }

document.getElementById('btnGuardar').addEventListener('click', () => {
  const id = document.getElementById('editId').value;

  const datos = {
    folio: document.getElementById('folio').value,
    datos_alumno: {
      primer_apellido: document.getElementById('primer_apellido').value,
      segundo_apellido: document.getElementById('segundo_apellido').value,
      nombres: document.getElementById('nombres').value,
      periodo_semestral: document.getElementById('periodo_semestral').value,
      semestre: document.getElementById('semestre').value,
      grupo: document.getElementById('grupo').value,
      turno: document.getElementById('turno').value,
      carrera: document.getElementById('carrera').value,
      curp: document.getElementById('curp').value,
      fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
      edad: document.getElementById('edad').value,
      sexo: document.getElementById('sexo').value,
      estado_nacimiento: document.getElementById('estado_nacimiento').value,
      municipio_nacimiento: document.getElementById('municipio_nacimiento').value,
      ciudad_nacimiento: document.getElementById('ciudad_nacimiento').value,
      estado_civil: document.getElementById('estado_civil').value,
      nacionalidad: document.getElementById('nacionalidad').value,
      pais_extranjero: document.getElementById('pais_extranjero').value
    },
    datos_generales: {
      colonia: document.getElementById('colonia').value,
      domicilio: document.getElementById('domicilio').value,
      codigo_postal: document.getElementById('codigo_postal').value,
      telefono_alumno: document.getElementById('telefono_alumno').value,
      correo_alumno: document.getElementById('correo_alumno').value,
      paraescolar: document.getElementById('paraescolar').value,
      entrega_diagnostico: document.getElementById('entrega_diagnostico').value,
      detalle_enfermedad: document.getElementById('detalle_enfermedad').value,
      responsable_emergencia: {
        nombre: document.getElementById('responsable_emergencia_nombre').value,
        telefono: document.getElementById('responsable_emergencia_telefono').value,
        parentesco: document.getElementById('responsable_emergencia_parentesco').value
      },
      carta_poder: document.getElementById('carta_poder').value,
      tipo_sangre: document.getElementById('tipo_sangre').value,
      contacto_emergencia_nombre: document.getElementById('contacto_emergencia_nombre').value,
      contacto_emergencia_telefono: document.getElementById('contacto_emergencia_telefono').value,
      habla_lengua_indigena: {
        respuesta: document.getElementById('habla_lengua_indigena_respuesta').value,
        cual: document.getElementById('habla_lengua_indigena_cual').value
      },
      primera_opcion: document.getElementById('primera_opcion').value,
      segunda_opcion: document.getElementById('segunda_opcion').value,
      tercera_opcion: document.getElementById('tercera_opcion').value,
      cuarta_opcion: document.getElementById('cuarta_opcion').value,
      estado_nacimiento_general: document.getElementById('estado_nacimiento_general').value,
      municipio_nacimiento_general: document.getElementById('municipio_nacimiento_general').value,
      ciudad_nacimiento_general: document.getElementById('ciudad_nacimiento_general').value
    },
    datos_medicos: {
      numero_seguro_social: document.getElementById('numero_seguro_social').value,
      unidad_medica_familiar: document.getElementById('unidad_medica_familiar').value,
      enfermedad_cronica_o_alergia: {
        respuesta: document.getElementById('enfermedad_cronica_respuesta').value,
        detalle: document.getElementById('enfermedad_cronica_detalle').value
      },
      discapacidad: document.getElementById('discapacidad').value
    },
    secundaria_origen: {
      nombre_secundaria: document.getElementById('nombre_secundaria').value,
      regimen: document.getElementById('regimen').value,
      promedio_general: document.getElementById('promedio_general').value,
      modalidad: document.getElementById('modalidad').value
    },
    tutor_responsable: {
      nombre_padre: document.getElementById('nombre_padre').value,
      telefono_padre: document.getElementById('telefono_padre').value,
      nombre_madre: document.getElementById('nombre_madre').value,
      telefono_madre: document.getElementById('telefono_madre').value,
      vive_con: document.getElementById('vive_con').value
    },
    persona_emergencia: {
      nombre: document.getElementById('persona_emergencia_nombre').value,
      parentesco: document.getElementById('persona_emergencia_parentesco').value,
      telefono: document.getElementById('persona_emergencia_telefono').value
    }
  };

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `/api/dashboard/alumnos/${id}` : `/api/dashboard/alumnos`;

  fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  }).then(() => {
    alert('Guardado correctamente');
    location.reload();
  });
});


  function eliminarAlumno(e) {
    const id = e.target.dataset.id;
    if (confirm('¿Eliminar este alumno?')) {
      fetch(`/api/dashboard/alumnos/${id}`, { method: 'DELETE' })
        .then(() => {
          alert('Alumno eliminado');
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
  document.getElementById('editId').value = '';
  const inputs = document.querySelectorAll('#editForm input, #editForm select, #editForm textarea');
  inputs.forEach(input => input.value = '');
  new bootstrap.Modal(document.getElementById('editModal')).show();
});

  
});
