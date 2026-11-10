---
name: article-image-prompt
description: Write an image-generation prompt (with title text on the image) for an article's featured banner. Use when the user asks for a prompt, banner, featured image or cover for an article in src/content/articles. Reads the article, accepts an optional title, otherwise suggests titles.
---

Produce a ready-to-paste image-generation prompt for the featured image of one article on this site.

## Inputs

- **Article**: the path the user gives, otherwise the file currently open in the IDE (`ide_opened_file` / `ide_selection`). If neither exists, ask which article. Read the whole file, including frontmatter.
- **Title**: optional text the user wants printed on the image. If the user gives one, use it verbatim. If not, follow "Suggest titles" below.

## Suggest titles (only when no title was given)

Offer 3 candidates, each at most 8 words, and recommend one with a one-line reason. Rules:

- Prefer a short main line (4-7 words) that matches what the picture shows. Long page titles do not fit a banner.
- A small kicker line above it is allowed for a series name (e.g. "Spec Driven Development"). Keep the kicker at 3 words or fewer.
- Avoid acronyms the article does not explain, awkward grammar, and titles that clash with an existing external post title.
- Use official product spellings (EventCatalog, EventStorming, AsyncAPI, OpenAPI).
- Then continue and write the full prompt using the recommended title. Do not stop to ask.

## Understand the article first

Before writing, extract:

1. The core contrast or transformation (before/after, many/one, chaos/structure, flow A to B).
2. The 2-4 concrete things worth drawing (artifacts, actors, pipeline steps, diagrams). Prefer things the article names.
3. Domain colour conventions to reuse: Event Storming sticky notes (events orange, commands blue, aggregates yellow, policies pink/lilac).

Compose the picture as one left-to-right story: left = problem or input, right = structured result. Do not copy the layout of a previous banner. Choose a different contrast each time.

## Output format

Start the reply with one line: `Written for: <audience as understood>.` Then output exactly these blocks, in this order:

1. **Prompt**, built from the base below.
2. **Negative prompt / avoid**
3. **Notes**: size, text risk, colour conventions, alt text.

If titles were suggested, put the short title recommendation before the prompt, with reasons in at most 4 bullets.

### Base prompt (adapt the content paragraphs, keep the frame)

```
A clean, flat-vector editorial illustration in a wide 16:9 banner format, on an off-white background with a very faint dot grid. Soft palette: light blue, teal, lavender, one green accent. Rounded cards, thin outlines, subtle shadows, generous whitespace.

Top band: a left-aligned headline in a clean, modern geometric sans-serif, dark navy, on <one or two> lines with the exact text:
<Line 1, small, lighter weight: "KICKER">   (omit when there is no kicker)
<Line 2, large, bold: "TITLE">
No other text anywhere in the image. Spell every word exactly as given, with correct letters<, including hyphens and colons if present>. Keep generous whitespace between the headline and the illustration.

Lower area, left: <the problem / input side, concrete objects and people>.

Lower area, centre: <transition: arrow, funnel, pipeline tiles, robot>.

Lower area, right: <the structured result: code-editor cards, small node graph, diagrams, a person with a green check mark>.

Visual contrast: <one sentence naming the weight contrast>. Calm, confident, technical, modern. Like a premium engineering-blog header.
```

Rules for the content paragraphs:

- Show code only as short coloured lines, never as readable text. Say so when code cards appear.
- Use a friendly minimal robot for the agent and small flat people for humans. One green accent only (the check mark).
- No product logos or brand names. Express products by shape (browser window, repo tile, envelope, folder).

### Fixed negative prompt

```
no other text, no extra words, no misspelled words, no extra letters, no readable text inside the sticky notes or code, no lorem ipsum, no logos, no brand names, no acronyms, no photorealism, no 3D render, no dark background, no neon, no clutter, no gradients on text
```

When the image has no title at all (user asked for text-free), use instead: `no readable text, no words, no letters, no logos, ...` and remove the "Top band" paragraph.

### Closing follow-up line

End every reply with one line telling the user what comes next, in the user's language, for example: "Cuando tengas la imagen, dime el archivo y la paso a WebP 1600x900 (calidad ~82), la dejo en `<carpeta>` con nombre `<slug>-featured.webp` y actualizo `featuredImage` y `featuredImageAlt` del artículo." Fill in the real folder and slug.

### Notes block

- Size: 1600x900, or 1200x630 for Open Graph. Keep the outer 5% free of important details.
- Text risk: name the words most likely to be garbled (hyphenated or compound terms, acronyms). Give the fallback: generate with the top 25% empty ("Keep the top 25% as a calm, empty off-white band for a headline added later") and add the title in Figma, Canva or CSS.
- Colour conventions used.
- Alt text: one sentence that starts with the title and describes the scene. This value goes into the article's `featuredImageAlt`.

## After the image arrives (only when the user asks)

- Save as WebP at 1600x900, quality about 82, with sharp from the repo's `node_modules`: `sharp(png).resize(1600,900,{fit:'cover'}).webp({quality:82,effort:6})`.
- Put it in the article's image folder with a descriptive name ending in `-featured`, and set `featuredImage` and `featuredImageAlt` in the frontmatter. Keep the PNG next to the WebP unless told otherwise.
- For SDD articles use `public/assets/articles/sdd/`.
