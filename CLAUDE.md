# CLAUDE.md - Pinocchio Bicentenario

## Project Overview

Website for Pinocchio's bicentenary in Sesto Fiorentino, featuring 12 stations with associated podcast episodes. Built with accessibility as a top priority.

## Code Standards

### Language

- **Code**: English for all variable names, function names, comments, and documentation
- **UI Content**: Italian (user-facing text, labels, content)
- **Commit messages**: English

### Naming Conventions

```typescript
// Variables and functions: camelCase
const stationDetails = {};
function getStationById(id: string) {}

// Components: PascalCase
function StationCard() {}
function PodcastPlayer() {}

// Files: kebab-case for utilities, PascalCase for components
// station-utils.ts, StationCard.tsx

// CSS classes: kebab-case or BEM
.station-card {}
.station-card__title {}
```

### Accessibility Requirements (CRITICAL)

This project is made by a disability advocacy association. Accessibility is NOT optional.

**Mandatory standards:**
- WCAG 2.1 Level AA compliance minimum
- Semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`, etc.)
- All images must have descriptive `alt` text
- Full keyboard navigation support
- ARIA labels where needed
- Focus indicators visible
- Color contrast ratio 4.5:1 minimum
- Skip links for main content
- Podcast transcriptions always available

**Testing:**
- Test with screen readers (VoiceOver, NVDA)
- Test keyboard-only navigation
- Run Lighthouse accessibility audits
- Use axe-core for automated testing

### File Structure

```
pinocchio-bicentenario/
├── public/
│   ├── admin/              # Decap CMS configuration
│   │   ├── index.html
│   │   └── config.yml
│   ├── images/             # Station and site images
│   │   └── stations/
│   └── audio/              # Podcast MP3 files
├── src/
│   ├── content/
│   │   ├── stations/       # Station markdown files (stazione-01.md, etc.)
│   │   └── config.ts       # Content collection schema
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro     # Homepage with all 12 stations
│   │   ├── chi-siamo.astro # About page
│   │   └── stazioni/
│   │       ├── index.astro # Station list with timeline
│   │       └── [slug].astro # Dynamic station detail page
│   └── styles/
│       ├── design-tokens.css # CSS custom properties
│       └── global.css        # Global styles
├── CLAUDE.md               # This file
└── README.md
```

### Content Editability

Content must be editable by non-technical users. Preferred approaches:
1. Markdown files with frontmatter (simple, version controlled)
2. Headless CMS (Strapi, Contentful, Sanity)
3. Notion as CMS (via API)

### Component Guidelines

- Keep components small and focused
- Extract reusable logic into hooks
- Use TypeScript for type safety
- Document props with JSDoc or TypeScript interfaces

## Key Features

### Station Page
- Image gallery with alt text and captions
- Podcast player/links (Spotify, Apple Podcasts, etc.)
- Tabbed interface (Details / Transcription)
- "How to get there" section with directions
- Navigation to previous/next station

### Station List
- Timeline visualization
- Brief preview of each station
- Quick access to podcast episodes

### About Page
- Association information
- Project description
- Contact details

## Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run Decap CMS locally (optional)
npx decap-server
```

## Dependencies

- **astro**: Static site generator
- **marked**: Markdown parsing for directions and transcripts

## Implementation Notes

### Gallery Component
- Main gallery with thumbnail navigation
- Lightbox/fullscreen mode on image click
- Keyboard navigation (arrow keys, Escape to close)
- Accessible: ARIA labels, focus management, screen reader announcements

### Tabs Component
- Accessible tabbed interface (WCAG compliant)
- Keyboard navigation (arrow keys, Home/End)
- ARIA roles and states properly set

### Content Fields (YAML frontmatter)
- `directions.instructions`: Supports markdown formatting
- `transcript`: Supports markdown formatting
- Both are parsed with `marked` before rendering
