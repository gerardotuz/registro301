/* =========================
   CONFIGURACIÓN BASE
========================= */

const BASE_URL = window.location.origin.includes("localhost")
  ? "http://localhost:3001"
  : "https://registro214.onrender.com";

/* =========================
   FUNCION PARA MAYUSCULAS
========================= */

function toUpper(value) {
  return typeof value === "string" ? value.toUpperCase() : value;
}

/* =========================
   INICIALIZACIÓN
========================= */

document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo("nacimiento");
  cargarCatalogo("nacimiento_general");

  const form = document.getElementById("registroForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔒 VALIDAR REQUIRED
    const obligatorios = form.querySelectorAll("[required]");
    for (const campo of obligatorios) {
      if (!campo.value || !campo.value.trim()) {
        alert(`⚠️ Completa el campo: ${campo.name}`);
        campo.focus();
        return;
      }
    }

    const formData = new FormData(form);

    /* =========================
       OBTENER CLAVES NUMERICAS
    ========================== */

    function obtenerClave(selectId) {
      const select = document.getElementById(selectId);
      return select?.selectedOptions[0]?.dataset.clave
        ? Number(select.selectedOptions[0].dataset.clave)
        : null;
    }

    const nuevoRegistro = {
      datos_alumno: {
        nombres: toUpper(formData.get("nombres")),
        primer_apellido: toUpper(formData.get("primer_apellido")),
        segundo_apellido: toUpper(formData.get("segundo_apellido")),
        curp: toUpper(formData.get("curp")),
        fecha_nacimiento: formData.get("fecha_nacimiento"),
        edad: Number(formData.get("edad")),
        sexo: toUpper(formData.get("sexo")),
        estado_nacimiento: obtenerClave("estado_nacimiento"),
        municipio_nacimiento: obtenerClave("municipio_nacimiento"),
        ciudad_nacimiento: obtenerClave("ciudad_nacimiento"),
        estado_civil: Number(formData.get("estado_civil")),
        nacionalidad: toUpper(formData.get("nacionalidad")),
        pais_extranjero: toUpper(formData.get("pais_extranjero"))
      },

      datos_generales: {
        colonia: toUpper(formData.get("colonia")),
        domicilio: toUpper(formData.get("domicilio")),
        codigo_postal: formData.get("codigo_postal"),
        telefono_alumno: formData.get("telefono_alumno"),
        correo_alumno: toUpper(formData.get("correo_alumno")),
        tipo_sangre: toUpper(formData.get("tipo_sangre")),
        paraescolar: toUpper(formData.get("paraescolar")),
        entrega_diagnostico: toUpper(formData.get("entrega_diagnostico")),
        detalle_enfermedad: toUpper(formData.get("detalle_enfermedad")),
        carta_poder: toUpper(formData.get("carta_poder")),

        responsable_emergencia: {
          nombre: toUpper(formData.get("responsable_emergencia_nombre")),
          telefono: formData.get("responsable_emergencia_telefono"),
          parentesco: toUpper(formData.get("responsable_emergencia_parentesco"))
        },

        contacto_emergencia_nombre: toUpper(formData.get("contacto_emergencia_nombre")),
        contacto_emergencia_telefono: formData.get("contacto_emergencia_telefono"),

        habla_lengua_indigena: {
          respuesta: toUpper(formData.get("habla_lengua_indigena_respuesta")),
          cual: toUpper(formData.get("habla_lengua_indigena_cual"))
        },

        primera_opcion: toUpper(formData.get("primera_opcion")),
        segunda_opcion: toUpper(formData.get("segunda_opcion")),
        tercera_opcion: toUpper(formData.get("tercera_opcion")),
        cuarta_opcion: toUpper(formData.get("cuarta_opcion")),
      quinta_opcion: toUpper(formData.get("quinta_opcion")),
         sexta_opcion: toUpper(formData.get("sexta_opcion")),

        estado_nacimiento_general: obtenerClave("estado_nacimiento_general"),
        municipio_nacimiento_general: obtenerClave("municipio_nacimiento_general"),
        ciudad_nacimiento_general: obtenerClave("ciudad_nacimiento_general")
      },

      datos_medicos: {
        numero_seguro_social: formData.get("numero_seguro_social"),
        unidad_medica_familiar: toUpper(formData.get("unidad_medica_familiar")),
        enfermedad_cronica_o_alergia: {
          respuesta: toUpper(formData.get("enfermedad_cronica_respuesta")),
          detalle: toUpper(formData.get("enfermedad_cronica_detalle"))
        },
        discapacidad: toUpper(formData.get("discapacidad"))
      },

      secundaria_origen: {
        nombre_secundaria: toUpper(formData.get("nombre_secundaria")),
        regimen: toUpper(formData.get("regimen")),
         estudias: toUpper(formData.get("estudias")),
       /* promedio_general: Number(formData.get("promedio_general")), */
        modalidad: toUpper(formData.get("modalidad"))
      },

      tutor_responsable: {
        nombre_padre: toUpper(formData.get("nombre_padre")),
        telefono_padre: formData.get("telefono_padre"),
        nombre_madre: toUpper(formData.get("nombre_madre")),
        telefono_madre: formData.get("telefono_madre"),
        vive_con: toUpper(formData.get("vive_con"))
      },

      persona_emergencia: {
        nombre: toUpper(formData.get("persona_emergencia_nombre")),
        parentesco: toUpper(formData.get("persona_emergencia_parentesco")),
        telefono: formData.get("persona_emergencia_telefono")
      }
    };

    try {
      const res = await fetch(`${BASE_URL}/api/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoRegistro)
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "❌ Error al guardar");
        return;
      }

      alert(`✅ Registro exitoso - Guarda tu Folio\nFolio asignado: ${result.folio}`);

      if (result.pdf_url) {
        window.open(result.pdf_url, "_blank");
      }

      deshabilitarFormulario();

    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión con el servidor");
    }
  });
});

/* =========================
   CATÁLOGO CON CLAVES
========================= */

function cargarCatalogo(sufijo) {
  fetch("/catalogo.json")
    .then(res => res.json())
    .then(data => cargarSelectores(sufijo, data))
    .catch(err => console.error("❌ Error cargando catálogo:", err));
}

function cargarSelectores(sufijo, data) {
  const estado = document.getElementById(`estado_${sufijo}`);
  const municipio = document.getElementById(`municipio_${sufijo}`);
  const ciudad = document.getElementById(`ciudad_${sufijo}`);

  if (!estado || !municipio || !ciudad) return;

  estado.innerHTML = `<option value="">-- SELECCIONA ESTADO --</option>`;
  municipio.innerHTML = `<option value="">-- SELECCIONA MUNICIPIO --</option>`;
  ciudad.innerHTML = `<option value="">-- SELECCIONA CIUDAD --</option>`;

  data.forEach(est => {
    const opt = document.createElement("option");
    opt.value = est.nombre;
    opt.dataset.clave = est.clave;
    opt.dataset.municipios = JSON.stringify(est.municipios || []);
    opt.textContent = est.nombre;
    estado.appendChild(opt);
  });

  estado.addEventListener("change", () => {
    const municipios = JSON.parse(
      estado.selectedOptions[0]?.dataset.municipios || "[]"
    );

    municipio.innerHTML = `<option value="">-- SELECCIONA MUNICIPIO --</option>`;
    ciudad.innerHTML = `<option value="">-- SELECCIONA CIUDAD --</option>`;
    municipio.disabled = municipios.length === 0;
    ciudad.disabled = true;

    municipios.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.nombre;
      opt.dataset.clave = m.clave;
      opt.dataset.localidades = JSON.stringify(m.localidades || []);
      opt.textContent = m.nombre;
      municipio.appendChild(opt);
    });
  });

  municipio.addEventListener("change", () => {
    const localidades = JSON.parse(
      municipio.selectedOptions[0]?.dataset.localidades || "[]"
    );

    ciudad.innerHTML = `<option value="">-- SELECCIONA CIUDAD --</option>`;
    ciudad.disabled = localidades.length === 0;

    localidades.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.nombre;
      opt.dataset.clave = l.clave;
      opt.textContent = l.nombre;
      ciudad.appendChild(opt);
    });
  });
}

/* =========================
   BLOQUEAR FORMULARIO
========================= */

function deshabilitarFormulario() {
  const form = document.getElementById("registroForm");
  Array.from(form.elements).forEach(el => el.disabled = true);
}
