const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { anexarPDFs } = require('./pdfAnexos');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function crearChunkPng(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function convertirPngAEscalaGrises(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return buffer;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += length + 12;
  }

  // El generador PDFKit soporta las imágenes originales; solo convertimos PNGs RGB/RGBA simples.
  if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0 || !width || !height) return buffer;

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const rgbaRows = [];
  let rawOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const scanline = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    const row = Buffer.alloc(stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0;
      let value = scanline[x];

      if (filter === 1) value = (value + left) & 0xff;
      else if (filter === 2) value = (value + up) & 0xff;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
        value = (value + predictor) & 0xff;
      }

      row[x] = value;
    }

    rgbaRows.push(row);
    previous = row;
  }

  const grayscaleRawRows = [];
  for (const row of rgbaRows) {
    const grayscaleRow = Buffer.alloc(1 + stride);
    grayscaleRow[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = x * bytesPerPixel;
      const gray = Math.round((row[i] * 0.299) + (row[i + 1] * 0.587) + (row[i + 2] * 0.114));
      grayscaleRow[1 + i] = gray;
      grayscaleRow[1 + i + 1] = gray;
      grayscaleRow[1 + i + 2] = gray;
      if (bytesPerPixel === 4) grayscaleRow[1 + i + 3] = row[i + 3];
    }
    grayscaleRawRows.push(grayscaleRow);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    crearChunkPng('IHDR', ihdr),
    crearChunkPng('IDAT', zlib.deflateSync(Buffer.concat(grayscaleRawRows))),
    crearChunkPng('IEND', Buffer.alloc(0))
  ]);
}

function leerImagenEnBlancoYNegro(ruta) {
  const buffer = fs.readFileSync(ruta);
  try {
    return convertirPngAEscalaGrises(buffer);
  } catch (error) {
    console.warn(`No se pudo convertir la imagen a blanco y negro: ${ruta}`, error.message);
    return buffer;
  }
}

const catalogoPath = path.resolve(__dirname, './catalogo.json');
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'));

