// backend/public/dashboardFront.js
document.addEventListener('DOMContentLoaded', async () => {
  const tablaBody = document.getElementById('tablaAlumnos');
  const form = document.getElementById('formEditar');

  async function cargarAlumnos() {
    tablaBody.innerHTML = '';
    const res = await fetch('/api/dashboard/alumnos');
    const alumnos = await res.json();

    alumnos.forEach(alumno => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${alumno.folio}</td>
        <td>${alumno.nombres} ${alumno.primer_apellido}</td>
        <td>${alumno.carrera}</td>
        <td>
          <button onclick="editarAlumno('${alumno._id}')">Editar</button>
          <button onclick="eliminarAlumno('${alumno._id}')">Eliminar</button>
        </td>
      `;
      tablaBody.appendChild(row);
    });
  }

  cargarAlumnos();

  window.editarAlumno = async (id) => {
    const res = await fetch(`/api/dashboard/alumno/${id}`);
    const alumno = await res.json();
    document.getElementById('alumnoId').value = alumno._id;
    document.getElementById('folio').value = alumno.folio || '';
    document.getElementById('nombres').value = alumno.nombres || '';
    document.getElementById('primer_apellido').value = alumno.primer_apellido || '';
    document.getElementById('segundo_apellido').value = alumno.segundo_apellido || '';
    document.getElementById('carrera').value = alumno.carrera || '';

    form.style.display = 'block';
    window.scrollTo({ top: form.offsetTop, behavior: 'smooth' });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('alumnoId').value;
    const body = {
      folio: document.getElementById('folio').value,
      nombres: document.getElementById('nombres').value,
      primer_apellido: document.getElementById('primer_apellido').value,
      segundo_apellido: document.getElementById('segundo_apellido').value,
      carrera: document.getElementById('carrera').value
    };
    await fetch(`/api/dashboard/alumno/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    alert('Alumno actualizado');
    form.style.display = 'none';
    cargarAlumnos();
  });

  window.eliminarAlumno = async (id) => {
    if (confirm('¿Seguro que quieres eliminar este alumno?')) {
      await fetch(`/api/dashboard/alumno/${id}`, { method: 'DELETE' });
      cargarAlumnos();
    }
  };
});
