

## Vylepšení Build Promptu: "Oprav, nestavěj od nuly"

### Problém
Aktuální Build Prompt instruuje Lovable k vytvoření zcela nové stránky. Ale cíl je **zachovat stávající design** (barvy, logo, strukturu) a pouze opravit nalezené problémy.

### Řešení
Přepsat sekci instrukcí v `generateBuildPrompt()` tak, aby:

1. **Zahrnula původní obsah stránky** — prompt bude obsahovat `body_text` (markdown prvních 5000 znaků), `headers` a `cta_texts` z DB, takže Lovable vidí skutečnou strukturu stránky
2. **Explicitně instruovala k zachování designu** — barvy, logo, layout, navigace, font styl
3. **Pouze aplikovala opravy** — prompt bude jasně říkat "zachovej strukturu, oprav pouze identifikované problémy"

### Změny v souborech

**`src/pages/AuditResult.tsx`** — úprava funkce `generateBuildPrompt()`:

- Přidat novou sekci **"Struktura původní stránky"** obsahující:
  - `audit.body_text` (markdown obsah)
  - `audit.headers` (nadpisy stránky)
  - `audit.cta_texts` (texty CTA tlačítek)
  - Screenshot URL jako referenci
- Přepsat sekci **"Instrukce pro Lovable"** z "postav novou stránku" na:
  - "Rekonstruuj tuto stránku a zachovej její vizuální identitu"
  - "Dodržuj barevné schéma, logo, celkový layout a navigaci"
  - "Aplikuj POUZE opravy z auditu — neopravuj to, co funguje"
  - "Použij optimalizované texty místo původních tam, kde audit navrhuje změnu"
  - "Zachovej sekce stránky ve stejném pořadí, pokud audit nenavrhuje jinak"

### Struktura výsledného .txt souboru

```text
======================================================================
LOVABLE PROMPT: Vylepši landing page na základě auditu
======================================================================

## Původní stránka
URL, název, screenshot, datum, skóre

## Struktura původní stránky
### Nadpisy
- H1: ...
- H2: ...
### CTA tlačítka
- ...
### Obsah stránky (markdown)
[body_text z DB]

## Skóre podle frameworků
[framework scores + issues]

## Kritické problémy k opravě
[issues + solutions]

## Optimalizace obsahu
[current → optimized verze]

## Celkové shrnutí
[narrative + next steps]

======================================================================
## INSTRUKCE PRO LOVABLE
======================================================================
1. Toto NENÍ nová stránka — rekonstruuj původní a oprav nalezené problémy
2. Zachovej: barevné schéma, logo, layout, navigaci, font styl
3. Zachovej sekce ve stejném pořadí
4. Aplikuj pouze změny navržené v auditu
5. Použij optimalizované texty tam, kde audit navrhuje změnu
6. Zajisti responzivitu (mobile-first)
7. Optimalizuj CTA dle doporučení
8. Dodržuj SEO best practices
9. Screenshot původní stránky slouží jako vizuální reference
```

### Žádné další soubory
Změna je pouze v `src/pages/AuditResult.tsx` — funkce `generateBuildPrompt()`. Data (`body_text`, `headers`, `cta_texts`) už v DB existují a jsou načtena v `audit` objektu.

