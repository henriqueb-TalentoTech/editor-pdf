# -*- coding: utf-8 -*-
import io
import json

import fitz
from pypdf import PdfReader, PdfWriter
import img2pdf
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image

app = FastAPI(title="PDF Tools API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────────────
@app.post("/api/rotate")
async def rotate(file: UploadFile = File(...), angles: str = Query("{}")):
    angle_map = json.loads(angles)
    pdf_bytes = await file.read()

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for i in range(len(doc)):
        angle = angle_map.get(str(i), 0)
        if angle:
            doc[i].set_rotation(angle)

    result = doc.tobytes()
    doc.close()
    return Response(content=result, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=rotacionado.pdf"})


@app.post("/api/extract")
async def extract(file: UploadFile = File(...), pages: str = Query("[]")):
    pages_list = json.loads(pages)
    pdf_bytes = await file.read()

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    out = fitz.open()

    for p in sorted(pages_list):
        out.insert_pdf(doc, from_page=p, to_page=p)

    result = out.tobytes()
    out.close()
    doc.close()
    return Response(content=result, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=extraido.pdf"})


@app.post("/api/merge")
async def merge(files: list[UploadFile] = File(...)):
    writer = PdfWriter()
    for f in files:
        data = await f.read()
        reader = PdfReader(io.BytesIO(data))
        for page in reader.pages:
            writer.add_page(page)

    buf = io.BytesIO()
    writer.write(buf)
    return Response(content=buf.getvalue(), media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=unificado.pdf"})


@app.post("/api/img2pdf")
async def img_2_pdf(files: list[UploadFile] = File(...)):
    img_bytes = []
    for f in files:
        pil = Image.open(io.BytesIO(await f.read())).convert("RGB")
        buf = io.BytesIO()
        pil.save(buf, format="JPEG")
        img_bytes.append(buf.getvalue())
    pdf = img2pdf.convert(img_bytes)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=imagens.pdf"})


@app.get("/api/health")
def health():
    return {"status": "ok"}
