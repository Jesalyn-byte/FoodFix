import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

WORKSPACE_DIR = r"c:\Users\USER\OneDrive\Desktop\PUP"
OUTPUT_DIR = r"c:\Users\USER\OneDrive\Desktop\PUP"
DOCX_PATH = os.path.join(OUTPUT_DIR, "FOODFIX_User_Manual.docx")
LOGO_PATH = os.path.join(WORKSPACE_DIR, "assets", "images", "logo.png")
DIAGRAM_DIR = os.path.join(WORKSPACE_DIR, "temp_manual_diagrams")

os.makedirs(DIAGRAM_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. DIAGRAM GENERATION USING MATPLOTLIB
# -------------------------------------------------------------
def generate_architecture_diagram():
    fig, ax = plt.subplots(figsize=(8.5, 4.2), dpi=300)
    ax.set_facecolor('#FFFDF9')
    fig.patch.set_facecolor('#FFFDF9')
    
    # Draw architecture boxes
    boxes = [
        {"title": "Client Tier (PWA & APK)", "subtitle": "React Native (Expo) / Web\nAsyncStorage & Leaflet Maps", "x": 0.05, "y": 0.55, "w": 0.26, "h": 0.35, "color": "#FFF3E0", "edge": "#F25C05"},
        {"title": "Application Layer", "subtitle": "Firebase REST Fallback\nAuth & Role Access Control\nQwen 2.5 Lamion AI API", "x": 0.37, "y": 0.55, "w": 0.26, "h": 0.35, "color": "#FBE9E7", "edge": "#E64A19"},
        {"title": "Cloud Services", "subtitle": "Cloud Firestore (DB)\nCloudinary CDN (Media)\nFirebase Hosting & Push", "x": 0.69, "y": 0.55, "w": 0.26, "h": 0.35, "color": "#EFEBE9", "edge": "#6D4C41"},
        {"title": "User Roles Supported", "subtitle": "Customer  |  Kitchen Staff  |  Delivery Rider  |  Super Admin", "x": 0.05, "y": 0.1, "w": 0.90, "h": 0.32, "color": "#ECEFF1", "edge": "#455A64"}
    ]
    
    for b in boxes:
        rect = patches.FancyBboxPatch((b["x"], b["y"]), b["w"], b["h"],
                                      boxstyle="round,pad=0.03",
                                      facecolor=b["color"], edgecolor=b["edge"],
                                      linewidth=2)
        ax.add_patch(rect)
        ax.text(b["x"] + b["w"]/2, b["y"] + b["h"] - 0.08, b["title"],
                ha='center', va='center', fontsize=11, fontweight='bold', color='#2E1A06', fontfamily='sans-serif')
        ax.text(b["x"] + b["w"]/2, b["y"] + b["h"]/2 - 0.04, b["subtitle"],
                ha='center', va='center', fontsize=9, color='#37474F', fontfamily='sans-serif', linespacing=1.3)

    # Connecting arrows
    ax.annotate('', xy=(0.37, 0.72), xytext=(0.31, 0.72),
                arrowprops=dict(facecolor='#F25C05', edgecolor='#F25C05', width=2, headwidth=8))
    ax.annotate('', xy=(0.69, 0.72), xytext=(0.63, 0.72),
                arrowprops=dict(facecolor='#E64A19', edgecolor='#E64A19', width=2, headwidth=8))
    ax.annotate('', xy=(0.5, 0.42), xytext=(0.5, 0.55),
                arrowprops=dict(facecolor='#455A64', edgecolor='#455A64', width=2, headwidth=8))

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.title("FOODFIX Platform - System & Architecture Overview", fontsize=13, fontweight='bold', color='#2E1A06', pad=15)
    plt.tight_layout()
    diag_path = os.path.join(DIAGRAM_DIR, "arch_diag.png")
    plt.savefig(diag_path, dpi=300)
    plt.close()
    return diag_path

def generate_order_lifecycle_diagram():
    fig, ax = plt.subplots(figsize=(9, 2.6), dpi=300)
    ax.set_facecolor('#FFFDF9')
    fig.patch.set_facecolor('#FFFDF9')
    
    stages = [
        {"title": "1. Pending", "desc": "Order placed\nPayment verified", "x": 0.03, "color": "#FFF3E0", "edge": "#F25C05"},
        {"title": "2. Accepted", "desc": "Kitchen receives\nOrder confirmed", "x": 0.23, "color": "#FFE0B2", "edge": "#FB8C00"},
        {"title": "3. Preparing", "desc": "Chef cooking\nPackaging item", "x": 0.43, "color": "#FFCC80", "edge": "#F57C00"},
        {"title": "4. On the Way", "desc": "Rider assigned\nLive GPS tracking", "x": 0.63, "color": "#FFB74D", "edge": "#EF6C00"},
        {"title": "5. Delivered", "desc": "Received by customer\nFeedback & rating", "x": 0.83, "color": "#C8E6C9", "edge": "#2E7D32"},
    ]
    
    for s in stages:
        rect = patches.FancyBboxPatch((s["x"], 0.15), 0.14, 0.7,
                                      boxstyle="round,pad=0.02",
                                      facecolor=s["color"], edgecolor=s["edge"],
                                      linewidth=2)
        ax.add_patch(rect)
        ax.text(s["x"] + 0.07, 0.68, s["title"],
                ha='center', va='center', fontsize=9.5, fontweight='bold', color='#2E1A06')
        ax.text(s["x"] + 0.07, 0.38, s["desc"],
                ha='center', va='center', fontsize=8, color='#37474F', linespacing=1.2)
                
    for i in range(len(stages) - 1):
        x1 = stages[i]["x"] + 0.14 + 0.005
        x2 = stages[i+1]["x"] - 0.005
        ax.annotate('', xy=(x2, 0.5), xytext=(x1, 0.5),
                    arrowprops=dict(facecolor='#E64A19', edgecolor='#E64A19', width=2, headwidth=6))

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.title("FOODFIX - End-to-End Order Status Lifecycle", fontsize=12, fontweight='bold', color='#2E1A06', pad=12)
    plt.tight_layout()
    diag_path = os.path.join(DIAGRAM_DIR, "order_lifecycle.png")
    plt.savefig(diag_path, dpi=300)
    plt.close()
    return diag_path

def generate_auth_flow_diagram():
    fig, ax = plt.subplots(figsize=(8.5, 3.2), dpi=300)
    ax.set_facecolor('#FFFDF9')
    fig.patch.set_facecolor('#FFFDF9')
    
    steps = [
        {"title": "User Enters Creds", "desc": "Email & Password\nor Registration Data", "x": 0.04, "y": 0.25, "w": 0.18, "h": 0.55, "c": "#FFF3E0", "e": "#F25C05"},
        {"title": "Client Validation", "desc": "Format checks\nOffline fallback check", "x": 0.28, "y": 0.25, "w": 0.18, "h": 0.55, "c": "#FFE0B2", "e": "#FB8C00"},
        {"title": "Firebase Auth", "desc": "REST API Auth\nToken & Refresh Token", "x": 0.52, "y": 0.25, "w": 0.18, "h": 0.55, "c": "#FFCC80", "e": "#F57C00"},
        {"title": "Role Routing", "desc": "Customer: Home\nStaff: Kitchen\nAdmin: Portal", "x": 0.76, "y": 0.25, "w": 0.20, "h": 0.55, "c": "#C8E6C9", "e": "#2E7D32"}
    ]
    
    for s in steps:
        rect = patches.FancyBboxPatch((s["x"], s["y"]), s["w"], s["h"],
                                      boxstyle="round,pad=0.02",
                                      facecolor=s["c"], edgecolor=s["e"],
                                      linewidth=2)
        ax.add_patch(rect)
        ax.text(s["x"] + s["w"]/2, s["y"] + s["h"] - 0.12, s["title"],
                ha='center', va='center', fontsize=9.5, fontweight='bold', color='#2E1A06')
        ax.text(s["x"] + s["w"]/2, s["y"] + s["h"]/2 - 0.06, s["desc"],
                ha='center', va='center', fontsize=8, color='#37474F', linespacing=1.2)

    for i in range(len(steps) - 1):
        x1 = steps[i]["x"] + steps[i]["w"] + 0.005
        x2 = steps[i+1]["x"] - 0.005
        ax.annotate('', xy=(x2, 0.52), xytext=(x1, 0.52),
                    arrowprops=dict(facecolor='#E64A19', edgecolor='#E64A19', width=2, headwidth=6))

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.title("User Authentication & Role-Based Navigation Routing Flow", fontsize=12, fontweight='bold', color='#2E1A06', pad=12)
    plt.tight_layout()
    diag_path = os.path.join(DIAGRAM_DIR, "auth_flow.png")
    plt.savefig(diag_path, dpi=300)
    plt.close()
    return diag_path

# -------------------------------------------------------------
# 2. DOCX BUILDER & XML STYLING UTILITIES
# -------------------------------------------------------------
def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_styled_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(242, 92, 5) # #F25C05
    return p

def add_styled_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(46, 26, 6) # #2E1A06
    return p

def add_styled_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.color.rgb = RGBColor(109, 76, 65) # #6D4C41
    return p

def add_body_paragraph(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Calibri'
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(46, 26, 6)
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(50, 50, 50)
    return p

def add_bullet_point(doc, text, bold_prefix="", level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Calibri'
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(46, 26, 6)
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(50, 50, 50)
    return p

def add_callout_box(doc, title, text, box_type="NOTE"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    border_colors = {
        "NOTE": "F25C05",    # Orange
        "TIP": "27AE60",     # Green
        "WARNING": "E74C3C", # Red
        "SECURITY": "2980B9" # Blue
    }
    bg_colors = {
        "NOTE": "FFF8F2",
        "TIP": "F4FAF6",
        "WARNING": "FDF4F4",
        "SECURITY": "F2F8FD"
    }
    
    b_color = border_colors.get(box_type, "F25C05")
    bg_color = bg_colors.get(box_type, "FFF8F2")
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="{b_color}"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    r_title = p.add_run(f"[{box_type}] {title}\n")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(10)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(
        int(b_color[0:2], 16), int(b_color[2:4], 16), int(b_color[4:6], 16)
    )
    
    r_text = p.add_run(text)
    r_text.font.name = 'Calibri'
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(60, 60, 60)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_styled_table(doc, headers, rows_data, col_widths=None):
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    # Format Header Row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "2E1A06") # Dark Brown
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            
    # Format Data Rows
    for r_idx, row_items in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "FAFAFA" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_items):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(50, 50, 50)
                
    # Set widths if specified
    if col_widths:
        for row in tbl.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)
                
    # Add subtle table borders
    tblPr = tbl._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="E0E0E0"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="BDBDBD"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="EEEEEE"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

# -------------------------------------------------------------
# 3. BUILD COMPLETE USER MANUAL DOCUMENT
# -------------------------------------------------------------
def build_manual():
    print("Generating diagrams...")
    arch_img = generate_architecture_diagram()
    order_img = generate_order_lifecycle_diagram()
    auth_img = generate_auth_flow_diagram()
    
    print("Creating Document...")
    doc = Document()
    
    # Page setup - Margins
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.8)
        sec.right_margin = Inches(0.8)
        
    # --- COVER PAGE ---
    cover_p = doc.add_paragraph()
    cover_p.paragraph_format.space_before = Pt(30)
    cover_p.paragraph_format.space_after = Pt(10)
    cover_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    if os.path.exists(LOGO_PATH):
        doc.add_paragraph().paragraph_format.space_after = Pt(0)
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.add_run().add_picture(LOGO_PATH, width=Inches(2.5))
        
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(14)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("FOODFIX SYSTEM USER MANUAL")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(24)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(242, 92, 5) # Orange
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run("Derick's Food House / PUPLasangpinoy Platform\nOfficial Operations, End-User & Administration Guide")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = RGBColor(70, 70, 70)
    
    # Metadata Table
    meta_headers = ["Document Attribute", "Details & Specifications"]
    meta_rows = [
        ["System Name", "FOODFIX (Derick's Food House / PUPLasangpinoy)"],
        ["Application Version", "Release v4.1.6 (Production Release)"],
        ["Supported Platforms", "Android Mobile Application (.APK) & Progressive Web App (PWA)"],
        ["Production PWA URL", "https://lasangpinoy-mobile.web.app"],
        ["Target Audience", "Customers, Kitchen Staff, Delivery Riders, Store Administrators"],
        ["AI Engine", "Lamion Multimodal Vision & Culinary AI Engine"],
        ["Date of Release", "September 2026"]
    ]
    add_styled_table(doc, meta_headers, meta_rows, col_widths=[2.2, 4.3])
    
    doc.add_page_break()
    
    # --- TABLE OF CONTENTS ---
    add_styled_heading_1(doc, "TABLE OF CONTENTS")
    toc_items = [
        ("I. Introduction", "Platform overview, purpose, core features, and architectural scope"),
        ("II. System Requirements", "Hardware, software, browser, camera, and network connectivity specifications"),
        ("III. Installation & Setup Guide", "Step-by-step guides for Android APK sideloading and PWA installation"),
        ("IV. Logging In & User Authentication", "Account registration, security guidelines, role-based access, and password recovery"),
        ("V. Dashboard Overview", "Customer Home Hub, Kitchen Operations, Delivery Queue, and Executive Admin Metrics"),
        ("VI. Module-by-Module Guide", "Comprehensive walkthrough of all 9 core operational modules"),
        ("     6.1 Menu & Culinary Discovery", "Browsing categories, regional cuisines, dish details, and allergens"),
        ("     6.2 Cart & Ordering Workflow", "Customizations, add-ons, portion adjustments, and order breakdown"),
        ("     6.3 Checkout & Payment Processing", "Cash on Delivery (COD) and GCash e-wallet payment with proof verification"),
        ("     6.4 Live Order & Real-Time GPS Tracking", "Interactive Leaflet live map, real-time rider tracking, and ETA metrics"),
        ("     6.5 Lamion AI Multimodal Culinary Assistant", "Visual dish scanning, nutritional analysis, and custom recipe pairing"),
        ("     6.6 Real-Time Support Chat", "In-app messaging, automated escalation, and customer service communication"),
        ("     6.7 User Profile, Address Book & History", "Saved delivery pins, favorite dishes, and feedback reviews"),
        ("     6.8 Kitchen Staff & Rider Delivery Operations", "Order dispatch workflows, kitchen preparation, and route broadcasting"),
        ("     6.9 Store Management & Admin Suite", "Menu CRUD, live inventory & spoilage logs, GCash verification, and refunds"),
        ("VII. Reports & Analytics", "Sales reports, inventory audit trails, best-sellers, and financial summaries"),
        ("VIII. Troubleshooting & Diagnostic Guide", "Diagnosing network fallbacks, GPS permissions, image uploads, and font rendering"),
        ("IX. Frequently Asked Questions (FAQs)", "Frequently answered inquiries across Customers, Riders, Kitchen, and Admins"),
        ("X. Contact & Technical Support", "Support desk contacts, emergency escalations, bug reporting, and business hours")
    ]
    
    for title, desc in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(f"{title}")
        r1.font.name = 'Calibri'
        r1.font.size = Pt(10)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(46, 26, 6)
        r2 = p.add_run(f"  —  {desc}")
        r2.font.name = 'Calibri'
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = RGBColor(100, 100, 100)

    doc.add_page_break()

    # --- SECTION I: INTRODUCTION ---
    add_styled_heading_1(doc, "I. INTRODUCTION")
    add_body_paragraph(doc, "FOODFIX (Derick's Food House / PUPLasangpinoy) is a state-of-the-art culinary ordering, food delivery management, and inventory logistics platform engineered specifically to celebrate Filipino gastronomic heritage while delivering frictionless, modern operational efficiency.")
    add_body_paragraph(doc, "The platform bridges food enthusiasts and authentic Filipino food establishments through an intuitive mobile app (.APK) and a zero-install Progressive Web App (PWA). Powered by real-time cloud data synchronization, automated order dispatching, live Leaflet GPS delivery route tracking, and the proprietary Lamion Multimodal AI Culinary Assistant, FOODFIX delivers an enterprise-grade digital dining and kitchen management experience.")

    add_styled_heading_2(doc, "1.1 Core System Objectives")
    add_bullet_point(doc, "Provide seamless access to diverse Filipino culinary selections from Luzon, Visayas, and Mindanao.", "Culinary Accessibility: ")
    add_bullet_point(doc, "Enable transparent order preparation and live GPS rider tracking on interactive digital maps.", "Real-Time Transparency: ")
    add_bullet_point(doc, "Deliver multimodal dish recognition, nutritional breakdowns, and instant recipe pairing.", "AI-Powered Culinary Assistance: ")
    add_bullet_point(doc, "Automate kitchen fulfillment, inventory tracking, spoilage logging, and payment verification.", "Operational Streamlining: ")

    add_styled_heading_2(doc, "1.2 Architectural Overview")
    add_body_paragraph(doc, "FOODFIX is structured across three resilient tiers to ensure uninterrupted uptime, offline resilience, and rapid response times:")
    
    # Embed Architecture Diagram
    if os.path.exists(arch_img):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(6)
        p_img.add_run().add_picture(arch_img, width=Inches(6.2))

    add_styled_heading_2(doc, "1.3 Role-Based Permissions Matrix")
    roles_headers = ["User Role", "Primary Responsibilities", "Access Scope & Permissions"]
    roles_data = [
        ["Customer", "Dish discovery, cart management, ordering, payment submission, live tracking, AI chat, customer support chat", "Customer storefront, order tracking, address book, personal order history, Lamion AI"],
        ["Kitchen Staff", "Order fulfillment, order status progression (Pending -> Preparing -> Ready), kitchen inventory monitoring", "Kitchen Order Queue, preparation workflow, stock level views"],
        ["Delivery Rider", "Order pickup, delivery dispatch, live GPS coordinate broadcasting, Proof of Delivery (POD) completion", "Delivery Queue, active route navigation, customer contact, live GPS broadcaster"],
        ["Store Administrator", "Product & category CRUD, pricing, stock adjustments, spoilage write-offs, GCash verification, refunds, analytics", "Complete administrative suite, user role management, financial audit trails, reports"]
    ]
    add_styled_table(doc, roles_headers, roles_data, col_widths=[1.3, 2.6, 2.6])

    # --- SECTION II: SYSTEM REQUIREMENTS ---
    add_styled_heading_1(doc, "II. SYSTEM REQUIREMENTS")
    add_body_paragraph(doc, "FOODFIX is designed for broad device compatibility, supporting modern Android smartphones, tablets, desktop workstations, and web browsers.")

    add_styled_heading_2(doc, "2.1 Hardware Specifications")
    hw_headers = ["Component", "Minimum Requirement", "Recommended Specification"]
    hw_data = [
        ["Processor (CPU)", "Quad-Core 1.5 GHz ARM or x86_64", "Octa-Core 2.0 GHz+ (Qualcomm Snapdragon, MediaTek, Apple Silicon, Intel/AMD)"],
        ["System Memory (RAM)", "2 GB RAM", "4 GB RAM or higher (for smooth multi-tab PWA & map rendering)"],
        ["Internal Storage", "150 MB free disk space", "500 MB free disk space (for offline assets and cached dish media)"],
        ["Display Resolution", "720 x 1280 (HD) screen", "1080 x 2400 (FHD+) or 1920 x 1080 (Desktop display)"],
        ["Camera Hardware", "5 MP Rear Camera (for AI scanning & GCash receipt uploads)", "12 MP Rear Camera with Autofocus and Flash"],
        ["Location Services", "Integrated GPS / AGPS sensor", "High-accuracy GPS with GLONASS / Galileo support"]
    ]
    add_styled_table(doc, hw_headers, hw_data, col_widths=[1.5, 2.5, 2.5])

    add_styled_heading_2(doc, "2.2 Software & Network Requirements")
    sw_headers = ["Platform / Environment", "Supported Versions", "Notes & Constraints"]
    sw_data = [
        ["Android OS", "Android 8.0 (Oreo) to Android 15+", "Supports native APK sideloading with ARM64 and x86_64 architectures"],
        ["Web Browsers (PWA)", "Google Chrome 100+, Safari 15+, Microsoft Edge 100+, Firefox 100+", "Requires Service Worker and Web Storage API support for PWA caching"],
        ["Network Bandwidth", "3G Mobile Data (384 kbps+)", "4G LTE / 5G / High-Speed Wi-Fi (5 Mbps+ for seamless live GPS updates)"],
        ["Security Protocols", "HTTPS / TLS 1.3 encryption", "Mandatory for camera permissions, GPS geolocation, and REST Auth"]
    ]
    add_styled_table(doc, sw_headers, sw_data, col_widths=[1.6, 2.5, 2.4])

    add_callout_box(doc, "Geolocation & Camera Permissions",
                    "To enable real-time delivery tracking and the Lamion AI Multimodal Vision Scanner, users must grant location ('While Using App') and camera permissions when prompted by their device or browser.",
                    "SECURITY")

    # --- SECTION III: INSTALLATION GUIDE ---
    add_styled_heading_1(doc, "III. INSTALLATION GUIDE")

    add_styled_heading_2(doc, "3.1 Android Native Application (.APK) Installation")
    add_bullet_point(doc, "Obtain the official FOODFIX-v4.1.6.apk package from the official release repository or authorized download portal.", "Step 1: Download APK — ", 0)
    add_bullet_point(doc, "Navigate to Settings > Security & Privacy > Install Unknown Apps on your Android device. Toggle allow for your browser or file manager.", "Step 2: Enable Unknown Sources — ", 0)
    add_bullet_point(doc, "Locate the downloaded file in your device's Downloads folder and tap it. Confirm the installation prompts.", "Step 3: Run Installer — ", 0)
    add_bullet_point(doc, "Launch FOODFIX from your home screen or app drawer. Accept requested permissions for Camera, Location, and Notifications.", "Step 4: Grant Permissions — ", 0)

    add_styled_heading_2(doc, "3.2 Progressive Web App (PWA) Zero-Install Guide")
    add_body_paragraph(doc, "FOODFIX can be accessed instantly without app store dependencies via its high-performance PWA:")
    
    pwa_headers = ["Browser / Platform", "Installation Procedure", "User Experience Benefits"]
    pwa_data = [
        ["Google Chrome (Android/PC)", "1. Open https://lasangpinoy-mobile.web.app\n2. Click the 'Install' prompt or tap Menu (three dots) > 'Add to Home screen'\n3. Confirm 'Install App'", "Runs in standalone full-screen window, creates desktop shortcut, enables offline caching."],
        ["Safari (iOS / macOS)", "1. Open https://lasangpinoy-mobile.web.app\n2. Tap the 'Share' icon (square with arrow)\n3. Scroll down and tap 'Add to Home Screen'\n4. Tap 'Add'", "Appears on iOS home screen as a native application without Safari URL bars."],
        ["Microsoft Edge (Windows)", "1. Open https://lasangpinoy-mobile.web.app\n2. Click the App Available icon in address bar or Menu > Apps > 'Install this site as an app'", "Integrates with Windows Start Menu, Taskbar, and notification center."]
    ]
    add_styled_table(doc, pwa_headers, pwa_data, col_widths=[1.5, 2.6, 2.4])

    # --- SECTION IV: LOGGING IN & AUTHENTICATION ---
    add_styled_heading_1(doc, "IV. LOGGING IN & USER AUTHENTICATION")
    add_body_paragraph(doc, "FOODFIX implements secure Role-Based Access Control (RBAC) backed by Firebase Authentication and REST API token persistence.")

    # Embed Auth Flow Diagram
    if os.path.exists(auth_img):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(6)
        p_img.add_run().add_picture(auth_img, width=Inches(6.2))

    add_styled_heading_2(doc, "4.1 Creating a New Customer Account")
    add_bullet_point(doc, "Open FOODFIX and select 'Create Account' from the welcome screen.", "1. Access Registration: ")
    add_bullet_point(doc, "Enter full name, valid email address, active Philippine mobile number (+639XXXXXXXXX), and a secure password.", "2. Enter Details: ")
    add_bullet_point(doc, "Passwords must be at least 6 characters long and contain alphanumeric characters.", "3. Password Criteria: ")
    add_bullet_point(doc, "Tap 'Register'. Upon creation, your customer profile is initialized in Cloud Firestore.", "4. Verification: ")

    add_styled_heading_2(doc, "4.2 Standard Login Procedure")
    add_bullet_point(doc, "Input your registered email address and password into the respective fields.", "1. Enter Credentials: ")
    add_bullet_point(doc, "Tap 'Sign In'. The client authenticates against Firebase Auth REST services.", "2. Authenticate: ")
    add_bullet_point(doc, "The system checks the user's role and automatically routes them to the appropriate portal (Customer Home, Kitchen Queue, Delivery Hub, or Admin Suite).", "3. Role Routing: ")

    add_styled_heading_2(doc, "4.3 Password Reset & Account Recovery")
    add_body_paragraph(doc, "If credentials are misplaced, users can tap 'Forgot Password?' on the login screen. An automated password reset link is delivered to the registered email address with 60-minute token validity.")

    add_callout_box(doc, "Session Persistence & Security",
                    "FOODFIX securely persists authentication tokens using encrypted AsyncStorage on mobile and secure browser LocalStorage on web. Sessions remain active across app restarts until explicit sign-out.",
                    "TIP")

    # --- SECTION V: DASHBOARD OVERVIEW ---
    add_styled_heading_1(doc, "V. DASHBOARD OVERVIEW")
    add_body_paragraph(doc, "The FOODFIX Dashboard adapts dynamically according to the authenticated user's role.")

    add_styled_heading_2(doc, "5.1 Customer Home Hub")
    add_bullet_point(doc, "Displays current promotion banners, festive specials, and seasonal discount offerings.", "Hero Carousel: ")
    add_bullet_point(doc, "Horizontal category chips (Appetizers, Main Dishes, Soups, Desserts, Beverages, Rice Meals).", "Culinary Categories: ")
    add_bullet_point(doc, "Filter dishes authentic to Luzon (e.g., Sisig, Sinigang), Visayas (e.g., Inasal, La Paz Batchoy), and Mindanao (e.g., Rendang, Pyanggang).", "Regional Specialties: ")
    add_bullet_point(doc, "Curated dishes powered by popularity, previous ordering history, and Lamion AI suggestions.", "Recommended for You: ")
    add_bullet_point(doc, "Persistent banner displaying live progress of active orders with direct tap-to-track navigation.", "Active Order Tracker: ")

    add_styled_heading_2(doc, "5.2 Administrative & Operational Dashboard")
    add_body_paragraph(doc, "Store managers and administrators have access to an executive overview:")
    
    dash_headers = ["Metric Card", "Data Displayed", "Operational Action"]
    dash_data = [
        ["Total Revenue", "Gross sales revenue for Today, This Week, and This Month", "Monitors financial pacing against targets"],
        ["Active Orders", "Count of orders currently in 'Pending', 'Preparing', or 'Out for Delivery'", "Allows dispatch prioritization and workload balancing"],
        ["Inventory Alerts", "Dishes/ingredients below minimum safety thresholds (< 5 portions)", "Triggers immediate stock replenishment or menu item pausing"],
        ["GCash Queue", "Number of submitted GCash transactions awaiting manual receipt verification", "Enables one-tap approval or rejection of customer receipts"],
        ["Refund Requests", "Active customer refund applications with reason codes and amounts", "Opens disbursement review queue for administrative sign-off"]
    ]
    add_styled_table(doc, dash_headers, dash_data, col_widths=[1.6, 2.7, 2.2])

    # --- SECTION VI: MODULE-BY-MODULE GUIDE ---
    add_styled_heading_1(doc, "VI. MODULE-BY-MODULE GUIDE")

    add_styled_heading_2(doc, "6.1 Menu & Culinary Discovery")
    add_body_paragraph(doc, "The Menu module allows users to explore the full culinary catalog with rich details:")
    add_bullet_point(doc, "Real-time search querying dish names, descriptions, and ingredients.", "Smart Search Bar: ")
    add_bullet_point(doc, "Quickly isolate specific flavor profiles, vegetarian options, or dietary restrictions.", "Category & Regional Filters: ")
    add_bullet_point(doc, "Tapping any dish opens the high-resolution modal showcasing prep time, calorie estimates, spice level, ingredient list, and allergen notices.", "Dish Detail Modal: ")

    add_styled_heading_2(doc, "6.2 Cart & Smart Ordering Workflow")
    add_bullet_point(doc, "Adjust portion sizes, extra rice, side dishes, and spice levels prior to adding to cart.", "Item Customization: ")
    add_bullet_point(doc, "Increment/decrement item quantities or remove items with one tap.", "Quantity Controls: ")
    add_bullet_point(doc, "Text field for specific kitchen instructions (e.g., 'Separate sauce', 'No onions').", "Special Instructions: ")
    add_bullet_point(doc, "Clear itemized list displaying subtotal, delivery fee, promotional discounts, and final total in Philippine Pesos (PHP).", "Order Summary: ")

    add_styled_heading_2(doc, "6.3 Checkout & Payment Processing")
    add_body_paragraph(doc, "FOODFIX provides two primary payment channels:")
    
    pay_headers = ["Payment Method", "Workflow & Verification Requirements", "Processing Timeline"]
    pay_data = [
        ["Cash on Delivery (COD)", "Customer pays cash directly to the delivery rider upon physical handover of food.", "Instant upon physical handover"],
        ["GCash E-Wallet", "1. Customer scans merchant GCash QR code or copies merchant mobile number\n2. Customer submits 13-digit GCash Reference Number\n3. Customer uploads digital screenshot proof of payment", "Verified by Store Admin within 3-5 minutes"]
    ]
    add_styled_table(doc, pay_headers, pay_data, col_widths=[1.5, 3.2, 1.8])

    add_styled_heading_2(doc, "6.4 Live Order & Real-Time GPS Tracking")
    add_body_paragraph(doc, "FOODFIX utilizes Leaflet interactive mapping and GPS coordinate streaming to provide minute-by-minute visibility:")
    
    # Embed Order Lifecycle Diagram
    if os.path.exists(order_img):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(6)
        p_img.add_run().add_picture(order_img, width=Inches(6.2))

    add_bullet_point(doc, "Interactive Leaflet map displaying store origin, customer delivery pin, and live rider location.", "Visual Map: ")
    add_bullet_point(doc, "Rider mobile device broadcasts latitude/longitude coordinates every 5 seconds to Cloud Firestore.", "Rider GPS Streaming: ")
    add_bullet_point(doc, "Calculated using Haversine distance algorithm based on current rider velocity.", "Dynamic ETA Calculation: ")
    add_bullet_point(doc, "Direct in-app call and chat buttons to communicate with the assigned delivery personnel.", "Direct Communication: ")

    add_styled_heading_2(doc, "6.5 Lamion AI Multimodal Culinary Assistant")
    add_body_paragraph(doc, "The Lamion AI assistant is a custom multimodal artificial intelligence engine developed to enrich the customer culinary experience:")
    add_bullet_point(doc, "Users take or upload a photo of any food dish. Lamion AI identifies the Filipino dish, its traditional origins, and cooking style.", "Multimodal Dish Recognition: ")
    add_bullet_point(doc, "Instant calculation of calories, protein, carbohydrates, fats, and sodium.", "Nutritional & Caloric Breakdown: ")
    add_bullet_point(doc, "Suggests complementary side dishes, dips (sawsawan), and drinks available in the FOODFIX catalog.", "Flavor Pairing Engine: ")
    add_bullet_point(doc, "Provides step-by-step home cooking guidelines and secret culinary tips.", "Recipe & Preparation Assistant: ")

    add_styled_heading_2(doc, "6.6 Real-Time Support Chat")
    add_body_paragraph(doc, "An integrated customer care channel ensuring prompt dispute and inquiry resolution:")
    add_bullet_point(doc, "Two-way instant messaging between customer and store administrative team.", "Live Agent Messaging: ")
    add_bullet_point(doc, "Send screenshots of wrong items, delivery issues, or receipts directly in chat.", "Media Attachments: ")
    add_bullet_point(doc, "Every message includes date/time stamps and read confirmation indicators.", "Full Audit History: ")

    add_styled_heading_2(doc, "6.7 User Profile, Address Book & History")
    add_bullet_point(doc, "Save multiple delivery addresses (Home, Office, Dorm, Campus) with precise GPS coordinates.", "Saved Addresses: ")
    add_bullet_point(doc, "View full history of completed orders with one-tap 'Reorder' functionality.", "Past Order Archive: ")
    add_bullet_point(doc, "Submit 1-to-5 star ratings and written reviews for dishes and delivery service.", "Ratings & Feedback: ")

    add_styled_heading_2(doc, "6.8 Kitchen Staff & Rider Delivery Operations")
    add_bullet_point(doc, "Kitchen screen organizes orders into chronological cards with preparation timers.", "Kitchen Queue Management: ")
    add_bullet_point(doc, "Staff taps 'Accept' to confirm, then 'Start Cooking' to update order state to 'Preparing'.", "One-Tap Status Transitions: ")
    add_bullet_point(doc, "Riders view available pickups, accept routes, and tap 'Start Delivery' to activate automatic GPS broadcasting.", "Rider Route Activation: ")
    add_bullet_point(doc, "Rider captures customer signature or photo upon delivery to close the order lifecycle.", "Proof of Delivery (POD): ")

    add_styled_heading_2(doc, "6.9 Store Management & Admin Suite")
    add_bullet_point(doc, "Create, update, or archive dishes; upload high-resolution images via Cloudinary CDN integration.", "Menu Management (CRUD): ")
    add_bullet_point(doc, "Log daily stock adjustments, restock supplies, and record spoilage/waste with mandatory reason codes and administrative audit trails.", "Inventory & Spoilage Audits: ")
    add_bullet_point(doc, "View submitted GCash receipts alongside transaction IDs to approve valid payments with one tap.", "GCash Verification Hub: ")
    add_bullet_point(doc, "Review customer cancellation requests, approve full or partial refunds, and log disbursement notes.", "Refund Management: ")

    # --- SECTION VII: REPORTS & ANALYTICS ---
    add_styled_heading_1(doc, "VII. REPORTS & ANALYTICS")
    add_body_paragraph(doc, "FOODFIX provides granular reporting tools for store owners and administrative leadership:")

    add_styled_heading_2(doc, "7.1 Standard Executive Reports")
    rep_headers = ["Report Name", "Key Metrics Included", "Frequency & Export Format"]
    rep_data = [
        ["Daily Sales Summary", "Gross revenue, net revenue, COD vs GCash breakdown, total completed orders", "Daily / PDF, CSV, Excel"],
        ["Product Performance Report", "Top 10 best-selling dishes, least ordered items, category revenue distribution", "Weekly / PDF, CSV"],
        ["Inventory & Spoilage Audit", "Stock depletion rates, spoilage loss cost, wasted ingredients by date and reason", "Weekly & Monthly / CSV, PDF"],
        ["Delivery Operations Report", "Average preparation time, average rider transit time, customer satisfaction scores", "Monthly / PDF"],
        ["Refund & Dispute Log", "Total refund disbursements, cancellation reasons, disputed GCash transactions", "Monthly / Excel, PDF"]
    ]
    add_styled_table(doc, rep_headers, rep_data, col_widths=[1.8, 2.9, 1.8])

    add_styled_heading_2(doc, "7.2 Exporting Data")
    add_body_paragraph(doc, "Administrators can navigate to Admin Portal > Reports, select the desired date range filter (Today, Last 7 Days, Month-to-Date, or Custom Range), and tap 'Export CSV' or 'Generate PDF Report' to download formatted data tables.")

    # --- SECTION VIII: TROUBLESHOOTING ---
    add_styled_heading_1(doc, "VIII. TROUBLESHOOTING & DIAGNOSTIC GUIDE")
    add_body_paragraph(doc, "This section outlines systematic solutions for common technical anomalies:")

    trouble_headers = ["Symptom / Issue", "Probable Root Cause", "Recommended Resolution"]
    trouble_data = [
        ["Network Connection Error / 'Using REST Fallback'", "Weak mobile internet or WebSocket handshake block", "The app automatically shifts to REST API mode. Ensure device has active 3G/4G/Wi-Fi connection. Refresh the screen."],
        ["GPS Location Not Updating on Live Map", "Location permission disabled or device GPS in battery saver mode", "Open device Settings > Apps > FOODFIX > Permissions > Location > Select 'Allow only while using the app' and enable 'Precise Location'."],
        ["Image Upload Failed (GCash / AI / Menu)", "Image file exceeds 10 MB or temporary Cloudinary API timeout", "Compress image or capture photo using standard resolution. Ensure camera permissions are granted. Retry upload."],
        ["GCash Payment Still Marked 'Pending'", "Store Administrator has not yet verified the submitted reference number", "Contact store support via the in-app chat with your Order ID and GCash screenshot to request expedited verification."],
        ["PWA Not Prompting 'Add to Home Screen'", "Browser cache conflict or PWA already installed on device", "Clear browser cache for lasangpinoy-mobile.web.app or access browser menu > 'Install App' manually."],
        ["Fonts / Icons Render as Blank Boxes", "Downloaded vector fonts blocked by strict content blocker", "Ensure ad-blockers allow font downloads or switch to official APK build which bundles vector fonts natively."]
    ]
    add_styled_table(doc, trouble_headers, trouble_data, col_widths=[1.8, 2.2, 2.5])

    # --- SECTION IX: FAQS ---
    add_styled_heading_1(doc, "IX. FREQUENTLY ASKED QUESTIONS (FAQS)")

    faqs = [
        ("How do I cancel an order I recently placed?",
         "Orders can be cancelled via the Active Order screen as long as the status is 'Pending'. Once the kitchen marks the status as 'Preparing', cancellations must be approved via the Support Chat."),
        ("What happens if my GCash payment screenshot is rejected?",
         "If the administrator cannot verify the reference number, the order status will indicate 'Payment Verification Failed'. You can re-upload a clear receipt screenshot or switch payment to Cash on Delivery."),
        ("Is Lamion AI available without an internet connection?",
         "Lamion AI requires active network connectivity to process high-resolution visual dish recognition and generate real-time culinary suggestions."),
        ("Can I order from multiple food categories in a single transaction?",
         "Yes. You can add items across Appetizers, Main Dishes, Desserts, and Drinks into a single cart with combined delivery."),
        ("How does the rider live tracking work?",
         "When your order is 'Out for Delivery', the assigned rider's device continuously streams GPS coordinates. You can watch their real-time progress on the interactive map with updated arrival estimates."),
        ("How do staff and riders access their specialized portals?",
         "Staff and rider accounts are provisioned by the Store Administrator with elevated RBAC credentials. Logging in with these accounts automatically opens their respective operational workflows.")
    ]

    for q, a in faqs:
        add_body_paragraph(doc, a, bold_prefix=f"Q: {q}\n")
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # --- SECTION X: CONTACT INFORMATION ---
    add_styled_heading_1(doc, "X. CONTACT & TECHNICAL SUPPORT")
    add_body_paragraph(doc, "For technical inquiries, system defects, account assistance, or administrative onboarding, contact the FOODFIX Support Desk:")

    contact_headers = ["Channel / Department", "Contact Details", "Operating Hours & SLA"]
    contact_data = [
        ["Customer Care & Support Chat", "In-App Live Chat Module (Direct Admin Link)", "Monday to Sunday: 8:00 AM - 10:00 PM (Avg. response < 5 mins)"],
        ["Technical Support & Engineering", "support@derickfoodhouse.com / dev@lasangpinoy.ph", "Monday to Friday: 9:00 AM - 6:00 PM (Response within 24 hours)"],
        ["Emergency Store Operations", "+63 (02) 8888-3449 / +63 917 555 3663", "24/7 Hotline for active delivery & payment emergencies"],
        ["Official PWA Web Portal", "https://lasangpinoy-mobile.web.app", "24/7 Continuous Cloud Availability"],
        ["Research & Development Team", "PUP Lasangpinoy Research Group, Manila, Philippines", "Academic & Technical Inquiries"]
    ]
    add_styled_table(doc, contact_headers, contact_data, col_widths=[1.8, 2.6, 2.1])

    add_callout_box(doc, "Security & Bug Reporting",
                    "If you discover a security vulnerability or critical software defect, please report it immediately to security@lasangpinoy.ph with reproduction steps and device specifications.",
                    "WARNING")

    # Save Document
    doc.save(DOCX_PATH)
    print(f"Document successfully generated at: {DOCX_PATH}")

if __name__ == "__main__":
    build_manual()
