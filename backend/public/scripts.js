const BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3001'
  : 'https://registro272.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  cargarCatalogo();
  cargarCatalogoGeneral();
  consultarFolioYAutocompletar();

  document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const camposObligatorios = [
      'nombres','primer_apellido','segundo_apellido','curp','carrera',
      'periodo_semestral','semestre','fecha_nacimiento','edad','sexo',
      'estado_nacimiento','municipio_nacimiento','ciudad_nacimiento','estado_civil',
      'primera_opcion','segunda_opcion','tercera_opcion','cuarta_opcion',
      'colonia','domicilio','codigo_postal','telefono_alumno','correo_alumno',
      'tipo_sangre','contacto_emergencia_nombre','contacto_emergencia_telefono',
      'habla_lengua_indigena_respuesta','numero_seguro_social','unidad_medica_familiar',
      'enfermedad_cronica_o_alergia_respuesta','enfermedad_cronica_o_alergia_detalle',
      'discapacidad','entrega_diagnostico','detalle_enfermedad',
      'nombre_secundaria','regimen','promedio_general','modalidad',
      'nombre_padre','telefono_padre','nombre_madre','telefono_madre',
      'vive_con','persona_emergencia_nombre','persona_emergencia_parentesco','persona_emergencia_telefono',
      'responsable_emergencia_nombre','responsable_emergencia_telefono','responsable_emergencia_parentesco','carta_poder',
      'paraescolar'
    ];

    for (const campo of camposObligatorios) {
      const input = document.querySelector(`[name="${campo}"]`);
      if (!input || !input.value.trim()) {
        alert(`⚠️ Por favor completa el campo: ${campo.replaceAll('_', ' ')}`);
        input?.focus();
        return;
      }
    }

    const folio = localStorage.getItem('alumnoFolio');
    if (!folio) return alert('Folio perdido');

    const formData = new FormData(e.target);
    const estadoClave = document.getElementById('estado_nacimiento').selectedOptions[0]?.dataset.clave;
    const municipioClave = document.getElementById('municipio_nacimiento').selectedOptions[0]?.dataset.clave;
    const ciudadClave = document.getElementById('ciudad_nacimiento').selectedOptions[0]?.dataset.clave;

    const estadoClaveG = document.getElementById('estado_nacimiento_general').selectedOptions[0]?.dataset.clave;
    const municipioClaveG = document.getElementById('municipio_nacimiento_general').selectedOptions[0]?.dataset.clave;
    const ciudadClaveG = document.getElementById('ciudad_nacimiento_general').selectedOptions[0]?.dataset.clave;

    const nuevoRegistro = {
      folio,
      datos_alumno: {
        nombres: formData.get('nombres'),
        primer_apellido: formData.get('primer_apellido'),
        segundo_apellido: formData.get('segundo_apellido'),
        curp: formData.get('curp'),
        carrera: formData.get('carrera'),
        periodo_semestral: formData.get('periodo_semestral'),
        semestre: formData.get('semestre'),
        grupo: formData.get('grupo'),
        turno: formData.get('turno'),
        fecha_nacimiento: formData.get('fecha_nacimiento'),
        edad: formData.get('edad'),
        sexo: formData.get('sexo'),
        estado_nacimiento: estadoClave,
        municipio_nacimiento: municipioClave,
        ciudad_nacimiento: ciudadClave,
        estado_civil: formData.get('estado_civil')
      },
      datos_generales: {
        colonia: formData.get('colonia'),
        domicilio: formData.get('domicilio'),
        codigo_postal: formData.get('codigo_postal'),
        telefono_alumno: formData.get('telefono_alumno'),
        correo_alumno: formData.get('correo_alumno'),
        paraescolar: formData.get('paraescolar'),
        tipo_sangre: formData.get('tipo_sangre'),
        contacto_emergencia_nombre: formData.get('contacto_emergencia_nombre'),
        contacto_emergencia_telefono: formData.get('contacto_emergencia_telefono'),
        habla_lengua_indigena: {
          respuesta: formData.get('habla_lengua_indigena_respuesta'),
          cual: formData.get('habla_lengua_indigena_cual')
        },
        entrega_diagnostico: formData.get('entrega_diagnostico'),
        detalle_enfermedad: formData.get('detalle_enfermedad'),
        responsable_emergencia: {
          nombre: formData.get('responsable_emergencia_nombre'),
          telefono: formData.get('responsable_emergencia_telefono'),
          parentesco: formData.get('responsable_emergencia_parentesco')
        },
        carta_poder: formData.get('carta_poder'),
        primera_opcion: formData.get('primera_opcion'),
        segunda_opcion: formData.get('segunda_opcion'),
        tercera_opcion: formData.get('tercera_opcion'),
        cuarta_opcion: formData.get('cuarta_opcion'),
        estado_nacimiento_general: estadoClaveG,
        municipio_nacimiento_general: municipioClaveG,
        ciudad_nacimiento_general: ciudadClaveG
      },
      datos_medicos: {
        numero_seguro_social: formData.get('numero_seguro_social'),
        unidad_medica_familiar: formData.get('unidad_medica_familiar'),
        enfermedad_cronica_o_alergia: {
          respuesta: formData.get('enfermedad_cronica_o_alergia_respuesta'),
          detalle: formData.get('enfermedad_cronica_o_alergia_detalle')
        },
        discapacidad: formData.get('discapacidad')
      },
      secundaria_origen: {
        nombre_secundaria: formData.get('nombre_secundaria'),
        regimen: formData.get('regimen'),
        promedio_general: formData.get('promedio_general'),
        modalidad: formData.get('modalidad')
      },
      tutor_responsable: {
        nombre_padre: formData.get('nombre_padre'),
        telefono_padre: formData.get('telefono_padre'),
        nombre_madre: formData.get('nombre_madre'),
        telefono_madre: formData.get('telefono_madre'),
        vive_con: formData.get('vive_con')
      },
      persona_emergencia: {
        nombre: formData.get('persona_emergencia_nombre'),
        parentesco: formData.get('persona_emergencia_parentesco'),
        telefono: formData.get('persona_emergencia_telefono')
      }
    };

    const estadoCivilMap = {
      'soltero': 1,
      'casado': 2,
      'union_libre': 3,
      'divorciado': 4,
      'viudo': 5
    };
    const textoEC = nuevoRegistro.datos_alumno.estado_civil?.toLowerCase();
    nuevoRegistro.datos_alumno.estado_civil = estadoCivilMap[textoEC] || 0;

    const res = await fetch(`${BASE_URL}/api/guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoRegistro)
    });

    const result = await res.json();
    if (res.ok) {
      alert('✅ Registro guardado con éxito');
      window.open(result.pdf_url, '_blank');
      deshabilitarFormulario();
    } else {
      alert(result.message || '❌ Error al guardar');
    }
  });
});

function deshabilitarFormulario() {
  const form = document.getElementById('registroForm');
  Array.from(form.elements).forEach(el => {
    el.disabled = true;
  });
  alert('🛑 Este folio ya tiene un registro completado. Solo puedes visualizarlo.');
}

function cargarCatalogo() {
  fetch('/data/catalogo.json')
    .then(res => res.json())
    .then(data => cargarSelectores('nacimiento', data))
    .catch(err => console.error('❌ Error cargando catálogo:', err));
}

function cargarCatalogoGeneral() {
  fetch('/data/catalogo.json')
    .then(res => res.json())
    .then(data => cargarSelectores('nacimiento_general', data))
    .catch(err => console.error('❌ Error cargando catálogo general:', err));
}

function cargarSelectores(sufijo, data) {
  const estado = document.getElementById(`estado_${sufijo}`);
  const municipio = document.getElementById(`municipio_${sufijo}`);
  const ciudad = document.getElementById(`ciudad_${sufijo}`);

  estado.innerHTML = '<option value="">-- Selecciona Estado --</option>';
  municipio.innerHTML = '<option value="">-- Selecciona Municipio --</option>';
  ciudad.innerHTML = '<option value="">-- Selecciona Ciudad --</option>';

  data.forEach(est => {
    const opt = document.createElement('option');
    opt.value = est.nombre;
    opt.dataset.clave = est.clave;
    opt.dataset.municipios = JSON.stringify(est.municipios || []);
    opt.textContent = est.nombre;
    estado.appendChild(opt);
  });

  estado.addEventListener('change', function () {
    const selected = this.selectedOptions[0];
    const municipios = JSON.parse(selected.dataset.municipios || '[]');

    municipio.innerHTML = '<option value="">-- Selecciona Municipio --</option>';
    ciudad.innerHTML = '<option value="">-- Selecciona Ciudad --</option>';

    municipios.forEach(mun => {
      const opt = document.createElement('option');
      opt.value = mun.nombre;
      opt.dataset.clave = mun.clave;
      opt.dataset.localidades = JSON.stringify(mun.localidades || []);
      opt.textContent = mun.nombre;
      municipio.appendChild(opt);
    });

    municipio.disabled = municipios.length === 0;
    ciudad.disabled = true;
  });

  municipio.addEventListener('change', function () {
    const selected = this.selectedOptions[0];
    const localidades = JSON.parse(selected.dataset.localidades || '[]');

    ciudad.innerHTML = '<option value="">-- Selecciona Ciudad --</option>';
    localidades.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.nombre;
      opt.dataset.clave = loc.clave;
      opt.textContent = loc.nombre;
      ciudad.appendChild(opt);
    });

    ciudad.disabled = localidades.length === 0;
  });
}

function consultarFolioYAutocompletar() {
  const folio = localStorage.getItem('alumnoFolio');
  if (!folio) return;

  fetch(`${BASE_URL}/api/folio/${folio}`)
    .then(res => res.json())
    .then(data => {
      for (const [seccion, valores] of Object.entries(data)) {
        if (typeof valores === 'object') {
          for (const [campo, valor] of Object.entries(valores)) {
            const input = document.querySelector(`[name="${campo}"]`);
            if (input) input.value = valor;
          }
        }
      }

      setTimeout(() => {
        ['nacimiento', 'nacimiento_general'].forEach((sufijo, i) => {
          document.getElementById(`estado_${sufijo}`).value = data.datos_alumno[`estado_${sufijo}`] || data.datos_generales[`estado_${sufijo}`];
          document.getElementById(`estado_${sufijo}`).dispatchEvent(new Event('change'));
          setTimeout(() => {
            document.getElementById(`municipio_${sufijo}`).value = data.datos_alumno[`municipio_${sufijo}`] || data.datos_generales[`municipio_${sufijo}`];
            document.getElementById(`municipio_${sufijo}`).dispatchEvent(new Event('change'));
            setTimeout(() => {
              document.getElementById(`ciudad_${sufijo}`).value = data.datos_alumno[`ciudad_${sufijo}`] || data.datos_generales[`ciudad_${sufijo}`];
            }, 300);
          }, 300);
        });
      }, 300);

      if (data.registro_completado) {
        deshabilitarFormulario();
      }
    })
    .catch(err => console.error('Error al cargar alumno:', err));
}
const reimprimirForm = document.getElementById('reimprimirForm');
if (reimprimirForm) {
  reimprimirForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const folio = document.getElementById('folioReimpresion').value.trim();
    if (!folio) return;

    try {
      const res = await fetch(`${BASE_URL}/api/reimprimir/${folio}`);
      const data = await res.json();
      if (res.ok) {
        window.open(data.pdf, '_blank');
      } else {
        alert(data.message || 'No se pudo reimprimir el PDF');
      }
    } catch (err) {
      alert('❌ Error al reimprimir PDF');
    }
  });
}

