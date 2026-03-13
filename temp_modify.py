from pathlib import Path
path = Path('src/app/api/orders/route.ts')
text = path.read_text()
marker = 'const WORK_END_HOUR   = 16;  // 16:00\n\n'
if marker not in text:
    raise SystemExit('marker not found for helper insertion')
addition = 'const WORK_END_HOUR   = 16;  // 16:00\n\nconst FILE_URL_TTL_SEC = 600;\n\nfunction normalizeFortnoxPdfFilename(orderNumber: string, rawName: string) {\n  const normalized = rawName\n    .normalize("NFKD")\n    .replace(/[\\u0300-\\u036f]/g, "")\n    .replace(/[^a-zA-Z0-9._-]+/g, "-")\n    .replace(/-+/g, "-")\n    .replace(/^-|-$/g, "");\n  const base = normalized || `fortnox-orderbekraftelse-${orderNumber}`;\n  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;\n}\n\n'
text = text.replace(marker, addition)
path.write_text(text)
