"""
Common utilities, configuration, and data pools for Radius seed generators.
Pure Python standard library with zero external dependencies.
"""

import os
import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, List, Optional, Tuple

SEEDS_DIR = Path(__file__).resolve().parent

# Default High-Volume Configurations
NUM_CATEGORIES = 15
NUM_SUPPLIERS = 15
NUM_PRODUCTS = 240
NUM_PREFERRED_MEMBERS = 100
NUM_PURCHASE_ORDERS = 40
NUM_STOCK_TRANSFERS = 30
NUM_TRANSACTIONS = 120
NUM_ONLINE_ORDERS = 80
NUM_PRINT_SERVICES = 13
NUM_PRINT_ORDERS = 50
NUM_CYCLE_COUNTS = 20

# Store & Employee IDs
DEFAULT_STORE_IDS = [1, 2]
ALL_STORE_IDS = [1, 2, 3, 4, 5, 6, 7, 8]  # Matching 01_stores_seed
DEFAULT_EMPLOYEE_IDS = [1, 2, 3, 4]


def escape_sql(val: Any) -> str:
    """Escapes and formats Python values for SQL queries."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val.isoformat()}'"
    # String escaping: replace ' with ''
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"


def write_sql_file(filename: str, content: str) -> Path:
    """Writes SQL content to the seeds directory."""
    out_path = SEEDS_DIR / filename
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    return out_path


# ==============================================================================
# Data Pools
# ==============================================================================

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kevin", "Dorothy", "Brian", "Carol", "George", "Amanda", "Edward", "Melissa",
    "Ronald", "Deborah", "Timothy", "Stephanie", "Jason", "Rebecca", "Jeffrey", "Sharon",
    "Ryan", "Laura", "Jacob", "Cynthia", "Gary", "Kathleen", "Nicholas", "Amy",
    "Eric", "Shirley", "Jonathan", "Angela", "Stephen", "Helen", "Larry", "Anna",
    "Justin", "Brenda", "Scott", "Pamela", "Brandon", "Nicole", "Benjamin", "Emma",
    "Samuel", "Samantha", "Gregory", "Katherine", "Frank", "Christine", "Alexander", "Debra",
    "Raymond", "Rachel", "Patrick", "Catherine", "Jack", "Carolyn", "Dennis", "Janet",
    "Jerry", "Ruth", "Tyler", "Maria", "Aaron", "Heather", "Jose", "Diane",
    "Liam", "Noah", "Oliver", "Lucas", "Ethan", "Chloe", "Zoe", "Sophia", "Maya", "Elena",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
    "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
    "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
    "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
    "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
    "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
    "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza",
    "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers",
    "Tremblay", "Roy", "Gagnon", "Bouchard", "Cote", "Pelletier", "Belanger", "Levesque",
]

COMPANY_NAMES = [
    "Apex Tech Solutions", "Nova Design Studio", "Miller & Associates Legal", "Art Gallery of Ontario",
    "TechCorp Ventures", "Vance Consulting Group", "Green Earth Landscaping", "Apex Dental Clinic",
    "Pacific Coast Logistics", "West Coast Yoga", "Vancouver Bistro & Lounge", "Harbourfront Retailers",
    "Pacific Chiropractic Health", "Whistler Snow Tours", "Studio 9 Architecture", "Japan Consulting Canada",
    "Vancouver Arts Council", "Granville Street Pub", "UBC Research Labs", "West End Artisan Bakery",
    "Brampton Logistics Hub", "Metro Construction Group", "Maple Leaf Financial", "Polaris Media Group",
    "Summit Cloud Services", "Blue Horizon Travel", "Cedar Point Medical", "Northern Lights Energy",
]

CANADIAN_CITIES = [
    ("Toronto", "Ontario", "M5H 1J9"),
    ("Vancouver", "British Columbia", "V6Z 1K3"),
    ("Montreal", "Quebec", "H2Y 2R6"),
    ("Calgary", "Alberta", "T2G 2M6"),
    ("Ottawa", "Ontario", "K1N 9J7"),
    ("Halifax", "Nova Scotia", "B3L 4N9"),
    ("Richmond", "British Columbia", "V6V 1P6"),
    ("Brampton", "Ontario", "L6T 5W4"),
    ("Mississauga", "Ontario", "L5B 2C9"),
    ("Edmonton", "Alberta", "T5J 0N3"),
]

STREET_NAMES = [
    "King Street West", "Granville Street", "Saint-Jean Street", "Macleod Trail",
    "Rideau Street", "Mumford Road", "Supply Way", "Logistics Drive", "Bay Street",
    "Queen Street East", "University Avenue", "Burrard Street", "West Georgia Street",
    "Robson Street", "Yonge Street", "Front Street", "Wellington Street", "Jasper Avenue",
]

SUPPLIERS_LIST = [
    {"name": "Domtar Paper Supply", "email": "orders@domtarpaper.ca", "phone": "1-800-555-0101", "lead_time": 3},
    {"name": "Xerox Canada Commercial", "email": "supply@xerox.ca", "phone": "1-800-555-0102", "lead_time": 4},
    {"name": "3M Commercial Solutions", "email": "commercial@3mcanada.ca", "phone": "1-800-555-0103", "lead_time": 5},
    {"name": "Logitech Canada Distribution", "email": "sales@logitechdistribution.ca", "phone": "1-800-555-0104", "lead_time": 4},
    {"name": "Fellowes Brands Canada", "email": "fulfillment@fellowes.ca", "phone": "1-800-555-0105", "lead_time": 6},
    {"name": "Avery Products North America", "email": "b2b@averyna.com", "phone": "1-800-555-0106", "lead_time": 3},
    {"name": "Bic Consumer Products", "email": "orders@bicworld.ca", "phone": "1-800-555-0107", "lead_time": 5},
    {"name": "ACCO Brands Canada", "email": "supplychain@accobrands.ca", "phone": "1-800-555-0108", "lead_time": 4},
    {"name": "Newell Brands Distribution", "email": "orders@newellbrands.ca", "phone": "1-800-555-0109", "lead_time": 7},
    {"name": "Canon Canada Business Solutions", "email": "support@canonbusiness.ca", "phone": "1-800-555-0110", "lead_time": 5},
    {"name": "Brother International Canada", "email": "orders@brother.ca", "phone": "1-800-555-0111", "lead_time": 4},
    {"name": "Epson Commercial America", "email": "sales@epsoncommercial.com", "phone": "1-800-555-0112", "lead_time": 6},
    {"name": "Sony Electronics Canada", "email": "b2b@sony.ca", "phone": "1-800-555-0113", "lead_time": 5},
    {"name": "Belkin International Canada", "email": "enterprise@belkin.ca", "phone": "1-800-555-0114", "lead_time": 3},
    {"name": "Rubbermaid Commercial Products", "email": "orders@rubbermaidcommercial.ca", "phone": "1-800-555-0115", "lead_time": 4},
]

CATEGORIES_LIST = [
    "Office Supplies",
    "Paper & Stationery",
    "Ink & Toner",
    "Technology & Electronics",
    "Desk Accessories",
    "Breakroom & Cleaning",
    "Furniture & Lighting",
    "Mailing & Shipping Supplies",
    "School & Art Supplies",
    "Printers & Scanners",
    "Audio & Headphones",
    "Storage & Organization",
    "Cables & Adapters",
    "Computer Peripherals",
    "Presentation & Boards",
]

CATEGORY_PRODUCTS = {
    1: [  # Office Supplies
        ("Standard Heavy Duty Stapler", "All-metal construction stapler up to 30 sheets", "Staples", 0.45, 14.99),
        ("Retractable Ballpoint Pens (12-Pack)", "Medium 1.0mm smooth writing black ink", "Bic", 0.15, 6.99),
        ("Gel Ink Rollerball Pens (8-Pack)", "0.7mm quick drying assorted gel ink", "Pilot", 0.18, 12.49),
        ("Assorted Paper Clips (500 Count)", "Vinyl coated rust resistant clips with tub", "Staples", 0.35, 4.99),
        ("Medium Binder Clips (24-Pack)", "5/8-inch capacity tempered steel clips", "ACCO", 0.20, 5.49),
        ("Chisel Tip Highlighters (5-Pack)", "Fluorescent vibrant non-toxic assorted colors", "Sharpie", 0.12, 6.29),
        ("Correction Tape Dispensers (4-Pack)", "Tear resistant white dry line tape", "Tipp-Ex", 0.10, 8.99),
        ("Titanium Heavy Duty Scissors 8-Inch", "Ergonomic soft grip contoured handle", "Westcott", 0.22, 11.99),
    ],
    2: [  # Paper & Stationery
        ("Multi-Purpose Copy Paper (500 Sheets)", "Letter size 20lb 92 bright standard ream", "Domtar", 2.25, 8.99),
        ("Premium Bright White Laser Paper (500 Sheets)", "Letter size 28lb ultra smooth finish", "Hammermill", 2.60, 14.50),
        ("Heavyweight White Cardstock (250 Sheets)", "Letter size 65lb cover stock cardstock", "Mohawk", 2.10, 16.99),
        ("College Ruled Spiral Notebook (3-Subject)", "150 perforated sheets with pocket dividers", "Five Star", 0.55, 7.49),
        ("Legal Writing Pads (12-Pack)", "Canary yellow 8.5x11.75 inch 50 perforated sheets", "Staples", 1.80, 15.99),
        ("Pastel Colored Copy Paper (500 Sheets)", "Assorted pastel rainbow pack 20lb paper", "Domtar", 2.25, 12.99),
        ("Executive Hardcover Journal Notebook", "Dotted grid 192 numbered pages with pen loop", "Leuchtturm", 0.40, 21.99),
        ("Self-Stick Yellow Notes 3x3 (12-Pack)", "100 sheets per pad strong adhesive notes", "Post-it", 0.65, 18.50),
    ],
    3: [  # Ink & Toner
        ("High Yield Black Laser Toner Cartridge", "Estimated yield up to 3000 pages", "HP", 0.95, 89.99),
        ("High Yield Cyan Laser Toner Cartridge", "Estimated yield up to 2300 pages", "HP", 0.90, 94.99),
        ("High Yield Magenta Laser Toner Cartridge", "Estimated yield up to 2300 pages", "HP", 0.90, 94.99),
        ("High Yield Yellow Laser Toner Cartridge", "Estimated yield up to 2300 pages", "HP", 0.90, 94.99),
        ("Standard Black Inkjet Cartridge (2-Pack)", "Smudge resistant pigment ink for clear text", "Canon", 0.30, 42.99),
        ("Tri-Color High Capacity Inkjet Cartridge", "Vivid photo colors and sharp graphic output", "Canon", 0.25, 49.99),
        ("Drum Unit Replacement Cartridge", "Long life drum unit rated for 30,000 pages", "Brother", 1.20, 119.99),
        ("DocuColor Production Black Toner", "High output commercial toner 34k pages", "Xerox", 1.10, 139.99),
    ],
    4: [  # Technology & Electronics
        ("Wireless Multi-Device Optical Mouse", "Quiet clicks 2.4GHz USB and Bluetooth 5.0", "Logitech", 0.15, 29.99),
        ("Ergonomic Full-Size Wireless Keyboard", "Padded wrist rest with curved keyframe layout", "Logitech", 0.85, 69.99),
        ("1080p Full HD Pro Streaming Webcam", "Stereo microphones with auto light correction", "Logitech", 0.35, 79.99),
        ("7-in-1 USB-C Multi-Port Hub Adapter", "4K HDMI 100W PD SD card reader and USB 3.0", "Anker", 0.20, 45.99),
        ("Ultra Dual USB-C Flash Drive 128GB", "High speed 150MB/s USB 3.1 Type-A and Type-C", "SanDisk", 0.05, 24.99),
        ("Rugged Portable External SSD 1TB", "Drop proof NVMe solid state drive up to 1050MB/s", "SanDisk", 0.18, 129.99),
        ("12-Outlet Surge Protector Power Strip", "4320 Joules protection with 8ft heavy duty cord", "Belkin", 0.90, 39.99),
        ("Fast Charge Power Bank 20000mAh", "65W USB-C Power Delivery laptop portable battery", "Anker", 0.45, 64.99),
    ],
    5: [  # Desk Accessories
        ("Mesh Desk Organizer Caddy with Drawer", "6 compartments for pens notes and stationery", "Staples", 0.60, 19.99),
        ("Crystal Clear Acrylic Pencil Holder", "Thick weighted non-slip bottom organizer", "Avery", 0.25, 9.99),
        ("Stackable Front-Loading Letter Tray (2pk)", "Durable steel wire mesh paper organizer", "Fellowes", 0.70, 16.99),
        ("Adjustable Aluminum Laptop Riser Stand", "Foldable heat dissipation ergonomic stand", "Fellowes", 0.80, 34.99),
        ("Ergonomic Memory Foam Mouse Pad with Rest", "Anti-skid rubber base pressure relieving cushion", "Fellowes", 0.30, 14.99),
        ("Dual-Sided Waterproof Leather Desk Pad", "36x20 inch PU leather mousepad surface", "Staples", 0.50, 22.99),
        ("Steel Under-Desk Cable Management Tray", "No-drill clamp-on wire organizer rack", "Fellowes", 1.10, 29.99),
        ("Weighted Desktop Tape Dispenser", "Non-slip rubber base for one-handed dispensing", "Scotch", 0.85, 11.49),
    ],
    6: [  # Breakroom & Cleaning
        ("Disinfecting Wipes Citrus (3-Pack, 225ct)", "Kills 99.9% of bacteria and viruses", "Clorox", 1.80, 15.99),
        ("Multi-Surface Antibacterial Spray 32oz", "Fresh scent streak-free cleaning formula", "Lysol", 1.10, 6.49),
        ("Premium 2-Ply Paper Towels (12 Rolls)", "Ultra absorbent select-a-size white rolls", "Bounty", 2.80, 24.99),
        ("Moisturizing Hand Sanitizer with Pump 1L", "70% ethyl alcohol hospital grade formula", "Purell", 1.05, 12.99),
        ("Dark Roast Whole Bean Coffee 2.5lb", "100% Arabica rich bold roast beans", "Starbucks", 1.20, 22.99),
        ("Keurig Single-Serve K-Cup Pods (48-Pack)", "Breakfast blend medium roast coffee pods", "Timothy's", 0.90, 31.99),
        ("Heavy-Duty Contractor Trash Bags 42 Gal", "Box of 50 puncture resistant black bags", "Glad", 3.20, 28.99),
        ("Eco-Friendly Compostable Paper Cups 12oz", "Pack of 100 heat resistant hot drink cups", "Dixie", 0.85, 14.99),
    ],
    7: [  # Furniture & Lighting
        ("Ergonomic Mesh High-Back Office Chair", "Adjustable lumbar support 3D armrests & tilt", "Staples", 16.50, 249.99),
        ("Executive Bonded Leather Manager Chair", "Thick foam padded seat with waterfall edge", "Staples", 18.20, 299.99),
        ("Motorized Electric Standing Desk (55x28)", "Dual motor preset digital controller oak top", "Fellowes", 32.00, 449.99),
        ("Mobile Steel 3-Drawer Locking File Cabinet", "Anti-tilt wheels fits letter and legal files", "Fellowes", 19.50, 169.99),
        ("Dimmable LED Architect Desk Lamp with USB", "Touch control 5 color modes auto timer clamp", "BenQ", 1.40, 59.99),
        ("Ergonomic Anti-Fatigue Floor Standing Mat", "3/4 inch high density foam non-slip beveled edge", "Fellowes", 2.10, 49.99),
        ("Clamp-On Dual Monitor Articulating Gas Arm", "Supports up to 32-inch screens with VESA mount", "Fellowes", 4.50, 89.99),
        ("Memory Foam Ergonomic Lumbar Support Pillow", "Breathable mesh cover with adjustable strap", "Fellowes", 0.75, 29.99),
    ],
    8: [  # Mailing & Shipping Supplies
        ("Kraft Bubble Mailers #0 (6x10, 25-Pack)", "Self-seal water resistant protective envelopes", "Avery", 0.45, 14.99),
        ("Poly Bubble Mailers #5 (10.5x16, 25-Pack)", "Lightweight waterproof tear-proof mailers", "Avery", 0.85, 21.99),
        ("Heavy Duty Shipping Packaging Tape (6 Rolls)", "Strong solvent-free adhesive with dispenser", "Scotch", 1.20, 19.99),
        ("Air Bubble Cushioning Wrap 12in x 100ft", "Perforated every 12 inches for easy tear", "Scotch", 1.10, 16.49),
        ("Corrugated Shipping Boxes 12x12x12 (10-Pack)", "200lb test single-wall ECT-32 kraft boxes", "Staples", 4.20, 27.99),
        ("Direct Thermal Shipping Labels 4x6 (500ct)", "Commercial grade roll for thermal printers", "Avery", 1.30, 18.99),
        ("Biodegradable Packing Peanuts (1.5 Cu Ft)", "Static-free water soluble loose fill foam", "Staples", 0.95, 15.49),
        ("Self-Adhesive Packing List Envelopes (100ct)", "Clear waterproof pouch for invoices", "Staples", 0.40, 12.99),
    ],
    9: [  # School & Art Supplies
        ("Premium Colored Pencils Set (36 Colors)", "Soft core break resistant artist quality pencils", "Prismacolor", 0.45, 24.99),
        ("Fine Point Permanent Markers (24 Assorted)", "Quick drying fade resistant vibrant alcohol ink", "Sharpie", 0.35, 19.99),
        ("Heavyweight Construction Paper (100 Sheets)", "9x12 inch assorted vibrant holiday colors", "Crayola", 0.90, 8.49),
        ("Artist Studio Stretched Canvas (8x10, 5-Pack)", "100% cotton triple primed acid-free canvas", "Winsor & Newton", 1.20, 17.99),
        ("Precision Metal Compass & Geometry Set", "10-piece drafting tools with shatterproof case", "Staedtler", 0.30, 11.99),
        ("Spiral Bound Mixed Media Sketchbook 9x12", "60 sheets 98lb heavy textured acid-free paper", "Strathmore", 0.70, 13.99),
        ("Acrylic Paint Studio Set (24 Colors, 22ml)", "Rich pigment high viscosity non-toxic paints", "Liquitex", 1.10, 26.99),
        ("Non-Toxic Washable Glue Sticks (12-Pack)", "Purple formula goes on purple dries clear", "Elmer's", 0.40, 9.49),
    ],
    10: [  # Printers & Scanners
        ("Wireless Monochrome Duplex Laser Printer", "Print speed up to 36 ppm with mobile printing", "Brother", 7.80, 189.99),
        ("All-in-One Wireless Color EcoTank Printer", "Cartridge-free ink tank print copy scan system", "Epson", 6.50, 299.99),
        ("High-Speed Sheetfed Duplex Document Scanner", "50-sheet ADF scans up to 35 ppm double sided", "Canon", 3.20, 349.99),
        ("Commercial Direct Thermal 4x6 Label Printer", "High speed 150mm/s barcode and shipping printer", "Zebra", 2.10, 229.99),
        ("Wireless Color Photo All-in-One Inkjet", "Auto 2-sided borderless photo printing", "Canon", 5.40, 149.99),
        ("Compact Mobile Wireless Document Scanner", "USB powered single pass portable scanner", "Epson", 0.95, 129.99),
        ("Heavy Duty Network Enterprise Laser Printer", "Up to 50 ppm with 650 sheet total tray capacity", "HP", 14.50, 549.99),
        ("Flatbed Photo & Document Scanner with Film", "4800 x 9600 dpi resolution with LED light", "Epson", 2.80, 199.99),
    ],
    11: [  # Audio & Headphones
        ("Wireless Active Noise Cancelling Headphones", "Bluetooth 5.2 with 35hr battery and quick charge", "Sony", 0.45, 199.99),
        ("Stereo USB Call Center Headset with Mic", "Noise cancelling microphone and in-line controls", "Logitech", 0.25, 49.99),
        ("Bluetooth Conference Speakerphone with 360 Mic", "Omnidirectional voice pickup echo cancellation", "Anker", 0.35, 99.99),
        ("True Wireless Bluetooth Earbuds with ANC", "IPX5 water resistance with wireless charging case", "Soundcore", 0.12, 69.99),
        ("USB Studio Condenser Microphone for PC", "Cardioid polar pattern with pop filter and arm", "Audio-Technica", 0.90, 89.99),
        ("Compact Multimedia Stereo Speakers 2.0", "10W peak power with 3.5mm input and headphone jack", "Logitech", 0.80, 34.99),
        ("Heavy Duty Aluminum Headphone Stand", "Non-slip weighted base with cable holder notch", "Avery", 0.40, 19.99),
        ("Gold-Plated 3.5mm Aux Audio Cable (6ft)", "Braided nylon shielding tangle-free male to male", "Belkin", 0.08, 9.99),
    ],
    12: [  # Storage & Organization
        ("Heavy Duty Clear Storage Tote with Lid 18 Gal", "Stackable impact resistant latching container", "Rubbermaid", 2.40, 19.99),
        ("Heavy Duty Banker Record File Storage Box (8pk)", "Double wall bottom and ends for stacking strength", "Fellowes", 4.10, 34.99),
        ("Portable Latching File Box with Handle", "Accommodates letter size hanging folders", "Staples", 1.30, 18.99),
        ("Stackable 3-Drawer Storage Desktop Chest", "Clear pull out drawers for office accessories", "Iris", 1.10, 16.99),
        ("Reinforced Hanging File Folders Letter (25pk)", "1/5-cut adjustable tabs and label inserts", "Pendaflex", 1.05, 15.49),
        ("Heavy Duty 5-Shelf Steel Wire Rack (48x18x72)", "Commercial grade NSF certified 350lb per shelf", "Staples", 24.00, 149.99),
        ("Interlocking Drawer Organizer Bins (8-Piece)", "Assorted modular sizes for desk drawers", "Avery", 0.50, 12.99),
        ("Clear Heavyweight Document Poly Envelopes (10pk)", "Side load string-tie closure waterproof folders", "Avery", 0.35, 11.49),
    ],
    13: [  # Cables & Adapters
        ("Ultra High Speed 8K HDMI 2.1 Cable (6ft)", "48Gbps braided nylon eARC HDR 4K@120Hz support", "Belkin", 0.15, 19.99),
        ("Braided USB-C to USB-C 100W Fast Charge Cable (6ft)", "Supports 5A fast charging and 480Mbps transfer", "Anker", 0.10, 14.99),
        ("Cat6 Snagless Ethernet Patch Cable (25ft)", "Gigabit 550MHz RJ45 networking cable blue", "Belkin", 0.35, 16.49),
        ("Aluminum USB-C to 4K HDMI Adapter", "Plug and play 4K@60Hz video converter dongle", "Anker", 0.08, 21.99),
        ("MFi Certified Lightning to USB-C Cable (6ft)", "Durable silicone high speed iPhone sync cable", "Anker", 0.09, 17.99),
        ("65W GaN Dual Port USB-C Wall Fast Charger", "Foldable compact brick for laptops and phones", "Anker", 0.18, 39.99),
        ("Heavy Duty 3-Prong Extension Cord (15ft)", "16 AWG 13A indoor grounded vinyl power cord", "Belkin", 0.70, 18.99),
        ("USB 3.0 to Gigabit Ethernet Adapter", "Aluminum network adapter for laptops without RJ45", "TP-Link", 0.09, 22.99),
    ],
    14: [  # Computer Peripherals
        ("27-Inch QHD IPS Frameless Monitor (2560x1440)", "75Hz AMD FreeSync height adjustable stand HDMI/DP", "Dell", 5.80, 249.99),
        ("24-Inch Full HD IPS ComfortView Monitor", "1080p anti-glare ultrathin bezel VESA mountable", "Dell", 4.10, 159.99),
        ("Wireless Ergonomic Trackball Mouse", "Sculpted thumb control with precision scroll wheel", "Logitech", 0.22, 59.99),
        ("Wireless Multi-Device Silent Keyboard", "Slim low profile keys with numeric keypad", "Logitech", 0.65, 49.99),
        ("Triple Display USB-C Laptop Docking Station", "12-in-1 dock with dual HDMI DP 100W PD ethernet", "Anker", 0.85, 179.99),
        ("Laptop Cooling Pad with 5 Quiet Fans", "Dual USB ports ergonomic height angle stand up to 17\"", "Kootek", 0.95, 29.99),
        ("Removable Privacy Screen Filter for 24\" Monitor", "Anti-glare blue light filter 16:9 aspect ratio", "3M", 0.25, 69.99),
        ("External Ultra-Slim USB 3.0 DVD-RW Drive", "High speed CD/DVD burner plug and play", "LG", 0.30, 39.99),
    ],
    15: [  # Presentation & Boards
        ("Magnetic Dry Erase Whiteboard (36x24 Silver)", "Aluminum frame with marker tray and mounting kit", "Quartet", 2.80, 39.99),
        ("Natural Cork Bulletin Board (36x24 Oak Frame)", "Self-healing thick cork backing with wall hardware", "Quartet", 2.40, 34.99),
        ("Low Odor Dry Erase Chisel Tip Markers (8-Pack)", "Vibrant quick drying ink with magnetic eraser", "Expo", 0.28, 12.99),
        ("Whiteboard Cleaner Spray 8oz with Microfiber", "Removes ghosting marker shadows and grease", "Expo", 0.35, 7.99),
        ("Flip Chart Presentation Easel Pad (2-Pack)", "25x30 inch bleed-proof self-stick white paper 50ct", "Post-it", 2.60, 44.99),
        ("Heavy Duty Aluminum Telescoping Presentation Easel", "Adjustable height up to 66 inches non-skid feet", "Quartet", 1.80, 39.99),
        ("Wireless Laser Presentation Pointer Remote", "100ft range with intuitive slideshow control buttons", "Logitech", 0.12, 49.99),
        ("Heavy Duty Tri-Fold Presentation Board (36x48)", "Corrugated white display board for science projects", "Elmer's", 0.85, 11.99),
    ],
}


def random_phone(area_code: Optional[str] = None) -> str:
    """Generates a realistic Canadian formatted phone number."""
    if not area_code:
        area_code = random.choice(["416", "647", "604", "778", "514", "403", "613", "902"])
    exchange = random.randint(200, 999)
    subscriber = random.randint(1000, 9999)
    return f"{area_code}-{exchange:03d}-{subscriber:04d}"


def random_email(first: str, last: str, domain: Optional[str] = None) -> str:
    """Generates a clean email address from names."""
    clean_first = first.lower().replace(" ", "").replace("'", "")
    clean_last = last.lower().replace(" ", "").replace("'", "")
    if not domain:
        domain = random.choice(["gmail.com", "outlook.com", "yahoo.ca", "apextech.io", "novadesign.ca", "rogers.com", "bell.net"])
    sep = random.choice([".", "", "_"])
    num = random.choice(["", str(random.randint(1, 99))])
    return f"{clean_first}{sep}{clean_last}{num}@{domain}"


def random_date(start_days_ago: int = 365, end_days_ago: int = 0) -> date:
    """Returns a random date within an interval."""
    days = random.randint(end_days_ago, start_days_ago)
    return date.today() - timedelta(days=days)


def random_timestamp(start_days_ago: int = 30, end_days_ago: int = 0) -> datetime:
    """Returns a random datetime within an interval."""
    total_seconds = (start_days_ago - end_days_ago) * 86400
    offset_seconds = random.randint(0, total_seconds)
    dt = datetime.now() - timedelta(days=end_days_ago, seconds=offset_seconds)
    return dt.replace(microsecond=0)
