const fs = require('fs');
const path = require('path');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');

const ANEXOS_BASE_DIR = path.join(__dirname, '../public/pdfs/anexos');
const TIPOS_TRAMITE = {
  INSCRIPCION: 'inscripcion',
  REINSCRIPCION: 'reinscripcion'
};
const CARPETAS_ALTERNAS_TIPO_TRAMITE = {
  INSCRIPCION: ['inscripciones'],
  REINSCRIPCION: ['reinscripciones']
};
function obtenerCarpetaAnexos(tipoTramite = 'INSCRIPCION') {
  const tipoNormalizado = String(tipoTramite || 'INSCRIPCION')
    .trim()
    .toUpperCase();

  return TIPOS_TRAMITE[tipoNormalizado] || TIPOS_TRAMITE.INSCRIPCION;
}

function obtenerRutasCarpetasAnexos(tipoTramite = 'INSCRIPCION') {
  const tipoNormalizado = String(tipoTramite || 'INSCRIPCION')
    .trim()
    .toUpperCase();
  const carpetaPrincipal = obtenerCarpetaAnexos(tipoNormalizado);
  const carpetas = [
    carpetaPrincipal,
    ...(CARPETAS_ALTERNAS_TIPO_TRAMITE[tipoNormalizado] || [])
  ];

  return [...new Set(carpetas)].map((carpeta) => path.join(ANEXOS_BASE_DIR, carpeta));
}

  return fs
    function listarAnexos(tipoTramite) {
  return obtenerRutasCarpetasAnexos(tipoTramite)
    .filter((rutaCarpeta) => fs.existsSync(rutaCarpeta))
    .flatMap((rutaCarpeta) => fs
      .readdirSync(rutaCarpeta)
      .filter((archivo) => archivo.toLowerCase().endsWith('.pdf'))
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((archivo) => path.join(rutaCarpeta, archivo)));
}

async function anexarPDFs(rutaPDFPrincipal, tipoTramite = 'INSCRIPCION') {
  const anexos = listarAnexos(tipoTramite);
  if (!anexos.length) return;

  const pdfPrincipalBytes = fs.readFileSync(rutaPDFPrincipal);
  const pdfFinal = await PDFLibDocument.load(pdfPrincipalBytes);

  for (const rutaAnexo of anexos) {
    const anexoBytes = fs.readFileSync(rutaAnexo);
    const pdfAnexo = await PDFLibDocument.load(anexoBytes);
    const paginas = await pdfFinal.copyPages(pdfAnexo, pdfAnexo.getPageIndices());
    paginas.forEach((pagina) => pdfFinal.addPage(pagina));
  }

  const pdfFinalBytes = await pdfFinal.save();
  fs.writeFileSync(rutaPDFPrincipal, pdfFinalBytes);
}

module.exports = {
  ANEXOS_BASE_DIR,
  anexarPDFs,
  listarAnexos,
   obtenerCarpetaAnexos,
  obtenerRutasCarpetasAnexos
};
