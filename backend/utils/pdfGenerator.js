const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
// const { PDFDocument: PDFLibDocument } = require('pdf-lib'); // para fusionar PDFs

const catalogoPath = path.resolve(__dirname, './catalogo.json');
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'));

function obtenerNombresDesdeCatalogo(estadoClave, municipioClave, ciudadClave) {
  const estado = catalogo.find(e => e.clave === estadoClave);
  if (!estado) return { estado: '', municipio: '', ciudad: '' };

  const municipio = estado.municipios.find(m => m.clave === municipioClave || m.nombre === municipioClave);
  const localidad = municipio?.localidades?.find(l => l.clave === ciudadClave || l.nombre === ciudadClave);

  return {
    estado: estado.nombre || '',
    municipio: municipio?.nombre || '',
    ciudad: localidad?.nombre || ''
  };
}

async function generarPDF(datos, nombreArchivo = 'formulario.pdf') {
  const rutaPDF = path.join(__dirname, '../public/pdfs', nombreArchivo);
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const stream = fs.createWriteStream(rutaPDF);
  doc.pipe(stream);

  const alumno = datos.datos_alumno || {};
  const generales = datos.datos_generales || {};
  const medicos = datos.datos_medicos || {};
  const secundaria = datos.secundaria_origen || {};
  const tutor = datos.tutor_responsable || {};

  const logoPath = path.join(__dirname, '../public/images/logo.png');
  const footerPath = path.join(__dirname, '../public/images/firma_footer.png');

  const PAGE_HEIGHT = doc.page.height;
  const BOTTOM_MARGIN = 80;
  const START_Y = 50;
  const BOX_HEIGHT = 30;
  const GAP_Y = 35;
  const marginX = 50;

  const { estado, municipio, ciudad } = obtenerNombresDesdeCatalogo(
    alumno.estado_nacimiento,
    alumno.municipio_nacimiento,
    alumno.ciudad_nacimiento
  );

  const lugarGeneral = obtenerNombresDesdeCatalogo(
    generales.estado_nacimiento_general,
    generales.municipio_nacimiento_general,
    generales.ciudad_nacimiento_general
  );

  const estadoCivilTexto = {
    "1": "Soltero", "2": "Casado", "3": "Unión Libre", "4": "Divorciado", "5": "Viudo"
  }[alumno.estado_civil] || alumno.estado_civil;

  let y = START_Y;

  const drawBox = (label, value, x, y, width = 240, height = BOX_HEIGHT) => {
    if (y + height + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      y = START_Y;
    }
    doc.lineWidth(0.5).strokeColor('#000').rect(x, y, width, height).stroke();
    doc.fontSize(8).fillColor('#333').text(label, x + 5, y + 2);
    doc.fontSize(10).fillColor('#000').text(value || '', x + 5, y + 14, { width: width - 10 });
    return y;
  };

  const drawMultilineBox = (label, value, x, y, width = 240) => {
    const text = value || '';
    const textHeight = doc.heightOfString(text, { width: width - 10 });
    const height = textHeight + 24;
    if (y + height + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      y = START_Y;
    }
    doc.lineWidth(0.5).strokeColor('#000').rect(x, y, width, height).stroke();
    doc.fontSize(8).fillColor('#333').text(label, x + 5, y + 2);
    doc.fontSize(10).fillColor('#000').text(text, x + 5, y + 14, { width: width - 10 });
    return y + height + 5;
  };

  const drawSectionTitle = (title, y) => {
    if (y + 30 + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      y = START_Y;
    }
    doc.rect(marginX, y, 500, 20).fill('#89042e');
    doc.fillColor('white').fontSize(12).text('  ' + title.toUpperCase(), marginX + 5, y + 5);
    doc.fillColor('black');
    return y + 30;
  };

  // ENCABEZADO
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, y, { width: 500 });
    y += 65;
  }
// 📌 FOLIO DEL ALUMNO
const folioBoxX = 340;
const folioBoxY = y - 5;
const folioBoxWidth = 210;
const folioBoxHeight = 38;

doc
  .lineWidth(2)
  .strokeColor('#7A1E2C')
  .roundedRect(folioBoxX, folioBoxY, folioBoxWidth, folioBoxHeight, 10)
  .stroke();

