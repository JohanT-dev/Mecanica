import gspread
import smtplib
import os
import re
import urllib.request
from email.message import EmailMessage
from oauth2client.service_account import ServiceAccountCredentials
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import time
import datetime

# ─────────────────────────────────────────────
# CONFIGURACIÓN DE CORREO
# Rellena estos valores antes de ejecutar:
# ─────────────────────────────────────────────
GMAIL_REMITENTE    = "johnyprograma@gmail.com"    # Correo desde el que se envía
GMAIL_APP_PASSWORD = "zjna klcn gwov tkwc"    # App Password de Google (16 caracteres)
                                               # Genérala en: myaccount.google.com
                                               #   → Seguridad → Contraseñas de aplicación


# ─────────────────────────────────────────────
# FUNCIÓN DE ENVÍO DE CORREO
# ─────────────────────────────────────────────

def _gdrive_url_a_descarga(url: str) -> str:
    """
    Convierte una URL de visualización de Google Drive en una URL de descarga directa.

    Formatos soportados:
      • https://drive.google.com/file/d/<ID>/view?...
      • https://drive.google.com/open?id=<ID>
      • https://drive.google.com/uc?id=<ID>   (ya es descarga directa)
    """
    # Extraer el ID del archivo del formato /file/d/<ID>/
    match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"

    # Extraer el ID del formato ?id=<ID>
    match = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"

    # Si ya parece una URL de descarga, devolverla tal cual
    return url


