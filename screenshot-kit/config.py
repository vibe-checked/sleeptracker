# Per-app settings for the App Store screenshot kit. Edit this file only.
# Run from this folder:  python3 compose.py

APP_NAME    = "SleepTracker"
TAGLINE     = "Your nights, beautifully tracked"
TITLE_SIZE  = 100                       # shrink if the name is long (e.g. 96)
ICON        = "../assets/images/icon.png"  # path to the 1024px app icon (relative to this folder)

RAW_DIR     = "raw"                     # where your raw simulator screenshots live
OUT_DIR     = "../app-store-screenshots"  # final 01..0N land here (upload to App Store Connect)

# Brand — sampled from the app icon (deep navy gradient, cyan/violet/teal rings).
BG_STOPS      = [(22, 32, 77), (11, 18, 48), (5, 8, 15)]  # gradient top->bottom
ACCENT        = (34, 211, 238)          # cyan — bullet check-mark color
HEADLINE_BOLD = None                    # None = white *bold* keywords
SUBTITLE      = (208, 222, 255)         # panel subtitle color
WATERMARK     = (255, 255, 255)         # faint background swirl color

# Hero (screens 1+2)
HERO_SHOT = "today.png"                 # which raw to feature in the spanning hero phone
HERO_SW   = 1125
HERO_TILT = -20
HERO_PX   = 1050
HERO_SPILL = 120                        # spill hero phone across 02->03 (continuous device)
BULLETS = [                             # 4 value props (hero, left of phone)
    "Track with your iPhone — no watch needed",
    "Or sync your Apple Watch sleep",
    "Stages, heart rate, HRV & trends",
    "Free forever — no catch",
]

PANEL_SW = 1150

# Feature panels (screens 3+). One tuple each:
#   (label, headline, raw_filename, "low"|"high", subtitle)
PANELS = [
    ("rings",   "*Sleep* *rings* at a glance",        "rings.png",   "low",  "Duration, quality & deep sleep at a glance"),
    ("track",   "Track with *just* your *iPhone*",     "track.png",   "high", "Uses motion + mic — no Apple Watch required"),
    ("health",  "Syncs your *Apple* *Health*",         "session.png", "low",  "Real sleep stages, heart rate & HRV from your watch"),
    ("explore", "*Months* of trends",                  "explore.png", "high", "Charts, correlations & your best nights"),
    ("tags",    "*Every* night, tagged",               "history.png", "low",  "Caffeine, alcohol, exercise — see what helps you sleep"),
    ("free",    "*Free* forever — no catch",           "explore.png", "high", "No ads · no in-app purchases · no paywall"),
]
