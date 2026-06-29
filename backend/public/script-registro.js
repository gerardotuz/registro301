const BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3001'
  : 'https://registro272.onrender.com';

const OPCIONES_CARRERA = ['A Y B', 'PROGRAMACIÓN', 'GESTIÓN E INNOVACIÓN TURÍSTICA', 'VENTAS', 'ROBOTICA'];
const IDS_OPCIONES = ['primera_opcion', 'segunda_opcion', 'tercera_opcion', 'cuarta_opcion', 'quinta_opcion'];
const PARAESCOLARES_FALLBACK = [
  'AJEDREZ',
  'ATLETISMO',
  'BANDA DE GUERRA',
  'BASQUETBOL',
  'DANZA',
  'ESCOLTA DE BANDERA',
  'FOTOGRAFÍA',
  'FUTBOL',
  'PINTURA',
  'TEATRO-CANTO',
  'TOCHO BANDERA',
  'VOLEIBOL',
  'ORATORIA-DECLAMACION',
  'MÚSICA'
];
function formatearFechaNacimiento(fecha) {
  const partes = String(fecha || '').split('-');
  return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
}

document.addEventListener('DOMContentLoaded', async () => {
  inicializarOpcionesCarrera();
  cargarCatalogo();
  cargarCatalogoGeneral();
  await cargarCuposParaescolar();
 
  consultarFolioYAutocompletar();

  document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const folio = obtenerFolioRegistro();

    const clave = (id) => document.getElementById(id).selectedOptions[0]?.dataset.clave;
    const paraescolarSelect = document.getElementById('paraescolar');
    const paraescolarSeleccionado = paraescolarSelect?.selectedOptions?.[0];

    if (paraescolarSeleccionado?.disabled) {
      alert('El paraescolar seleccionado ya alcanzó el cupo máximo. Selecciona otra opción.');
      return;
    }

    const payload = {
      datos_alumno: {
        nombres: formData.get('nombres'), primer_apellido: formData.get('primer_apellido'), segundo_apellido: formData.get('segundo_apellido'),
        curp: formData.get('curp'), carrera: formData.get('carrera'), periodo_semestral: formData.get('periodo_semestral'), semestre: formData.get('semestre'), grupo: formData.get('grupo'), turno: formData.get('turno'),
        fecha_nacimiento: formData.get('fecha_nacimiento'), edad: formData.get('edad'), sexo: formData.get('sexo'),
        estado_nacimiento: clave('estado_nacimiento'), municipio_nacimiento: clave('municipio_nacimiento'), ciudad_nacimiento: clave('ciudad_nacimiento'), estado_civil: formData.get('estado_civil')
      },
      datos_generales: {
          colonia: formData.get('colonia'), domicilio: formData.get('domicilio'), codigo_postal: formData.get('codigo_postal'), telefono_alumno: formData.get('telefono_alumno'), correo_alumno: formData.get('correo_alumno'), paraescolar: formData.get('paraescolar'), hermanos_activos: formData.get('hermanos_activos'), tipo_sangre: formData.get('tipo_sangre'),
        
        contacto_emergencia_nombre: formData.get('contacto_emergencia_nombre'), contacto_emergencia_telefono: formData.get('contacto_emergencia_telefono'),
        habla_lengua_indigena: { respuesta: formData.get('habla_lengua_indigena_respuesta'), cual: formData.get('habla_lengua_indigena_cual') },
        entrega_diagnostico: formData.get('entrega_diagnostico'), detalle_enfermedad: formData.get('detalle_enfermedad'),
        responsable_emergencia: { nombre: formData.get('responsable_emergencia_nombre'), telefono: formData.get('responsable_emergencia_telefono'), parentesco: formData.get('responsable_emergencia_parentesco') },
        carta_poder: formData.get('carta_poder'),
        primera_opcion: formData.get('primera_opcion'), segunda_opcion: formData.get('segunda_opcion'), tercera_opcion: formData.get('tercera_opcion'), cuarta_opcion: formData.get('cuarta_opcion'), quinta_opcion: formData.get('quinta_opcion'),
        estado_nacimiento_general: clave('estado_nacimiento_general'), municipio_nacimiento_general: clave('municipio_nacimiento_general'), ciudad_nacimiento_general: clave('ciudad_nacimiento_general')
      },
      datos_medicos: {
        numero_seguro_social: formData.get('numero_seguro_social'), unidad_medica_familiar: formData.get('unidad_medica_familiar'),
        enfermedad_cronica_o_alergia: { respuesta: formData.get('enfermedad_cronica_o_alergia_respuesta'), detalle: formData.get('enfermedad_cronica_o_alergia_detalle') },
        discapacidad: formData.get('discapacidad')
      },
      secundaria_origen: { nombre_secundaria: formData.get('nombre_secundaria'), cct_secundaria: formData.get('cct_secundaria'), regimen: formData.get('regimen'), promedio_general: formData.get('promedio_general'), modalidad: formData.get('modalidad'), participaciones_secundaria: formData.get('participaciones_secundaria') },
      tutor_responsable: { nombre_padre: formData.get('nombre_padre'), telefono_padre: formData.get('telefono_padre'), nombre_madre: formData.get('nombre_madre'), telefono_madre: formData.get('telefono_madre'), vive_con: formData.get('vive_con') },
      persona_emergencia: { nombre: formData.get('persona_emergencia_nombre'), parentesco: formData.get('persona_emergencia_parentesco'), telefono: formData.get('persona_emergencia_telefono') }
    };

    if (folio) payload.folio = folio;

    const endpoint = folio ? '/api/guardar-registro' : '/api/guardar';
    const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await res.json();
    if (res.ok) {
      alert('✅ Registro guardado con éxito');
      if (result.pdf_url) window.open(result.pdf_url, '_blank');
      deshabilitarFormulario();
    } else alert(result.message || '❌ Error al guardar');
  });
});

