import io
import streamlit as st
from PIL import Image
import fitz
import img2pdf
from pypdf import PdfWriter, PdfReader

st.set_page_config(page_title="PDF Tools", page_icon="📄", layout="wide")

# ── CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
body { background-color: #f5f6fa; }

.block-container {
    padding-top: 2rem;
    padding-bottom: 2rem;
    max-width: 1200px;
}

.hero { text-align: center; padding: 2rem 0 1rem 0; }

.hero h1 {
    font-size: 42px;
    font-weight: 700;
    color: #1f2937;
}

.hero p {
    color: #6b7280;
    font-size: 18px;
}

.stButton button {
    border-radius: 10px;
    height: 45px;
    font-weight: 600;
}

.stDownloadButton button {
    background-color: #ef4444;
    color: white;
    border-radius: 10px;
    height: 48px;
    font-weight: bold;
}

.card {
    background: white;
    padding: 12px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}

.thumb.selected {
    border: 2px solid #ef4444;
}

[data-testid="stColumns"] { gap: 1rem; }
</style>
""", unsafe_allow_html=True)

THUMB_COLS = 4

# ── HERO ───────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
    <h1>PDF Tools</h1>
    <p>Edite seus arquivos PDF de forma simples e rápida</p>
</div>
""", unsafe_allow_html=True)

# ── HELPERS ────────────────────────────────────────────────────────────
def pdf_to_images(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    imgs = []
    for page in doc:
        pix = page.get_pixmap()
        imgs.append(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))
    return imgs

def build_pdf(reader, pages, angles=None):
    writer = PdfWriter()
    for i in pages:
        page = reader.pages[i]
        if angles and i in angles:
            page.rotate(angles[i])
        writer.add_page(page)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

# ── TABS ───────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "🔄 Rotacionar",
    "✂️ Extrair",
    "📎 Juntar",
    "🖼️ Imagens → PDF"
])

# ── ROTACIONAR ─────────────────────────────────────────────────────────
with tab1:
    file = st.file_uploader("Upload PDF", type="pdf", key="rot_file")

    if file:
        file_id = f"{file.name}_{file.size}"

        if st.session_state.get("rot_file_id") != file_id:
            pdf_bytes = file.read()
            st.session_state.rot_pdf = pdf_bytes
            st.session_state.rot_thumbs = pdf_to_images(pdf_bytes)
            st.session_state.rot_angles = {}
            st.session_state.rot_file_id = file_id

        thumbs = st.session_state.rot_thumbs
        angles = st.session_state.rot_angles
        reader = PdfReader(io.BytesIO(st.session_state.rot_pdf))

        cols = st.columns(THUMB_COLS)

        for i, img in enumerate(thumbs):
            with cols[i % THUMB_COLS]:
                st.markdown('<div class="card">', unsafe_allow_html=True)

                angle = angles.get(i, 0)
                if angle:
                    img = img.rotate(-angle, expand=True)

                st.image(img, use_container_width=True)

                if st.button("↻", key=f"rot_btn_{i}"):
                    angles[i] = (angle + 90) % 360
                    st.session_state.rot_angles = angles
                    st.rerun()

                st.markdown('</div>', unsafe_allow_html=True)

        if any(angles.values()):
            result = build_pdf(reader, list(range(len(thumbs))), angles)
            st.download_button(
                "Baixar PDF",
                result,
                file_name="rotacionado.pdf",
                mime="application/pdf",
                key="download_rotate"
            )

# ── EXTRAIR ────────────────────────────────────────────────────────────
with tab2:
    file = st.file_uploader("Upload PDF", type="pdf", key="ext_file")

    if file:
        file_id = f"{file.name}_{file.size}"

        if st.session_state.get("ext_file_id") != file_id:
            pdf_bytes = file.read()
            st.session_state.ext_pdf = pdf_bytes
            st.session_state.ext_thumbs = pdf_to_images(pdf_bytes)
            st.session_state.ext_selected = set()
            st.session_state.ext_file_id = file_id

        thumbs = st.session_state.ext_thumbs
        selected = st.session_state.ext_selected
        reader = PdfReader(io.BytesIO(st.session_state.ext_pdf))

        cols = st.columns(THUMB_COLS)

        for i, img in enumerate(thumbs):
            with cols[i % THUMB_COLS]:
                st.markdown('<div class="card">', unsafe_allow_html=True)

                st.image(img, use_container_width=True)

                if st.button(
                    "Selecionar" if i not in selected else "Remover",
                    key=f"ext_btn_{i}"
                ):
                    if i in selected:
                        selected.remove(i)
                    else:
                        selected.add(i)
                    st.session_state.ext_selected = selected
                    st.rerun()

                st.markdown('</div>', unsafe_allow_html=True)

        if selected:
            result = build_pdf(reader, sorted(selected))
            st.download_button(
                "Baixar PDF",
                result,
                file_name="extraido.pdf",
                mime="application/pdf",
                key="download_extract"
            )

# ── JUNTAR ─────────────────────────────────────────────────────────────
with tab3:
    files = st.file_uploader(
        "Upload PDFs",
        type="pdf",
        accept_multiple_files=True,
        key="merge_files"
    )

    if files:
        writer = PdfWriter()

        for f in files:
            reader = PdfReader(f)
            for p in reader.pages:
                writer.add_page(p)

        buf = io.BytesIO()
        writer.write(buf)

        st.download_button(
            "Baixar PDF unificado",
            buf.getvalue(),
            file_name="unificado.pdf",
            mime="application/pdf",
            key="download_merge"
        )

# ── IMG → PDF ──────────────────────────────────────────────────────────
with tab4:
    imgs = st.file_uploader(
        "Upload imagens",
        type=["png","jpg","jpeg"],
        accept_multiple_files=True,
        key="img_files"
    )

    if imgs:
        img_bytes = []

        for i in imgs:
            pil = Image.open(i).convert("RGB")
            buf = io.BytesIO()
            pil.save(buf, format="JPEG")
            img_bytes.append(buf.getvalue())

        pdf = img2pdf.convert(img_bytes)

        st.download_button(
            "Baixar PDF",
            pdf,
            file_name="imagens.pdf",
            mime="application/pdf",
            key="download_img"
        )