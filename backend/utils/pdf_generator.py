"""
EduAllocPro — Deployment Order PDF Generator
Government of Maharashtra letterhead using ReportLab.
Returns bytes suitable for streaming as application/pdf.
"""
import io
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Maharashtra government blue
GOV_BLUE = colors.HexColor("#1A56A0")
GOV_LIGHT_BLUE = colors.HexColor("#E8F0FB")
GOV_ALT_ROW = colors.HexColor("#F5F8FF")
TEXT_DARK = colors.HexColor("#0F172A")
TEXT_MUTED = colors.HexColor("#475569")


def generate_deployment_order_pdf(deployment: dict, order_text: str) -> bytes:
    """
    Generate a Government of Maharashtra deployment order PDF.

    Args:
        deployment: dict with school, teacher, vacancy, scores
        order_text: Gemini-generated 3-paragraph order narrative

    Returns:
        PDF as bytes (application/pdf)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    header_style = ParagraphStyle(
        "Header",
        parent=styles["Normal"],
        fontSize=14,
        fontName="Helvetica-Bold",
        textColor=GOV_BLUE,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    sub_header_style = ParagraphStyle(
        "SubHeader",
        parent=styles["Normal"],
        fontSize=10,
        fontName="Helvetica",
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    story.append(Paragraph("Government of Maharashtra", header_style))
    story.append(Paragraph("School Education and Sports Department", sub_header_style))
    story.append(Paragraph("EduAllocPro — Teacher Deployment Order", sub_header_style))
    story.append(HRFlowable(width="100%", thickness=2, color=GOV_BLUE, spaceAfter=8))

    # ── Reference & Date ──────────────────────────────────────────────────────
    school_id = deployment.get("school_id", "UNKNOWN")
    school_last4 = school_id[-4:] if len(school_id) >= 4 else school_id
    today = datetime.utcnow()
    ref_number = f"REF/EDU/{school_last4}/{today.strftime('%Y%m%d')}"
    issue_date = today.strftime("%d %B %Y")

    ref_style = ParagraphStyle(
        "Ref",
        parent=styles["Normal"],
        fontSize=9,
        fontName="Helvetica",
        textColor=TEXT_MUTED,
    )
    ref_data = [
        [
            Paragraph(f"<b>Reference No.:</b> {ref_number}", ref_style),
            Paragraph(f"<b>Date of Issue:</b> {issue_date}", ref_style),
        ]
    ]
    ref_table = Table(ref_data, colWidths=["50%", "50%"])
    ref_table.setStyle(TableStyle([("ALIGN", (1, 0), (1, 0), "RIGHT")]))
    story.append(ref_table)
    story.append(Spacer(1, 12))

    # ── Summary Table ─────────────────────────────────────────────────────────
    summary_header_style = ParagraphStyle(
        "SummaryHeader",
        parent=styles["Normal"],
        fontSize=10,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )
    summary_cell_style = ParagraphStyle(
        "SummaryCell",
        parent=styles["Normal"],
        fontSize=9,
        fontName="Helvetica",
        textColor=TEXT_DARK,
    )

    def hdr(text: str) -> Paragraph:
        return Paragraph(text, summary_header_style)

    def cell(text: str) -> Paragraph:
        return Paragraph(str(text) if text else "—", summary_cell_style)

    summary_data = [
        [hdr("Field"), hdr("School"), hdr("Teacher")],
        [cell("Name"), cell(deployment.get("school_name", "—")), cell(deployment.get("teacher_name", "—"))],
        [cell("ID / Code"), cell(deployment.get("school_id", "—")), cell(deployment.get("teacher_id", "—")[:8] + "...")],
        [cell("District"), cell(deployment.get("school_district", "Nandurbar")), cell(deployment.get("teacher_district", "—"))],
        [cell("DI Score"), cell(f"{deployment.get('di_score', 0):.1f} / 100"), cell("—")],
        [cell("Vacancy Subject"), cell(deployment.get("vacancy_subject", "—")), cell(deployment.get("qualification", "—"))],
        [cell("Match Score"), cell("—"), cell(f"{deployment.get('match_score', 0):.1f}%")],
        [cell("Retention Score"), cell("—"), cell(f"{deployment.get('retention_score', 0):.1f}%")],
        [cell("DVS Score"), cell("—"), cell(f"{deployment.get('dvs_score', 0):.3f}")],
    ]

    col_widths = [4 * cm, 8 * cm, 6 * cm]
    summary_table = Table(summary_data, colWidths=col_widths)
    summary_table.setStyle(
        TableStyle([
            # Header row
            ("BACKGROUND", (0, 0), (-1, 0), GOV_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            # Alternating rows
            ("BACKGROUND", (0, 2), (-1, 2), GOV_ALT_ROW),
            ("BACKGROUND", (0, 4), (-1, 4), GOV_ALT_ROW),
            ("BACKGROUND", (0, 6), (-1, 6), GOV_ALT_ROW),
            ("BACKGROUND", (0, 8), (-1, 8), GOV_ALT_ROW),
            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 16))

    # ── Order Body Text ───────────────────────────────────────────────────────
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        fontName="Helvetica",
        textColor=TEXT_DARK,
        alignment=TA_JUSTIFY,
        leading=16,
        spaceAfter=10,
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontSize=11,
        fontName="Helvetica-Bold",
        textColor=GOV_BLUE,
        spaceAfter=6,
        spaceBefore=8,
    )

    story.append(Paragraph("DEPLOYMENT ORDER", section_title_style))
    story.append(HRFlowable(width="100%", thickness=1, color=GOV_BLUE, spaceAfter=8))

    # Split order text into paragraphs
    paragraphs = [p.strip() for p in order_text.split("\n\n") if p.strip()]
    for para in paragraphs:
        story.append(Paragraph(para, body_style))

    story.append(Spacer(1, 20))

    # ── Signature Lines ───────────────────────────────────────────────────────
    sig_style = ParagraphStyle(
        "Sig",
        parent=styles["Normal"],
        fontSize=9,
        fontName="Helvetica",
        textColor=TEXT_DARK,
        alignment=TA_CENTER,
    )
    sig_data = [
        [
            Paragraph("_________________________", sig_style),
            Paragraph("_________________________", sig_style),
        ],
        [
            Paragraph("Issuing Officer", sig_style),
            Paragraph("Teacher Consent Signature", sig_style),
        ],
        [
            Paragraph("District Education Officer", sig_style),
            Paragraph(deployment.get("teacher_name", ""), sig_style),
        ],
        [
            Paragraph(f"Nandurbar District", sig_style),
            Paragraph(f"Date: _______________", sig_style),
        ],
    ]
    sig_table = Table(sig_data, colWidths=["50%", "50%"])
    sig_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(sig_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1")))
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        fontName="Helvetica",
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
        spaceBefore=4,
    )
    story.append(Paragraph(
        f"Generated by EduAllocPro v1.0 | Maharashtra Education Department | "
        f"CONFIDENTIAL — Government Use Only | {ref_number}",
        footer_style,
    ))

    doc.build(story)
    return buffer.getvalue()
