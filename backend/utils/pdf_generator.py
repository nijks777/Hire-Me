from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import io
from typing import Literal

def generate_pdf(
    content: str,
    document_type: Literal["cover_letter", "cold_email"],
    company_name: str = ""
) -> bytes:
    """
    Generate a PDF from text content

    Args:
        content: The text content to convert to PDF
        document_type: Type of document (cover_letter or cold_email)
        company_name: Company name for the filename

    Returns:
        PDF file as bytes
    """

    # Create PDF in memory
    buffer = io.BytesIO()

    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch
    )

    # Container for PDF elements
    elements = []

    # Define styles
    styles = getSampleStyleSheet()

    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor='#2563eb',
        spaceAfter=20,
        alignment=TA_CENTER
    )

    # Body style
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=16,
        alignment=TA_LEFT,
        spaceAfter=12
    )

    # Add title
    if document_type == "cover_letter":
        title = Paragraph("Cover Letter", title_style)
    else:
        title = Paragraph("Cold Email", title_style)

    elements.append(title)
    elements.append(Spacer(1, 0.2 * inch))

    # Split content into paragraphs and add to PDF
    paragraphs = content.split('\n\n')

    for para in paragraphs:
        if para.strip():
            # Clean up the text
            clean_text = para.strip().replace('\n', '<br/>')

            # Create paragraph
            p = Paragraph(clean_text, body_style)
            elements.append(p)
            elements.append(Spacer(1, 0.1 * inch))

    # Build PDF
    doc.build(elements)

    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes

def generate_combined_pdf(
    cover_letter: str,
    cold_email: str,
    company_name: str = ""
) -> bytes:
    """
    Generate a combined PDF with both cover letter and cold email

    Args:
        cover_letter: Cover letter text
        cold_email: Cold email text
        company_name: Company name

    Returns:
        PDF file as bytes
    """

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch
    )

    elements = []
    styles = getSampleStyleSheet()

    # Styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor='#2563eb',
        spaceAfter=20,
        alignment=TA_CENTER
    )

    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#1e40af',
        spaceAfter=12,
        spaceBefore=20
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=16,
        alignment=TA_LEFT,
        spaceAfter=12
    )

    # Main title
    main_title = Paragraph(
        f"Job Application Documents - {company_name}" if company_name else "Job Application Documents",
        title_style
    )
    elements.append(main_title)
    elements.append(Spacer(1, 0.3 * inch))

    # Cover Letter Section
    cl_title = Paragraph("Cover Letter", section_style)
    elements.append(cl_title)

    for para in cover_letter.split('\n\n'):
        if para.strip():
            clean_text = para.strip().replace('\n', '<br/>')
            p = Paragraph(clean_text, body_style)
            elements.append(p)
            elements.append(Spacer(1, 0.1 * inch))

    elements.append(Spacer(1, 0.3 * inch))

    # Cold Email Section
    ce_title = Paragraph("Cold Email", section_style)
    elements.append(ce_title)

    for para in cold_email.split('\n\n'):
        if para.strip():
            clean_text = para.strip().replace('\n', '<br/>')
            p = Paragraph(clean_text, body_style)
            elements.append(p)
            elements.append(Spacer(1, 0.1 * inch))

    # Build PDF
    doc.build(elements)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
