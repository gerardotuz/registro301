// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Paraescolar = require("./models/paraescolar.model");
const multer = require("multer");
const XLSX = require("xlsx");


const fs = require("fs");

// Crear carpeta uploads si no existe (Render)
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}


require('dotenv').config();

const app = express();

/* =========================
   CONFIGURACIÓN GENERAL
========================= */

// CORS
const corsOptions = {
  origin: 'https://registro301.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload temporal
const upload = multer({ dest: "uploads/" });

/* =========================
   CONEXIÓN MONGODB
========================= */

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch(err => console.error('❌ Error en la conexión', err));

/* =========================
   RUTAS API EXISTENTES
========================= */

app.use('/api', require('./routers/alumno.js'));
app.use('/api', require('./routers/auth.js'));
app.use('/api', require('./routers/grupo.js'));
app.use('/api/dashboard', require('./routers/dashboard'));
app.use('/api', require('./routers/padron.js'));


/* =========================
   MÓDULO PARAESCOLARES
========================= */



// Guardar paraescolar
app.put("/api/paraescolar/:id", async (req, res) => {
  try {
    const { paraescolar } = req.body;

    const alumno = await Paraescolar.findById(req.params.id);

    if (!alumno) {
      return res.status(404).json({ error: "Alumno no existe" });
    }

    if (alumno.bloqueado) {
      return res.status(400).json({
        error: "Este alumno ya seleccionó un paraescolar"
      });
    }

    const total = await Paraescolar.countDocuments({ paraescolar });
    if (total >= 50) {
      return res.status(400).json({
        error: "Este paraescolar ya alcanzó el límite de 50 alumnos"
      });
    }

    alumno.paraescolar = paraescolar;
    alumno.fecha_registro = new Date();
    alumno.bloqueado = true;
    await alumno.save();

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar paraescolar" });
  }
});

app.post("/api/paraescolar/cargar-excel", upload.single("excel"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    rows.shift(); // eliminar encabezados

    let insertados = 0;

    for (const fila of rows) {
      const numero_control = String(fila[0] || "").trim();
      const curp   = String(fila[1] || "").trim();
      const nombre = String(fila[2] || "").trim();
      const grado  = String(fila[3] || "").trim();
      const grupo  = String(fila[4] || "").trim();
      const turno  = String(fila[5] || "").trim(); 

      if (!numero_control) continue;

      await Paraescolar.updateOne(
        { numero_control },
        {
          $set: {
            numero_control,
            curp,
            nombre,
            grado,
            grupo,
            turno, 
            bloqueado: false
          }
        },
        { upsert: true }
      );

      insertados++;
    }

    // 🧹 Borrar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({ ok: true, total: insertados });

  } catch (err) {
    console.error("❌ ERROR CARGA EXCEL:", err);
    res.status(500).json({ error: "Error al cargar Excel" });
  }
});

function formatearFechaMexico(fechaUTC) {
  if (!fechaUTC) return "";

  const fecha = new Date(fechaUTC);

  // Ajuste manual UTC-5 (México)
  fecha.setHours(fecha.getHours() - 5);

  const dia  = String(fecha.getDate()).padStart(2, "0");
  const mes  = String(fecha.getMonth() + 1).padStart(2, "0");
  const año  = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, "0");
  const min  = String(fecha.getMinutes()).padStart(2, "0");

  return `${dia}/${mes}/${año} ${hora}:${min}`;
}



app.get("/api/paraescolar/exportar", async (req, res) => {
  try {
    const data = await Paraescolar.find()
      .sort({ fecha_registro: -1 })   // Orden por registro
      .lean();

    if (!data || data.length === 0) {
      return res.status(400).send("No hay datos para exportar");
    }

    // 🧾 Construcción del Excel
   const excelData = data.map((item, index) => ({
  orden: index + 1,
  numero_control: item.numero_control ?? "",
  curp: item.curp ?? "",
  nombre: item.nombre ?? "",
  grado: item.grado ?? "",
  grupo: item.grupo ?? "",
  turno: item.turno ?? "",
  paraescolar: item.paraescolar ?? "",   // ✅ no se pierde
  fecha_registro: item.fecha_registro
    ? formatearFechaMexico(item.fecha_registro)
    : ""                                  // ✅ no se pierde
}));


    // Crear hoja Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Paraescolares");

    // Generar buffer XLSX
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=paraescolares.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);

  } catch (error) {
    console.error("ERROR EXPORTAR EXCEL:", error);
    res.status(500).send("Error al generar Excel");
  }
});



// 📊 Contador por paraescolar
app.get("/api/paraescolar/estadisticas", async (req, res) => {
  try {
    const stats = await Paraescolar.aggregate([
      { $match: { paraescolar: { $ne: null } } },
      {
        $group: {
          _id: "$paraescolar",
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error("ERROR ESTADISTICAS:", error);
    res.status(500).json({ error: "Error al generar estadísticas" });
  }
});




// 🎯 Cupos disponibles por paraescolar (normalizado)
app.get("/api/paraescolar/cupos", async (req, res) => {
  try {
    const limite = 50;

    const conteos = await Paraescolar.aggregate([
      { $match: { paraescolar: { $ne: null } } },
      {
        $project: {
          nombre: {
            $toUpper: { $trim: { input: "$paraescolar" } }
          }
        }
      },
      {
        $group: {
          _id: "$nombre",
          total: { $sum: 1 }
        }
      }
    ]);

    const mapa = {};
    conteos.forEach(c => {
      mapa[c._id] = limite - c.total;
    });

    res.json(mapa);

  } catch (error) {
    console.error("ERROR CUPOS:", error);
    res.status(500).json({ error: "Error al calcular cupos" });
  }
});



// Buscar alumno
app.get("/api/paraescolar/:control", async (req, res) => {
  try {
    const alumno = await Paraescolar.findOne({
      numero_control: req.params.control
    });

    if (!alumno) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }

    res.json(alumno);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en servidor" });
  }
});


/* =========================
   ARCHIVOS ESTÁTICOS
========================= */

app.use(express.static(path.join(__dirname, 'public')));
app.use('/pdfs', express.static(path.join(__dirname, 'public/pdfs')));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'views', 'dashboard.html'));
});

/* =========================
   FALLBACK SPA
========================= */

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =========================
   SERVIDOR
========================= */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});





app.post("/api/registro-online", async (req,res)=>{
  try{
    await Paraescolar.updateOne(
      { curp: req.body.curp },
      { $set: req.body },
      { upsert:true }
    );

    res.json({ ok:true });
  }catch(e){
    res.status(500).json({ ok:false });
  }
});


