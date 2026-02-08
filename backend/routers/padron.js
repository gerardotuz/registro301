const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const Padron = require("../models/Padron");

const upload = multer({ storage: multer.memoryStorage() });

/* =================================
   CARGAR EXCEL PADRÓN
================================= */
router.post("/padron/cargar-excel", upload.single("archivo"), async (req,res)=>{

  try{

    const workbook = xlsx.read(req.file.buffer, { type:"buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    for(const r of rows){

      await Padron.updateOne(
        { curp: r.CURP?.toUpperCase() },
        {
          curp: r.CURP?.toUpperCase(),
          nombres: r.NOMBRES?.toUpperCase(),
          primer_apellido: r.PRIMER_APELLIDO?.toUpperCase(),
          segundo_apellido: r.SEGUNDO_APELLIDO?.toUpperCase()
        },
        { upsert:true }
      );
    }

    res.json({ ok:true, total: rows.length });

  }catch(err){
    res.status(500).json({ error: err.message });
  }

});


router.get("/padron/:curp", async (req,res)=>{

  const alumno = await Padron.findOne({
    curp: req.params.curp.toUpperCase()
  });

  if(!alumno) return res.json(null);

  res.json(alumno);
});


/* =================================
   ⭐ ESTA LÍNEA FALTABA
================================= */
module.exports = router;