doc
  .fontSize(16)
  .fillColor('#7A1E2C')
  .font('Helvetica-Bold')
  .text(datos.folio || '', folioBoxX, folioBoxY + 10, {
    width: folioBoxWidth,
    align: 'center'
  });

doc.fillColor('black');

y += 45;



doc.fillColor('black');

  
  

y += 30;

  y = drawSectionTitle('Datos del Alumno', y);
  y = drawBox('Nombres', alumno.nombres, marginX, y);
  y = drawBox('Primer Apellido', alumno.primer_apellido, marginX + 260, y);
  y += GAP_Y;
  y = drawBox('Segundo Apellido', alumno.segundo_apellido, marginX, y);
  y = drawBox('CURP', alumno.curp, marginX + 260, y);
  y += GAP_Y;
  
 y = drawBox('Estado Civil', estadoCivilTexto, marginX, y);
y = drawBox('Nacionalidad', alumno.nacionalidad, marginX + 260, y);
y += GAP_Y;

  y = drawBox('Fecha de Nacimiento', alumno.fecha_nacimiento, marginX, y);
  y = drawBox('Edad', alumno.edad, marginX + 260, y);
  y += GAP_Y;
  y = drawBox('Sexo', alumno.sexo, marginX, y);
  y = drawBox('Estado de Nacimiento', estado, marginX + 260, y);
  y += GAP_Y;
  y = drawBox('Municipio de Nacimiento', municipio, marginX, y);
y = drawBox('Ciudad de Nacimiento', ciudad, marginX + 260, y);
y += GAP_Y;

y = drawBox('País (si extranjero)', alumno.pais_extranjero, marginX, y);
y = drawBox('Primera Opción', generales.primera_opcion, marginX + 260, y);
y += GAP_Y;

y = drawBox('Segunda Opción', generales.segunda_opcion, marginX, y);
y = drawBox('Tercera Opción', generales.tercera_opcion, marginX + 260, y);
y += GAP_Y;

y = drawBox('Cuarta Opción', generales.cuarta_opcion, marginX, y);
y = drawBox('Quinta Opción', generales.quinta_opcion, marginX + 260, y);
y += GAP_Y;
  y = drawBox(' ', generales._opcion, marginX, y);
y = drawBox('Sexta Opción', generales.sexta_opcion, marginX + 260, y);
y += GAP_Y;







  y = drawSectionTitle('Secundaria de Origen', y);
  y = drawBox('Nombre', secundaria.nombre_secundaria, marginX, y);
  y = drawBox('Régimen', secundaria.regimen, marginX + 260, y);
  y += GAP_Y;
  y = drawBox('¿Estudias Actualmente?', secundaria.estudias, marginX, y);
  y = drawBox('Modalidad', secundaria.modalidad, marginX + 260, y);
  y += GAP_Y;

  y = drawSectionTitle('Tutor Responsable', y);
  y = drawBox('Padre', tutor.nombre_padre, marginX, y);
  y = drawBox('Tel. Padre', tutor.telefono_padre, marginX + 260, y);
  y += GAP_Y;
  y = drawBox('Madre', tutor.nombre_madre, marginX, y);
  y = drawBox('Tel. Madre', tutor.telefono_madre, marginX + 260, y);
  y += GAP_Y;
  y = drawBox('Vive con', tutor.vive_con, marginX, y);
  y += GAP_Y;
y += 60; // espacio adicional antes del footer


  if (fs.existsSync(footerPath)) {
    if (y + 100 > PAGE_HEIGHT) {
      doc.addPage();
      y = START_Y;
    }
    doc.image(footerPath, 50, y, { width: 500 });
  }

  doc.flushPages();
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('gray')
      .text(`Página ${i + 1} de ${range.count}`, 50, doc.page.height - 40, {
        align: 'center',
        width: doc.page.width - 100
      });
  }

  doc.end();

  return new Promise((resolve, reject) => {
  stream.on('finish', () => {
    resolve(`/pdfs/${nombreArchivo}`);
  });
  stream.on('error', reject);
});

}

module.exports = generarPDF;