def _descargar_imagenes(campo_imagenes: str, carpeta_temp: str = ".") -> list[tuple[str, bytes]]:
    """
    Descarga las imágenes cuyas URLs están en el campo de la hoja.
    Devuelve una lista de (nombre_archivo, bytes_de_imagen).

    El campo puede contener una o varias URLs separadas por comas o saltos de línea.
    """
    if not campo_imagenes or not campo_imagenes.strip():
        return []

    # Separar URLs por comas, espacios o saltos de línea
    urls_raw = re.split(r"[\s,]+", campo_imagenes.strip())
    urls = [u.strip() for u in urls_raw if u.strip().startswith("http")]

    imagenes = []
    for i, url in enumerate(urls, start=1):
        url_descarga = _gdrive_url_a_descarga(url)
        try:
            req = urllib.request.Request(
                url_descarga,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                # Intentar detectar extensión por Content-Type
                content_type = resp.headers.get("Content-Type", "image/jpeg")
                ext = "jpg"
                if "png" in content_type:
                    ext = "png"
                elif "gif" in content_type:
                    ext = "gif"
                elif "webp" in content_type:
                    ext = "webp"
                nombre = f"area_afectada_{i}.{ext}"
                imagenes.append((nombre, data))
                print(f"  📷 Imagen descargada: {nombre}")
        except Exception as e:
            print(f"  ⚠️  No se pudo descargar la imagen {i} ({url_descarga[:60]}...): {e}")

    return imagenes


def enviar_correo_checklist(inspeccion: dict, pdf_path: str):
    """
    Envía por correo el PDF del checklist + imágenes de áreas afectadas
    al destinatario registrado en la hoja.

    Parameters
    ----------
    inspeccion : dict
        Fila de inspección con todos los campos de Google Sheets.
    pdf_path : str
        Ruta al archivo PDF generado previamente.
    """

    destinatario = inspeccion.get("Correo de envio de registro (Usuario)", "").strip()
    if not destinatario:
        print("⚠️  No se encontró correo destinatario en la respuesta. No se envió el correo.")
        return

    tecnico  = inspeccion.get("Técnico", "N/D")
    placa    = inspeccion.get("Placa", "N/D")
    vehiculo = inspeccion.get("Tipo de vehiculo", "N/D")
    km       = inspeccion.get("Kilometraje", "N/D")
    fecha    = inspeccion.get("Marca temporal", "N/D")

    # ── Resumen de alertas (ítems en Regular o Malo) ──
    alertas = []
    campos_revision = {
        # Sistema Eléctrico
        "Aceite de Freno":             inspeccion.get("Sistema Eléctrico [Aceite de Freno]", ""),
        "Aceite de Motor":             inspeccion.get("Sistema Eléctrico [Aceite de Motor]", ""),
        "Agua/Coolant":                inspeccion.get("Sistema Eléctrico [Agua/Coolant]", ""),
        "Agua limpia parabrisas":      inspeccion.get("Sistema Eléctrico [Agua de reserva del limpia Parabrisas]", ""),
        "Aceite Powerstering":         inspeccion.get("Sistema Eléctrico [Aceite de Powerstering]", ""),
        "Escobillas":                  inspeccion.get("Sistema Eléctrico [Escobillas]", ""),
        "Batería":                     inspeccion.get("Sistema Eléctrico [Bateria]", ""),
        "Frenos":                      inspeccion.get("Sistema Eléctrico [Frenos]", ""),
        # Accesorios
        "Llanta de repuesto":          inspeccion.get("Accessorios indispensables [Llanta de repuesto]", ""),
        "Triángulo/Inversora":         inspeccion.get("Accessorios indispensables [Triangulo Inversora]", ""),
        "Pipeta/Gato":                 inspeccion.get("Accessorios indispensables [Pipeta Gato]", ""),
        "Gato Hidráulico":             inspeccion.get("Accessorios indispensables [Hidraulico Exterior]", ""),
        "Extintor":                    inspeccion.get("Accessorios indispensables [Extintor]", ""),
        "Alarma":                      inspeccion.get("Accessorios indispensables [Alarma]", ""),
        # Estructura externa
        "Puerta lateral derecha":      inspeccion.get("Extructura externa [Puerta lateral derecha ]", ""),
        "Puerta lateral izquierda":    inspeccion.get("Extructura externa [Puerta lateral izquierda]", ""),
        "Llantas":                     inspeccion.get("Extructura externa [Llantas]", ""),
        "Espejos":                     inspeccion.get("Extructura externa [Espejos ]", ""),
        "Parabrisas":                  inspeccion.get("Extructura externa [Parabrisas]", ""),
        "Vidrio lateral derecho":      inspeccion.get("Extructura externa [Vidrio lateral derecho ]", ""),
        "Vidrio lateral izquierdo":    inspeccion.get("Extructura externa [Vidrio lateral izquierdo ]", ""),
        "Vidrio trasero":              inspeccion.get("Extructura externa [Vidrio trasero ]", ""),
        "Puerta trasera/Maletero":     inspeccion.get("Extructura externa [Puerta trasera o maletero ]", ""),
        "Tapa de Motor":               inspeccion.get("Extructura externa [Tapa de Motor ]", ""),
        "Tapicería":                   inspeccion.get("Extructura externa [Tapiceria ]", ""),
        "Carrocería (Golpes/Rayones)": inspeccion.get("Extructura externa [Estado de Carroceria (Golpes/Rayones)]", ""),
    }

    for nombre, estado in campos_revision.items():
        if estado.strip().lower() in ("regular", "malo"):
            alertas.append(f"  • {nombre}: {estado}")

    resumen_alertas = (
        "\n".join(alertas)
        if alertas
        else "  ✅ Todos los ítems están en buen estado."
    )

    # ── Descargar imágenes de áreas afectadas ──
    campo_img = inspeccion.get(
        "En caso de haber respondido malo o regular en la pregunta anterior. "
        "Incluir imagenes de las areas afectadas",
        ""
    )
    print("🔍 Descargando imágenes de áreas afectadas...")
    imagenes_adjuntas = _descargar_imagenes(campo_img)
    hay_imagenes = len(imagenes_adjuntas) > 0

    # ── Cuerpo del correo ──
    nota_imagenes = (
        f"\n  📎 Se adjuntan {len(imagenes_adjuntas)} imagen(es) de las áreas afectadas."
        if hay_imagenes
        else "\n  ℹ️  No se encontraron imágenes de áreas afectadas para adjuntar."
    )

    cuerpo = f"""Estimado/a,

Se adjunta el Check List de inspección vehicular correspondiente a:

  Técnico    : {tecnico}
  Vehículo   : {vehiculo}
  Placa      : {placa}
  Kilometraje: {km}
  Fecha      : {fecha}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESUMEN DE ALERTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{resumen_alertas}
{nota_imagenes}

Por favor revise el PDF adjunto para ver el detalle completo de la inspección.

Este correo fue generado automáticamente.
"""

    # ── Construir el mensaje ──
    msg = EmailMessage()
    msg["From"]    = GMAIL_REMITENTE
    msg["To"]      = destinatario
    msg["Subject"] = f"Check List Vehicular – {placa} | {fecha}"
    msg.set_content(cuerpo)

    # Adjuntar el PDF
    if os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            pdf_data = f.read()
        msg.add_attachment(
            pdf_data,
            maintype="application",
            subtype="pdf",
            filename=os.path.basename(pdf_path),
        )
        print(f"  📄 PDF adjuntado: {os.path.basename(pdf_path)}")
    else:
        print(f"⚠️  No se encontró el PDF en '{pdf_path}'. Se enviará el correo sin él.")

    # Adjuntar imágenes de áreas afectadas
    for nombre_img, datos_img in imagenes_adjuntas:
        ext = nombre_img.rsplit(".", 1)[-1].lower()
        subtype_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "gif": "gif", "webp": "webp"}
        subtype = subtype_map.get(ext, "jpeg")
        msg.add_attachment(
            datos_img,
            maintype="image",
            subtype=subtype,
            filename=nombre_img,
        )

    # ── Enviar vía Gmail SMTP ──
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(GMAIL_REMITENTE, GMAIL_APP_PASSWORD)
            smtp.send_message(msg)
        total_adj = 1 + len(imagenes_adjuntas)
        print(f"✉️  Correo enviado a: {destinatario} ({total_adj} adjunto/s)")
    except smtplib.SMTPAuthenticationError:
        print("❌ Error de autenticación. Verifica GMAIL_REMITENTE y GMAIL_APP_PASSWORD.")
    except Exception as e:
        print(f"❌ Error al enviar el correo: {e}")