function obtenerNombresDesdeCatalogo(estadoClave, municipioClave, ciudadClave) {
  const estado = catalogo.find((e) => String(e.clave) === String(estadoClave));
  if (!estado) return { estado: '', municipio: '', ciudad: '' };

  const municipio = estado.municipios.find((m) => String(m.clave) === String(municipioClave) || m.nombre === municipioClave);
  const localidad = municipio?.localidades?.find((l) => String(l.clave) === String(ciudadClave) || l.nombre === ciudadClave);

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
  const emergencia = datos.persona_emergencia || {};
  
const tipoTramite = String(datos.tipo_tramite || '').trim().toUpperCase();
  const esReinscripcion = tipoTramite === 'REINSCRIPCION';
  const tituloTramite = esReinscripcion ? 'Reinscripción' : 'Inscripción';
  const logoPath = path.join(__dirname, '../public/images/logo.png');
  const footerPath = path.join(__dirname, '../public/images/firma_footer.png');

  const PAGE_HEIGHT = doc.page.height;
  const BOTTOM_MARGIN = 80;
  const START_Y = 50;
  const BOX_HEIGHT = 30;
  const GAP_Y = 35;
  const marginX = 50;

  const nacimiento = obtenerNombresDesdeCatalogo(alumno.estado_nacimiento, alumno.municipio_nacimiento, alumno.ciudad_nacimiento);
  const residencia = obtenerNombresDesdeCatalogo(generales.estado_nacimiento_general, generales.municipio_nacimiento_general, generales.ciudad_nacimiento_general);

  const estadoCivilTexto = {
    '1': 'Soltero', '2': 'Casado', '3': 'Unión Libre', '4': 'Divorciado', '5': 'Viudo'
  }[String(alumno.estado_civil)] || alumno.estado_civil;

  const nombreCompletoAlumno = [alumno.nombres, alumno.primer_apellido, alumno.segundo_apellido]
    .filter(Boolean)
    .join(' ');

  const formatearFechaRegistro = (fecha) => {
    const fechaBase = fecha ? new Date(fecha) : new Date();
    if (Number.isNaN(fechaBase.getTime())) return '';
    return fechaBase.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const fechaRegistro = formatearFechaRegistro(
    datos.fecha_registro || datos.createdAt || datos.updatedAt || new Date()
  );

  let y = START_Y;

  const drawBox = (label, value, x, yPos, width = 240, height = BOX_HEIGHT) => {
    let yy = yPos;
    if (yy + height + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      yy = START_Y;
    }
    doc.lineWidth(0.5).strokeColor('#000').rect(x, yy, width, height).stroke();
    doc.fontSize(8).fillColor('#333').text(label, x + 5, yy + 2);
    doc.fontSize(10).fillColor('#000').text(value ?? '', x + 5, yy + 14, { width: width - 10 });
    return yy;
  };

  const drawMultilineBox = (label, value, x, yPos, width = 240) => {
    const text = value || '';
    const textHeight = doc.heightOfString(text, { width: width - 10 });
    const height = textHeight + 24;
    let yy = yPos;
    if (yy + height + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      yy = START_Y;
    }
    doc.lineWidth(0.5).strokeColor('#000').rect(x, yy, width, height).stroke();
    doc.fontSize(8).fillColor('#333').text(label, x + 5, yy + 2);
    doc.fontSize(10).fillColor('#000').text(text, x + 5, yy + 14, { width: width - 10 });
    return yy + height + 5;
  };

  const drawSectionTitle = (title, yPos) => {
    let yy = yPos;
    if (yy + 30 + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      yy = START_Y;
    }
    doc.rect(marginX, yy, 500, 20).fill('#000');
    doc.fillColor('white').fontSize(12).text(`  ${title.toUpperCase()}`, marginX + 5, yy + 5);
    doc.fillColor('black');
    return yy + 30;
  };

  const drawNote = (text, yPos = y) => {
    let yy = Number.isFinite(yPos) ? yPos : y;
    const noteHeight = doc.heightOfString(text, { width: 490 }) + 14;
    if (yy + noteHeight + BOTTOM_MARGIN > PAGE_HEIGHT) {
      doc.addPage();
      yy = START_Y;
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#000')
      .text(text, marginX + 5, yy + 5, { width: 490 });

    doc.font('Helvetica').fillColor('black');
    return yy + noteHeight + 5;
  };

  if (fs.existsSync(logoPath)) {
    doc.image(leerImagenEnBlancoYNegro(logoPath), 50, y, { width: 500 });
    y += 65;
  }

  const folioBoxX = 340;
  const folioBoxY = y - 5;
  const folioBoxWidth = 210;
  const folioBoxHeight = 38;
  const tituloBoxX = 190;
  const tituloBoxWidth = 135;

  doc.lineWidth(2).strokeColor('#000').roundedRect(folioBoxX, folioBoxY, folioBoxWidth, folioBoxHeight, 10).stroke();
  doc.fontSize(16).fillColor('#000').font('Helvetica-Bold').text(datos.folio || '', folioBoxX, folioBoxY + 10, { width: folioBoxWidth, align: 'center' });
  doc.fontSize(14).fillColor('#000').font('Helvetica-Bold').text(tituloTramite, tituloBoxX, folioBoxY + 11, {
    width: tituloBoxWidth,
    align: 'right'
  });
  doc.font('Helvetica').fillColor('black');
  y += 45;

  y = drawSectionTitle('Datos del Alumno', y + 10);
  y = drawBox('Nombres', alumno.nombres, marginX, y);
  y = drawBox('Primer Apellido', alumno.primer_apellido, marginX + 260, y); y += GAP_Y;
  y = drawBox('Segundo Apellido', alumno.segundo_apellido, marginX, y);
  y = drawBox('CURP', alumno.curp, marginX + 260, y); y += GAP_Y;
  y = drawBox('Carrera', alumno.carrera, marginX, y);
  y = drawBox('Periodo Semestral', alumno.periodo_semestral, marginX + 260, y); y += GAP_Y;
  y = drawBox('Semestre', alumno.semestre, marginX, y);
  y = drawBox('Grupo', alumno.grupo, marginX + 260, y); y += GAP_Y;
  y = drawBox('Turno', alumno.turno, marginX, y);
  y = drawBox('Estado Civil', estadoCivilTexto, marginX + 260, y); y += GAP_Y;
  y = drawBox('Nacionalidad', alumno.nacionalidad, marginX, y);
  y = drawBox('País extranjero', alumno.pais_extranjero, marginX + 260, y); y += GAP_Y;
  y = drawBox('Fecha de Nacimiento', alumno.fecha_nacimiento, marginX, y);
  y = drawBox('Edad', alumno.edad, marginX + 260, y); y += GAP_Y;
  y = drawBox('Sexo', alumno.sexo, marginX, y);
  y = drawBox('Estado de Nacimiento', nacimiento.estado, marginX + 260, y); y += GAP_Y;
  y = drawBox('Municipio de Nacimiento', nacimiento.municipio, marginX, y);
  y = drawBox('Ciudad de Nacimiento', nacimiento.ciudad, marginX + 260, y); y += GAP_Y;
   if (!esReinscripcion) {
   // y = drawBox('Primera Opción', generales.primera_opcion, marginX, y);
   // y = drawBox('Segunda Opción', generales.segunda_opcion, marginX + 260, y); y += GAP_Y;
   // y = drawBox('Tercera Opción', generales.tercera_opcion, marginX, y);
    //y = drawBox('Cuarta Opción', generales.cuarta_opcion, marginX + 260, y); y += GAP_Y;
   // y = drawBox('Quinta Opción', generales.quinta_opcion, marginX, y); y += GAP_Y;
  }

  y = drawSectionTitle('Datos Generales', y);
  y = drawBox('Colonia', generales.colonia, marginX, y);
  y = drawBox('Domicilio', generales.domicilio, marginX + 260, y); y += GAP_Y;
  y = drawBox('Código Postal', generales.codigo_postal, marginX, y);
  y = drawBox('Teléfono Alumno', generales.telefono_alumno, marginX + 260, y); y += GAP_Y;
  y = drawBox('Correo Alumno', generales.correo_alumno, marginX, y, 500); y += GAP_Y;
  y = drawBox('Tipo de Sangre', generales.tipo_sangre, marginX, y);
  if (esReinscripcion) {
    y += GAP_Y;
  } else {
    y = drawBox('Paraescolar', generales.paraescolar, marginX + 260, y); y += GAP_Y;
  }
  y = drawBox('Contacto Emergencia', generales.contacto_emergencia_nombre, marginX, y);
  y = drawBox('Tel. Emergencia', generales.contacto_emergencia_telefono, marginX + 260, y); y += GAP_Y;
  y = drawBox('¿Lengua indígena?', generales.habla_lengua_indigena?.respuesta, marginX, y);
  y = drawBox('¿Cuál lengua?', generales.habla_lengua_indigena?.cual, marginX + 260, y); y += GAP_Y;
  if (!esReinscripcion) {
    y = drawBox('Hermanos activos', generales.hermanos_activos, marginX, y); y += GAP_Y;
    y = drawNote('NOTA: LOS DATOS PROPORCIONADOS EN EL PRESENTE DOCUMENTO SE TOMARÁN PARA LA GESTIÓN DE BECAS, POR LO QUE NO SE DEBERÁN DE MODIFICAR.', y);
    y = drawNote('NOTA: PROPORCIONAR COPIA DEL INE DE LOS PADRES Y 3ERA PERSONA AUTORIZADA.', y);
    y = drawSectionTitle('Estado de Residencia', y);
    y = drawBox('Estado', residencia.estado, marginX, y);
    y = drawBox('Municipio', residencia.municipio, marginX + 260, y); y += GAP_Y;
    y = drawBox('Ciudad', residencia.ciudad, marginX, y); y += GAP_Y;
  }

  y = drawSectionTitle('Datos Médicos', y);
  y = drawBox('NSS', medicos.numero_seguro_social, marginX, y);
  y = drawBox('Unidad Médica', medicos.unidad_medica_familiar, marginX + 260, y); y += GAP_Y;
  y = drawBox('¿Enfermedad/Alergia?', medicos.enfermedad_cronica_o_alergia?.respuesta, marginX, y);
  y = drawMultilineBox('Detalle enfermedad/alergia', medicos.enfermedad_cronica_o_alergia?.detalle, marginX + 260, y);
  y = drawBox('Discapacidad', medicos.discapacidad, marginX, y);
  y = drawBox('¿Entrega diagnóstico?', generales.entrega_diagnostico, marginX + 260, y); y += GAP_Y;
  y = drawMultilineBox('Detalle enfermedad', generales.detalle_enfermedad, marginX, y, 500);

 if (esReinscripcion) {
    y = drawSectionTitle('Situación Académica', y);
    y = drawBox('Adeudo: número de materias reprobadas', datos.adeudo ?? datos.materias_reprobadas, marginX, y, 500); y += GAP_Y;
  } else {
    y = drawSectionTitle('Secundaria de Origen', y);
    y = drawBox('Nombre secundaria', secundaria.nombre_secundaria, marginX, y);
    y = drawBox('CCT secundaria', secundaria.cct_secundaria, marginX + 260, y); y += GAP_Y;
    y = drawBox('Régimen', secundaria.regimen, marginX, y);
    y = drawBox('Modalidad', secundaria.modalidad, marginX + 260, y); y += GAP_Y;
    y = drawBox('Participaciones', secundaria.participaciones_secundaria, marginX, y);
    y = drawBox('Promedio general', secundaria.promedio_general, marginX + 260, y); y += GAP_Y;
  }

  y = drawSectionTitle('Tutor Responsable', y);
  y = drawBox('Nombre padre', tutor.nombre_padre, marginX, y);
  y = drawBox('Teléfono padre', tutor.telefono_padre, marginX + 260, y); y += GAP_Y;
  y = drawBox('Nombre madre', tutor.nombre_madre, marginX, y);
  y = drawBox('Teléfono madre', tutor.telefono_madre, marginX + 260, y); y += GAP_Y;
  y = drawBox('Vive con', tutor.vive_con, marginX, y);
  y = drawBox('Carta poder', generales.carta_poder, marginX + 260, y); y += GAP_Y;
  y = drawBox('Resp. Emergencia adicional', generales.responsable_emergencia?.nombre, marginX, y);
  y = drawBox('Tel. adicional', generales.responsable_emergencia?.telefono, marginX + 260, y); y += GAP_Y;
  y = drawBox('Parentesco adicional', generales.responsable_emergencia?.parentesco, marginX, y); y += GAP_Y;

  y = drawSectionTitle('Persona de Emergencia', y);
  y = drawBox('Nombre', emergencia.nombre, marginX, y);
  y = drawBox('Parentesco', emergencia.parentesco, marginX + 260, y); y += GAP_Y;
  y = drawBox('Teléfono', emergencia.telefono, marginX, y); y += GAP_Y;
  

  const drawFooterImage = () => {
    if (!fs.existsSync(footerPath)) return;
    if (y + 100 > PAGE_HEIGHT) {
      doc.addPage();
      y = START_Y;
    }
  doc.image(leerImagenEnBlancoYNegro(footerPath), 50, y, { width: 500 });
    y += 100;
  };

  drawFooterImage();

 y += 90;
  const tituloSolicitud = esReinscripcion ? 'Solicitud de Reinscripción' : 'Solicitud de Inscripción';
  y = drawSectionTitle(tituloSolicitud, y);
  y = drawBox('Nombre completo del alumno', nombreCompletoAlumno, marginX, y, 500); y += GAP_Y;
  y = drawBox('Fecha de registro', fechaRegistro, marginX, y);
  y = drawBox('Folio / Número de control', datos.folio || datos.numero_control || datos.numeroControl || '', marginX + 260, y); y += GAP_Y;
  drawFooterImage();

  doc.flushPages();
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('gray').text(`Página ${i + 1} de ${range.count}`, 50, doc.page.height - 40, {
      align: 'center',
      width: doc.page.width - 100
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', async () => {
      try {
        await anexarPDFs(rutaPDF, esReinscripcion ? 'REINSCRIPCION' : 'INSCRIPCION');
        resolve(`/pdfs/${nombreArchivo}`);
      } catch (error) {
        reject(error);
      }
    });
    stream.on('error', reject);
  });
}

module.exports = generarPDF;