function obtenerFolioRegistro() {
  const folioStorage = localStorage.getItem('alumnoFolio');
  const folioUrl = new URLSearchParams(window.location.search).get('folio');
  const folio = String(folioStorage || folioUrl || '').trim().toUpperCase();

  if (folio) {
    localStorage.setItem('alumnoFolio', folio);
  }

  return folio;
}

function inicializarOpcionesCarrera() {
  const selects = IDS_OPCIONES.map((id) => document.getElementById(id)).filter(Boolean);
  if (!selects.length) return;

  const placeholderById = {
    primera_opcion: 'cuál fue tu 1era opción',
    segunda_opcion: 'cuál fue tu 2da opción',
    tercera_opcion: 'cuál fue tu 3era opción',
    cuarta_opcion: 'cuál fue tu 4ta opción',
    quinta_opcion: 'cuál fue tu 5ta opción'
  };

  const refrescar = () => {
    const seleccionadas = selects.map((s) => s.value).filter(Boolean);
    selects.forEach((select) => {
      const actual = select.value;
      select.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = placeholderById[select.id] || 'Selecciona opción';
      select.appendChild(placeholder);

      OPCIONES_CARRERA.forEach((opcion) => {
        if (!seleccionadas.includes(opcion) || opcion === actual) {
          const opt = document.createElement('option');
          opt.value = opcion;
          opt.textContent = opcion;
          if (opcion === actual) opt.selected = true;
          select.appendChild(opt);
        }
      });
    });
  };

  selects.forEach((s) => s.addEventListener('change', refrescar));
  refrescar();
}


async function cargarCuposParaescolar(valorActual = '') {
  const select = document.getElementById('paraescolar');
  if (!select) return;

  const valorSeleccionado = valorActual || select.value;
  const info = document.getElementById('paraescolarInfo');
  let limite = 50;
  let paraescolares = PARAESCOLARES_FALLBACK.map((nombre) => ({
    nombre,
    ocupados: 0,
    disponibles: limite,
    limite,
    lleno: false
  }));

  try {
    const res = await fetch(`${BASE_URL}/api/paraescolares/cupos`);
    if (res.ok) {
      const data = await res.json();
      limite = data.limite || limite;
      paraescolares = Array.isArray(data.paraescolares) ? data.paraescolares : paraescolares;
    }
  } catch (error) {
    console.warn('No se pudieron cargar los cupos de paraescolar', error);
  }

  select.innerHTML = '<option value="">--Selecciona--</option>';
  paraescolares.forEach((item) => {
    const nombre = item.nombre;
    const ocupados = Number(item.ocupados || 0);
    const lleno = Boolean(item.lleno || ocupados >= limite);
    const option = document.createElement('option');
    option.value = nombre;
    option.textContent = `${nombre} (${ocupados})${lleno ? ' - CUPO LLENO' : ''}`;
    option.disabled = lleno && nombre !== valorSeleccionado;
    if (nombre === valorSeleccionado) option.selected = true;
    select.appendChild(option);
  });

  if (info) {
    info.textContent = `Cupo máximo por paraescolar: ${limite} alumnos. Las opciones llenas se bloquean automáticamente.`;
  }
}

function registroEstaBloqueado(datos) {
  return Boolean(datos?.registro_completado || datos?.bloqueado);
}

function mostrarAvisoBloqueado(mensaje) {
  let aviso = document.getElementById('avisoRegistroBloqueado');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'avisoRegistroBloqueado';
    aviso.style.cssText = 'display:block;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:8px;padding:12px;margin:15px auto;max-width:900px;font-weight:bold;text-align:center;';
    const formulario = document.getElementById('registroForm');
    formulario?.parentNode?.insertBefore(aviso, formulario);
  }
  aviso.textContent = mensaje;
}