# ─────────────────────────────────────────────
# FUNCIÓN DE GENERACIÓN DE PDF
# ─────────────────────────────────────────────

def generar_pdf_checklist(inspeccion: dict, nombre_archivo: str):
    """
    Genera un PDF con formato Check List Vehículos a partir de un
    diccionario de inspección obtenido de Google Sheets.
    """

    doc = SimpleDocTemplate(
        nombre_archivo,
        pagesize=letter,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "titulo", parent=styles["Title"], fontSize=18,
        textColor=colors.HexColor("#3B3B98"), spaceAfter=6, alignment=TA_CENTER,
    )
    section_style = ParagraphStyle(
        "seccion", parent=styles["Heading2"], fontSize=11,
        textColor=colors.HexColor("#3B3B98"), spaceBefore=12, spaceAfter=4,
    )
    label_style = ParagraphStyle(
        "label", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#555555"),
    )
    value_style = ParagraphStyle(
        "valor", parent=styles["Normal"], fontSize=9, fontName="Helvetica-Bold",
    )

    AZUL         = colors.HexColor("#3B3B98")
    GRIS_CLARO   = colors.HexColor("#F5F5F5")
    HEADER_COLOR = colors.HexColor("#E8E8F0")

    def marca(estado: str, opcion: str) -> str:
        if not estado:
            return ""
        return "✓" if estado.strip().lower() == opcion.strip().lower() else ""

    def tabla_estado(filas_datos):
        header = [
            Paragraph("", label_style),
            Paragraph("<b>Bueno</b>",   ParagraphStyle("h", parent=label_style, alignment=TA_CENTER)),
            Paragraph("<b>Regular</b>", ParagraphStyle("h", parent=label_style, alignment=TA_CENTER)),
            Paragraph("<b>Malo</b>",    ParagraphStyle("h", parent=label_style, alignment=TA_CENTER)),
        ]
        data = [header]
        for etiqueta, valor in filas_datos:
            data.append([
                Paragraph(etiqueta, label_style),
                Paragraph(marca(valor, "Bueno"),   ParagraphStyle("c", parent=label_style, alignment=TA_CENTER)),
                Paragraph(marca(valor, "Regular"), ParagraphStyle("c", parent=label_style, alignment=TA_CENTER)),
                Paragraph(marca(valor, "Malo"),    ParagraphStyle("c", parent=label_style, alignment=TA_CENTER)),
            ])
        t = Table(data, colWidths=[10*cm, 2.5*cm, 2.5*cm, 2.5*cm], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1, 0), HEADER_COLOR),
            ("TEXTCOLOR",     (0,0), (-1, 0), AZUL),
            ("FONTNAME",      (0,0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 9),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, GRIS_CLARO]),
            ("ALIGN",         (1,0), (-1,-1), "CENTER"),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#CCCCCC")),
            ("TOPPADDING",    (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING",   (0,0), (0, -1), 6),
        ]))
        return t

    fecha     = inspeccion.get("Marca temporal", "")
    tecnico   = inspeccion.get("Cliente", "")
    vehiculo  = inspeccion.get("Tipo de vehiculo", "")
    placa     = inspeccion.get("Placa", "")
    km        = inspeccion.get("Kilometraje", "")
    permiso   = inspeccion.get("Permiso de Tránsito ", "")
    poliza    = inspeccion.get("Poliza de Seguro", "")
    revisado  = inspeccion.get("Revisado", "")
    reg_veh   = inspeccion.get("Registro Vehicular ",  "")
    herramientas_raw   = inspeccion.get("Herramientas / exterior", "")
    herramientas_lista = [h.strip() for h in herramientas_raw.split(",") if h.strip()] if herramientas_raw else []

    story = []
    story.append(Paragraph("Check List Vehículos", title_style))
    story.append(HRFlowable(width="100%", thickness=1, color=AZUL))
    story.append(Spacer(1, 10))

    datos_gen = [
        [Paragraph("<b>Fecha</b>",       label_style), Paragraph(str(fecha),    value_style)],
        [Paragraph("<b>Técnico</b>",     label_style), Paragraph(str(tecnico),  value_style)],
        [Paragraph("<b>Vehículo</b>",    label_style), Paragraph(str(vehiculo), value_style)],
        [Paragraph("<b>Placa</b>",       label_style), Paragraph(str(placa),    value_style)],
        [Paragraph("<b>Kilometraje</b>", label_style), Paragraph(str(km),       value_style)],
    ]
    t_gen = Table(datos_gen, colWidths=[4*cm, 13.5*cm])
    t_gen.setStyle(TableStyle([
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [colors.white, GRIS_CLARO]),
        ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#DDDDDD")),
    ]))
    story.append(t_gen)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Documentación", section_style))
    doc_data = [
        [Paragraph("<b>Registro Vehicular</b>", label_style),
         Paragraph("<b>Póliza de Seguro</b>",   label_style),
         Paragraph("<b>Revisado Vehicular</b>", label_style),
         Paragraph("<b>Permiso de Tránsito</b>",label_style)],
        [Paragraph(str(reg_veh),  value_style),
         Paragraph(str(poliza),   value_style),
         Paragraph(str(revisado), value_style),
         Paragraph(str(permiso),  value_style)],
    ]
    t_doc = Table(doc_data, colWidths=[4.375*cm]*4)
    t_doc.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), HEADER_COLOR),
        ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
    ]))
    story.append(t_doc)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Herramientas / Exteriores", section_style))
    items_herr = ["Extintor","Triángulo y Herramientas","Gato Hidráulico",
                  "Pintura y Carrocería","Llave de Rueda","Orden y Limpieza"]
    herr_row = []
    for item in items_herr:
        presente = any(item.lower() in h.lower() for h in herramientas_lista)
        herr_row.append(Paragraph(("☑ " if presente else "☐ ") + item, label_style))
    t_herr = Table([herr_row], colWidths=[2.9*cm]*6)
    t_herr.setStyle(TableStyle([
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("BACKGROUND",    (0,0), (-1,-1), GRIS_CLARO),
    ]))
    story.append(t_herr)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Sistema Eléctrico", section_style))
    story.append(tabla_estado([
        ("Aceite de Freno",                           inspeccion.get("Sistema Eléctrico [Aceite de Freno]", "")),
        ("Aceite de Motor",                           inspeccion.get("Sistema Eléctrico [Aceite de Motor]", "")),
        ("Agua / Coolant",                            inspeccion.get("Sistema Eléctrico [Agua/Coolant]", "")),
        ("Agua de reserva del Limpia Parabrisas",     inspeccion.get("Sistema Eléctrico [Agua de reserva del limpia Parabrisas]", "")),
        ("Aceite de Powerstering",                    inspeccion.get("Sistema Eléctrico [Aceite de Powerstering]", "")),
        ("Escobillas",                                inspeccion.get("Sistema Eléctrico [Escobillas]", "")),
        ("Bateria",                                   inspeccion.get("Sistema Eléctrico [Bateria]", "")),
        ("Encendido de Luz Delantera Derecha",        inspeccion.get("Sistema Eléctrico [Encendido de luz delantera Derecha]", "")),
        ("Encendido de Luz Delantera Izquierda",      inspeccion.get("Sistema Eléctrico [Encendido de luz delantera Izquierda ]", "")),
        ("Encendido de Direccional Derecha Delantera",inspeccion.get("Sistema Eléctrico [Encendido de luz direccional delantera Derecha]", "")),
        ("Encendido de Direccional Izq. Delantera",   inspeccion.get("Sistema Eléctrico [Encendido de luz direccional delantera Izquierda]", "")),
        ("Encendido de Luz Trasera Derecha",          inspeccion.get("Sistema Eléctrico [Encendido de luz trasera Derecha]", "")),
        ("Encendido de Luz Trasera Izquierda",        inspeccion.get("Sistema Eléctrico [Encendido de luz trasera Izquierda]", "")),
        ("Encendido de Direccional Trasera Derecha",  inspeccion.get("Sistema Eléctrico [Encendido de luz direccional trasera Derecha]", "")),
        ("Encendido de Direccional Trasera Izquierda",inspeccion.get("Sistema Eléctrico [Encendido de luz direccional trasera Izquierda]", "")),
        ("Luces Intermitentes",                       inspeccion.get("Sistema Eléctrico [Luces Intermitentes]", "")),
        ("Luces Altas",                               inspeccion.get("Sistema Eléctrico [Luces Altas]", "")),
        ("Luces Bajas",                               inspeccion.get("Sistema Eléctrico [Luces Bajas]", "")),
        ("Indicadores de Tablero",                    inspeccion.get("Sistema Eléctrico [Indicadores de Tablero]", "")),
        ("Temperatura",                               inspeccion.get("Sistema Eléctrico [Temperatura ]", "")),
        ("Combustible",                               inspeccion.get("Sistema Eléctrico [Combustible]", "")),
        ("Frenos",                                    inspeccion.get("Sistema Eléctrico [Frenos]", "")),
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Accesorios Indispensables", section_style))
    story.append(tabla_estado([
        ("Llanta de Repuesto", inspeccion.get("Accessorios indispensables  [Llanta de repuesto]", "")),
        ("Triángulo",          inspeccion.get("Accessorios indispensables  [Triangulo Inversora]", "")),
        ("Inversora",          inspeccion.get("Accessorios indispensables  [Triangulo Inversora]", "")),
        ("Pipeta",             inspeccion.get("Accessorios indispensables  [Pipeta Gato]", "")),
        ("Gato Hidráulico",    inspeccion.get("Accessorios indispensables  [Hidraulico Exterior]", "")),
        ("Alarma",             inspeccion.get("Accessorios indispensables  [Alarma]", "")),
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Estructura Externa", section_style))
    story.append(tabla_estado([
        ("Puerta Lateral Derecha",               inspeccion.get("Estructura externa  [Puerta lateral derecha]", "")),
        ("Puerta Lateral Izquierda",             inspeccion.get("Estructura externa  [Puerta lateral izquierda]", "")),
        ("Llantas",                              inspeccion.get("Estructura externa  [Llantas]", "")),
        ("Espejos",                              inspeccion.get("Estructura externa  [Espejos]", "")),
        ("Parabrisa",                            inspeccion.get("Estructura externa  [Parabrisas]", "")),
        ("Vidrio Lateral Derecho",               inspeccion.get("Estructura externa  [Vidrio lateral derecho]", "")),
        ("Vidrio Lateral Izquierdo",             inspeccion.get("Estructura externa  [Vidrio lateral izquierdo]", "")),
        ("Vidrio Trasero",                       inspeccion.get("Estructura externa  [Vidrio trasero]", "")),
        ("Puerta trasera o Maletero",            inspeccion.get("Estructura externa  [Puerta trasera o maletero]", "")),
        ("Tapa de Motor",                        inspeccion.get("Estructura externa  [Tapa de Motor]", "")),
        ("Tapicería",                            inspeccion.get("Estructura externa  [Tapiceria]", "")),
        ("Estado de Carrocería (Golpes/Rayones)",inspeccion.get("Estructura externa  [Estado de Carroceria (Golpes/Rayones)]", "")),
    ]))
    story.append(Spacer(1, 20))

    firmas_data = [
        [Paragraph("Revisado por",        label_style),
         Paragraph("Firma de Conductor",  label_style),
         Paragraph("Firma de Supervisor", label_style)],
        [Paragraph("\n\n\n", label_style),
         Paragraph("\n\n\n", label_style),
         Paragraph("\n\n\n", label_style)],
    ]
    t_firmas = Table(firmas_data, colWidths=[5.8*cm]*3)
    t_firmas.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
        ("INNERGRID",     (0,0), (-1,-1), 0.3, colors.HexColor("#CCCCCC")),
        ("BACKGROUND",    (0,0), (-1, 0), HEADER_COLOR),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,1), (-1,-1), 40),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
    ]))
    story.append(t_firmas)

    doc.build(story)
    print(f"✅ PDF generado: {nombre_archivo}")


# ─────────────────────────────────────────────
# CONEXIÓN Y LÓGICA PRINCIPAL
# ─────────────────────────────────────────────

def main():
    # 1. Conexión a Google Sheets
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    creds  = ServiceAccountCredentials.from_json_keyfile_name("credenciales.json", scope)
    client = gspread.authorize(creds)
    sheet  = client.open("Email").sheet1

    # 2. Obtener todos los registros
    registros = sheet.get_all_records()
    if not registros:
        print("⚠️  La hoja está vacía.")
        return

    # 3. Tomar la ÚLTIMA respuesta
    ultima = registros[-1]

    placa = ultima.get("Placa", "SIN_PLACA")
    fecha = (
        ultima.get("Marca temporal", "SIN_FECHA")
        .replace("/", "-").replace(" ", "_").replace(":", "-")
    )

    # 4. Generar PDF
    nombre_pdf = f"CheckList_{placa}_{fecha}.pdf"
    generar_pdf_checklist(ultima, nombre_pdf)

    # 5. Enviar correo con el PDF adjunto
    enviar_correo_checklist(ultima, nombre_pdf)


if __name__ == "__main__":
    main()
    # ... (Mantén todas las importaciones y las funciones _gdrive_url_a_descarga, 
# _descargar_imagenes, enviar_correo_checklist y generar_pdf_checklist igual que antes)

# ... (Mantén todas las importaciones y las funciones de generación de PDF e imágenes igual)

# ─────────────────────────────────────────────
# CONFIGURACIÓN ADICIONAL
# ─────────────────────────────────────────────
CORREO_CENTRAL = "johnyprograma@gmail.com"  # El correo que recibirá el paquete

def enviar_paquete_pdfs(destinatario, lista_pdfs, cantidad_respuestas):
    """
    Envía un único correo electrónico con múltiples archivos adjuntos.
    """
    msg = EmailMessage()
    msg["From"] = GMAIL_REMITENTE
    msg["To"] = destinatario
    msg["Subject"] = f"REPORTE CONSOLIDADO: Últimas {cantidad_respuestas} Inspecciones"
    
    cuerpo = f"""Hola,

Se adjuntan los reportes PDF correspondientes a las últimas {cantidad_respuestas} respuestas recibidas en el sistema de inspección vehicular.

Total de archivos: {len(lista_pdfs)}

---
Generado automáticamente por el Sistema de Gestión Flota.
"""
    msg.set_content(cuerpo)

    # Adjuntar cada PDF generado de la lista
    for ruta_pdf in lista_pdfs:
        if os.path.exists(ruta_pdf):
            with open(ruta_pdf, "rb") as f:
                pdf_data = f.read()
                msg.add_attachment(
                    pdf_data,
                    maintype="application",
                    subtype="pdf",
                    filename=os.path.basename(ruta_pdf)
                )
            print(f"  📎 Agregado al paquete: {os.path.basename(ruta_pdf)}")

    # Enviar vía Gmail SMTP
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(GMAIL_REMITENTE, GMAIL_APP_PASSWORD)
            smtp.send_message(msg)
        print(f"\n✅ ¡ÉXITO! Paquete enviado a {destinatario}")
    except Exception as e:
        print(f"❌ Error al enviar el paquete de correos: {e}")

def limpiar_archivos_antiguos(carpeta=".", dias=30):
    """
    Elimina archivos .pdf en la carpeta especificada que tengan 
    más de 'dias' de antigüedad.
    """
    ahora = time.time()
    limite_segundos = dias * 24 * 60 * 60
    cantidad_eliminados = 0

    print(f"🧹 Iniciando limpieza de archivos con más de {dias} días...")

    for archivo in os.listdir(carpeta):
        # Solo revisamos archivos PDF generados por el script
        if archivo.endswith(".pdf") and archivo.startswith("CheckList_"):
            ruta_completa = os.path.join(carpeta, archivo)
            estatuto = os.stat(ruta_completa)
            
            # Si el tiempo actual menos la fecha de creación es mayor al límite
            if (ahora - estatuto.st_mtime) > limite_segundos:
                try:
                    os.remove(ruta_completa)
                    print(f"  🗑️  Eliminado: {archivo}")
                    cantidad_eliminados += 1
                except Exception as e:
                    print(f"  ⚠️  No se pudo eliminar {archivo}: {e}")

    if cantidad_eliminados > 0:
        print(f"✨ Limpieza completada. Se eliminaron {cantidad_eliminados} archivos antiguos.")
    else:
        print("✅ No se encontraron archivos antiguos para eliminar.")

# ─────────────────────────────────────────────
# LÓGICA PRINCIPAL (MAIN)
# ─────────────────────────────────────────────

def main():
    # 1. Conexión y obtención de datos
    # ... (tu código de gspread igual que antes)
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name("credenciales.json", scope)
    client = gspread.authorize(creds)
    sheet = client.open("Email").sheet1
    registros = sheet.get_all_records()

    if not registros:
        return

    # 2. Procesar las últimas 30 para el correo actual
    ultimas_30 = registros[-30:]
    pdfs_actuales = []

    print(f"Generando {len(ultimas_30)} PDFs para el envío consolidado...")

    for inspeccion in ultimas_30:
        placa = inspeccion.get("Placa", "SIN_PLACA")
        fecha_raw = str(inspeccion.get("Marca temporal", "SIN_FECHA"))
        fecha_limpia = fecha_raw.replace("/", "-").replace(" ", "_").replace(":", "-")
        
        nombre_pdf = f"CheckList_{placa}_{fecha_limpia}.pdf"
        generar_pdf_checklist(inspeccion, nombre_pdf)
        pdfs_actuales.append(nombre_pdf)

    # 3. Enviar el correo con los 30 adjuntos
    if pdfs_actuales:
        enviar_paquete_pdfs(CORREO_CENTRAL, pdfs_actuales, len(ultimas_30))

    # 4. EJECUTAR LIMPIEZA AUTOMÁTICA
    # Esto buscará archivos PDF de ejecuciones de hace más de 30 días y los borrará
    limpiar_archivos_antiguos(dias=30)

if __name__ == "__main__":
    main()
  
