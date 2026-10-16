# Nails_beauty: "Свободное окно", zero-base visual rebuild (2026-10-16)

Communicate with Sergey in Russian. Keep progress updates and the final response in Russian.
Code and identifiers stay in English. Visible site copy: RU.
Category: C (commercial booking site; the brand layer is bold, the functional layer is plain).
Repo: Vibecode/Nails_beauty. Visual layer rebuilt from zero; engine kept.

## 0 — Starting point
- 13+ LUMI prompts failed («скучно, ИИшно», «ужаснейший hero», «снова одно и то же»). See skill `references/lumi-antipatterns.md`. Every old visual decision is void: Prata, Tenor, Manrope, beige/oxblood palettes, the droplet, the text-left/photo-right hero, editorial spine, fake-editorial captions.
- Sergey (2026-10-16): «делай с самого нуля, существующий сайт вообще можешь удалить». Decision: delete and rewrite the whole visible site (`src/site/*`, `src/design/*`, `src/styles.css`). KEEP the engine, because live salon demos on zapisvonline.ru/<slug> depend on it: `src/lib/*` (slots, store, selection, push, contact, theme API), `src/data/*`, `src/admin/*`, `src/notify/*`, `server/`, `scripts/build-sites.mjs`, `salons/`, `fixtures/`.
- Product: a reusable template sold to nail salons for 4 000 ₽. It must survive any salon's data (fixtures: sparse, long-name, whatsapp/external booking, ekaterina, nogtevoy-dom) and mediocre client photos.

## 1 — Governance
- Skills: `design-taste-frontend` (taste reviewer, pre-flight), `ui-ux-pro-max` only for narrow UX lookups. Playwright (already in devDeps) for screenshots.
- Design read: commercial booking site for women 20–45 in Krasnoyarsk choosing a salon on their phone, with a confident typographic-product language (not beige editorial), using native CSS + Onest + real work photos. Dials: VARIANCE 6 / MOTION 4 / DENSITY 5.
- Gates: B static hero at 1440×900 and 390×844 with screenshots → D body sections → booking → C motion (light) → E QA (`qa-protocol.md`, fixtures).

## 2 — The one idea: "СВОБОДНОЕ ОКНО"
A woman is choosing where to get her nails done. Every salon shows pretty photos; nobody shows *when you can actually come*. The first screen answers that in display type, from the real slot engine:

**Маникюр / сегодня в 17:30** (time in the accent colour). A tap on it starts the booking with that slot preselected.

Time is the hero visual: huge tabular numerals in Onest ExtraBold. Photos support it as a full-bleed band. This works with any salon's photo quality, which no previous concept did.

Emotional order: 1 "I can go today/tomorrow" 2 "they do nice work" 3 "this looks expensive and clear" 4 "booking takes one minute".

Banned reinterpretations: beige luxury, serif "beauty", droplets or blobs, a text-left/photo-right hero, giant decorative words with no data, ISSUE/№ captions, eyebrows above every section, cards everywhere.

## 3 — Content rules
- Copy is plain and specific. Headline built from data: `{главная услуга} / {сегодня|завтра|в пт, 24 окт} в {HH:MM}`. With no slot in the horizon: «Запись на {N} дней вперёд». In external or messenger mode: «Маникюр и педикюр» + «Запись в DIKIDI/WhatsApp».
- Lead = `studio.heroLead`. Services, prices and masters come from data only. Demo reviews are labelled «пример».
- No em/en-dashes in new copy (rephrase). Use non-breaking spaces after short prepositions (`typo()` from lib/ui).

## 4 — Palette and type
- Presets (keys kept for compatibility, values replaced): `mulberry` → «Красный лак» (bg #EFEFEC, surface #FAFAF8, panel #E3E3DF, ink #151517, accent #C21F32), `taupe` → «Кобальт» (accent #2440B4), `rose` → «Олива» (accent #4E5E28). Cool neutral paper, one saturated pop. A custom studio accent still works through `darkAccent`.
- Type: Onest Variable only. Display 800, tight tracking (-0.045em), lh .9. UI 500/600. Tabular numerals for time and prices.
- Radius system: 14px blocks, pill buttons and chips, photos 14px.

## 5 — Layout (artboard 1440×900, then 390×844)
1. **Header** (64px): studio name (logo if present) · Услуги Работы Мастера Контакты · phone · «Записаться» (accent pill).
2. **Hero**: the giant two-line headline (≤2 lines on desktop); below it a row of slot chips (the next 4 free times + «Другое время»), which half-overlaps the top edge of a full-bleed photo band (~38vh desktop, 280px mobile, `heroPosition*`). Under the band: a utility row with address + route, today's hours, rating if `reviewsSource`. Fits the 900px viewport.
3. **Услуги и цены**: a big typographic price list in two groups (Руки / Педикюр и дополнительно). Rows show title, note, duration, and the price large and tabular. On desktop a hover shows the service photo following the row. A click books that service.
4. **Работы**: a colour swatch filter built from `works[].tone` («подобрать по цвету») + a grid with the featured work large. Tap → viewer with the photo, title, service + price, master, and «Хочу так же» (books service + master).
5. **Мастера**: one row per master. Name in huge display type, role, about, a week strip with working days filled, 3 of their works, «Записаться к {nameDat}». No master photo → works only.
6. **Запись**: steps (услуга → мастер → день → время → контакты) with a sticky summary; logic ported from the old Booking.tsx (createBooking, reminders, .ics, the RemindCard done screen, the mobile book bar).
7. **Отзывы**: the rating source block (only real numbers) + scroll-snap quotes (≤3 lines).
8. **Контакты/подвал**: address in big type, route, hours summary, messengers, phone, demo note.
9. **Mobile sticky bar**: «Ближайшее: сегодня 17:30» + «Записаться».

Section layout families: hero poster / typographic list / filter-grid / name rows / app panel / horizontal snap / big-type footer. No repetition.

## 6 — Motion
Hero lines rise on load (CSS, 60ms stagger), chips stagger in, sections fade-rise once via IntersectionObserver, a price-row hover preview. `prefers-reduced-motion` disables everything. No custom cursor, no scroll hijack.

## 7 — Functional layer
Every button works. Booking modes native, external and messenger all handled. Empty states: no services, no masters, no slots, no works, no reviews. The admin (`#/admin`) keeps working with the same CSS variables (`--accent --ink --paper --ink-2 --ink-3 --line --ease --ease-out --surface --font-heading --bg-2`).

## 8 — Acceptance
- `npm run build` passes; no console errors.
- The hero headline shows the real nearest slot; clicking a chip preselects service/date/time in booking.
- Booking completes to the done screen; .ics works.
- Fixtures render without breakage: sparse, long-name, whatsapp, ekaterina, nogtevoy-dom.
- 320–1920: no horizontal scroll, the CTA is visible on the first screen, no orphan prepositions in headings.
- Taste self-check (14 questions) honestly yes.

## 9 — QA
Screens at 1440×900, 1920×1080, 390×844, 360×640, 768×1024 into `qa/shots/v4/`. Booking flow driven in the real browser.
