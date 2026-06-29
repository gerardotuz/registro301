const tokenAsignacion = localStorage.getItem("superadmin_token");

if (!tokenAsignacion) {
  window.location.href = "/superadmin-login.html";
}

const tbodyConfiguracion = document.querySelector("#tablaConfiguracion tbody");
const mensajeAsignacion = document.getElementById("mensajeAsignacion");

function crearFilaConfiguracion(carrera = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="carrera" placeholder="Ej. Programación" value="${carrera}"></td>
    <td><input type="number" class="matutino" min="0" value="1"></td>
    <td><input type="number" class="vespertino" min="0" value="1"></td>
    <td><input type="number" class="capacidad" min="1" value="50"></td>
    <td><button type="button" class="eliminar-fila">Eliminar</button></td>
  `;
  tr.querySelector(".eliminar-fila").addEventListener("click", () => tr.remove());
  tbodyConfiguracion.appendChild(tr);
}

function obtenerConfiguracion() {
  const configuracion = {};
  tbodyConfiguracion.querySelectorAll("tr").forEach((tr) => {
    const carrera = tr.querySelector(".carrera").value.trim();
    if (!carrera) return;
    configuracion[carrera] = {
      matutino: Number(tr.querySelector(".matutino").value || 0),
      vespertino: Number(tr.querySelector(".vespertino").value || 0),
      capacidad: Number(tr.querySelector(".capacidad").value || 50)
    };
  });
  return configuracion;
}

async function generarAsignacion() {
  const archivo = document.getElementById("excelInput").files[0];
  if (!archivo) {
    mensajeAsignacion.textContent = "Selecciona un archivo Excel primero.";
    return;
  }

  mensajeAsignacion.textContent = "Generando asignación...";
  const formData = new FormData();
  formData.append("excel", archivo);
  formData.append("configuracion", JSON.stringify(obtenerConfiguracion()));

  const res = await fetch("/api/superadmin/asignacion-grupos", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenAsignacion}` },
    body: formData
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "No se pudo generar la asignación" }));
    mensajeAsignacion.textContent = error.error;
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "asignacion-grupos.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  mensajeAsignacion.textContent = "Asignación generada correctamente.";
}

document.getElementById("agregarCarreraBtn").addEventListener("click", () => crearFilaConfiguracion());
document.getElementById("generarBtn").addEventListener("click", generarAsignacion);
crearFilaConfiguracion();