function deshabilitarFormulario(mensaje = '') {
  Array.from(document.getElementById('registroForm').elements).forEach(el => el.disabled = true);
  if (mensaje) mostrarAvisoBloqueado(mensaje);
}

async function obtenerCatalogo() {
  const rutas = ['/data/catalogo.json', '/catalogo.json'];
  for (const ruta of rutas) {
    try {
      const res = await fetch(ruta);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn(`No se pudo cargar catálogo desde ${ruta}`, err);
    }
  }
  throw new Error('No se pudo cargar catalogo.json');
}

function cargarCatalogo() {
  obtenerCatalogo().then((d) => cargarSelectores('nacimiento', d)).catch((err) => console.error('❌ Error cargando catálogo:', err));
}

function cargarCatalogoGeneral() {
  obtenerCatalogo().then((d) => cargarSelectores('nacimiento_general', d)).catch((err) => console.error('❌ Error cargando catálogo general:', err));
}

function cargarSelectores(s, data) { const e = document.getElementById(`estado_${s}`), m = document.getElementById(`municipio_${s}`), c = document.getElementById(`ciudad_${s}`); if (!e || !m || !c) return; e.innerHTML='<option value="">-- Selecciona Estado --</option>'; m.innerHTML='<option value="">-- Selecciona Municipio --</option>'; c.innerHTML='<option value="">-- Selecciona Ciudad --</option>'; data.forEach(est=>{const o=document.createElement('option'); o.value=est.nombre; o.dataset.clave=est.clave; o.dataset.municipios=JSON.stringify(est.municipios||[]); o.textContent=est.nombre; e.appendChild(o);}); e.addEventListener('change',()=>{const ms=JSON.parse(e.selectedOptions[0]?.dataset.municipios||'[]'); m.innerHTML='<option value="">-- Selecciona Municipio --</option>'; c.innerHTML='<option value="">-- Selecciona Ciudad --</option>'; ms.forEach(mu=>{const o=document.createElement('option'); o.value=mu.nombre;o.dataset.clave=mu.clave;o.dataset.localidades=JSON.stringify(mu.localidades||[]);o.textContent=mu.nombre;m.appendChild(o);}); m.disabled=!ms.length;c.disabled=true;}); m.addEventListener('change',()=>{const ls=JSON.parse(m.selectedOptions[0]?.dataset.localidades||'[]'); c.innerHTML='<option value="">-- Selecciona Ciudad --</option>'; ls.forEach(l=>{const o=document.createElement('option'); o.value=l.nombre;o.dataset.clave=l.clave;o.textContent=l.nombre;c.appendChild(o);}); c.disabled=!ls.length;}); }
async function consultarFolioYAutocompletar(){
  const set=(name,v)=>{const i=document.querySelector(`[name="${name}"]`); if(i&&v!=null&&v!=='') i.value=v;};
  const fromLS = JSON.parse(localStorage.getItem('datosPrecargados') || 'null');
  let datos = fromLS;
  const folio = obtenerFolioRegistro();

  if (!datos && folio) {
    const res = await fetch(`${BASE_URL}/api/preregistro/${encodeURIComponent(folio)}`);
    const payload = await res.json();
    if (res.ok && payload.alumno) {
      datos = payload.alumno;
      localStorage.setItem('datosPrecargados', JSON.stringify(datos));
    }
  }

  if(!datos) return;
  const mappings={...datos.datos_alumno,...datos.datos_generales,...datos.datos_medicos,...datos.secundaria_origen,...datos.tutor_responsable,'habla_lengua_indigena_respuesta':datos.datos_generales?.habla_lengua_indigena?.respuesta,'habla_lengua_indigena_cual':datos.datos_generales?.habla_lengua_indigena?.cual,'enfermedad_cronica_o_alergia_respuesta':datos.datos_medicos?.enfermedad_cronica_o_alergia?.respuesta,'enfermedad_cronica_o_alergia_detalle':datos.datos_medicos?.enfermedad_cronica_o_alergia?.detalle,'persona_emergencia_nombre':datos.persona_emergencia?.nombre,'persona_emergencia_parentesco':datos.persona_emergencia?.parentesco,'persona_emergencia_telefono':datos.persona_emergencia?.telefono};
  Object.entries(mappings).forEach(([k,v])=>set(k,v));
 
  cargarCuposParaescolar(datos?.datos_generales?.paraescolar || '');

  if (registroEstaBloqueado(datos)) {
    deshabilitarFormulario('Este folio ya tiene un registro finalizado y no puede editarse. Si necesitas cambios, acude a control escolar.');
  }
}
