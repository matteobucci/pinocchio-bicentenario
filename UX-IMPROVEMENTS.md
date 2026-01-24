# UX Improvements Roadmap

This document tracks UX improvement ideas for the Pinocchio Bicentenario website. The site serves as a companion for a walking tour of 12 stations in Sesto Fiorentino.

**Last updated:** 2026-01-24

---

## Current State

The website has solid foundations:
- Accessible (WCAG 2.1 AA compliant)
- Full keyboard navigation
- Screen reader support
- Timeline-style station list
- Rich station detail pages (gallery, podcast, directions, transcript)
- Prev/Next navigation between stations

**Core problem:** The site feels like a "website about the tour" rather than a "companion during the tour."

---

## Improvement Ideas

### Priority: High

#### 1. Interactive Route Map
**Problem:** No visual overview of the tour route. Users can't see where stations are relative to each other.

**Solution:** Embedded map showing all 12 stations connected by a walking path.

**Requirements:**
- [ ] Numbered markers for each station
- [ ] Walking path connecting stations in order
- [ ] Click marker → mini preview with station name and image
- [ ] Link from marker to station detail page
- [ ] Optional: "You are here" indicator (with geolocation permission)
- [ ] Accessible: keyboard navigable, screen reader announcements

**Technical options:**
- Leaflet.js (free, open source, accessible)
- Mapbox (more features, has free tier)
- Google Maps Embed (familiar, but less customizable)
- Custom illustrated map (artistic, fits Pinocchio theme, but less functional)

**Placement:**
- Homepage: full map as a section
- Station list page: map at top or as toggle view
- Station detail: mini-map showing current position

---

#### 2. QR Code Landing Experience
**Problem:** When visitors scan a QR code at a physical station, they land on the detail page with no context about where they are in the tour.

**Solution:** Enhance the station detail page for "direct entry" scenarios.

**Requirements:**
- [ ] Prominent progress indicator: "Stazione 5 di 12"
- [ ] Visual progress bar or dots showing position in tour
- [ ] Mini-map widget showing current location in route
- [ ] Highlight current station in any timeline/list views
- [ ] More prominent "Continue to next station" CTA
- [ ] Optional: "Welcome! You're at station 5" toast/banner on first visit

**Implementation notes:**
- The CSS for `.timeline-item.current` already exists in `global.css`
- Need to pass current station context and add the class dynamically

---

#### 3. Progress Indicator on Station Pages
**Problem:** On a station detail page, there's no clear sense of progress through the tour.

**Solution:** Add a persistent progress indicator.

**Requirements:**
- [ ] "Stazione X di 12" text prominently displayed
- [ ] Visual progress bar or step indicator
- [ ] Dots/circles showing all 12 stations with current highlighted
- [ ] Clickable to jump to other stations

**Placement options:**
- Below the hero section
- Sticky mini-bar at top of page
- Floating widget (see item 8)

---

### Priority: Medium-High

#### 4. Offline Mode / PWA
**Problem:** Walking tours often happen in areas with poor mobile connectivity. Users may lose access to content mid-tour.

**Solution:** Progressive Web App with offline support.

**Requirements:**
- [ ] Service worker for offline caching
- [ ] Cache all station content, images, and audio files
- [ ] "Download tour for offline use" button
- [ ] Offline indicator when connection is lost
- [ ] Graceful degradation (show cached content)
- [ ] "Add to Home Screen" prompt

**Technical approach:**
- Astro PWA integration or manual service worker
- Workbox for caching strategies
- Cache audio files on-demand (large files)

---

### Priority: Medium

#### 5. Walking Time & Distance Between Stations
**Problem:** Users don't know how long it takes to walk between stations or the total tour duration.

**Solution:** Display walking estimates throughout the site.

**Requirements:**
- [ ] Distance in meters between consecutive stations
- [ ] Estimated walking time (assume ~5 km/h walking speed)
- [ ] Display in "Prosegui verso la stazione" connector on timeline
- [ ] Total tour duration on homepage (e.g., "~2 hours walking tour")
- [ ] Total distance (e.g., "3.5 km total")

**Data source:**
- Calculate from existing coordinates in station frontmatter
- Or manually curate for accuracy (paths may not be straight lines)

---

#### 6. Station Visit Tracking
**Problem:** No way for users to track their progress or remember which stations they've visited.

**Solution:** Local progress tracking with visual feedback.

**Requirements:**
- [ ] "Mark as visited" button on each station
- [ ] Persist visited stations in localStorage
- [ ] Visual indicator on visited stations (checkmark, different color)
- [ ] Progress summary: "You've visited 7 of 12 stations!"
- [ ] Optional: celebration animation when completing all 12
- [ ] Reset/clear progress option

**Privacy:** All data stays in browser, no server tracking.

---

#### 7. Floating Tour Navigator Widget
**Problem:** On long station pages, users lose context of where they are and how to navigate.

**Solution:** A persistent mini-navigation widget.

**Requirements:**
- [ ] Shows current position: "5/12"
- [ ] Quick prev/next station buttons
- [ ] Expand to see mini-map or station list
- [ ] Collapses to minimal size to not obstruct content
- [ ] Can be dismissed/hidden
- [ ] Accessible: keyboard operable, not a focus trap

**Placement:** Fixed position, bottom-right corner (or configurable).

---

#### 8. Enhanced Station List View Options
**Problem:** The timeline view is the only way to see all stations. Some users may prefer different views.

**Solution:** Multiple view options for the station list.

**Requirements:**
- [ ] Timeline view (current) - default
- [ ] Map view - interactive map with all stations
- [ ] Grid view - card grid for quick scanning
- [ ] List view - compact, text-focused
- [ ] View toggle buttons with icons
- [ ] Remember user's preference

---

### Priority: Low-Medium

#### 9. "Start Tour" vs "Jump In" Modes
**Problem:** The site doesn't distinguish between users starting from the beginning vs. joining mid-tour.

**Solution:** Two explicit entry paths.

**Requirements:**
- [ ] "Start from Station 1" - guided linear experience
- [ ] "I'm already on the tour" - show map, let user pick current station
- [ ] QR code entry automatically activates "jump in" mode
- [ ] Different UI emphasis based on mode

---

#### 10. Audio Experience Enhancements
**Problem:** The podcast player is functional but not optimized for the in-person tour experience.

**Solution:** Enhanced audio features for tour context.

**Requirements:**
- [ ] Prompt to play audio when landing via QR code (with consent)
- [ ] Background audio playback (continue playing while browsing)
- [ ] Playback speed controls (1x, 1.25x, 1.5x)
- [ ] Remember playback position if user navigates away
- [ ] Optional: auto-advance to next station's audio when complete
- [ ] Download individual episodes for offline listening

---

#### 11. Nearby Amenities Layer
**Problem:** On longer tours, visitors need practical information (restrooms, cafes, seating).

**Solution:** Amenities information integrated into the experience.

**Requirements:**
- [ ] Amenities markers on the map (different icons)
- [ ] Categories: restrooms, cafes, benches, water fountains
- [ ] Filter/toggle amenities on map
- [ ] Accessibility info for amenities (wheelchair accessible, etc.)

**Data source:** Manual curation or OpenStreetMap data.

---

### Priority: Nice to Have

#### 12. Social Sharing
**Problem:** No easy way to share the tour or progress with others.

**Solution:** Shareable content and progress.

**Requirements:**
- [ ] Share button on station pages
- [ ] Generates shareable card with station image and info
- [ ] "I'm visiting the Pinocchio trail!" social post template
- [ ] Share progress: "I've completed 8/12 stations!"
- [ ] QR code generation for sharing specific stations

---

#### 13. Multi-language Support
**Problem:** The tour may attract non-Italian speaking tourists.

**Solution:** Internationalization (i18n) support.

**Requirements:**
- [ ] Language switcher (IT/EN minimum)
- [ ] Translated UI strings
- [ ] Translated station content (requires content work)
- [ ] Translated podcast episodes (or subtitles/transcripts)
- [ ] URL structure: `/en/stazioni/...` or query param

**Note:** Significant content effort required.

---

#### 14. Weather Integration
**Problem:** It's an outdoor walking tour; weather matters.

**Solution:** Weather awareness in the UI.

**Requirements:**
- [ ] Current weather display (temperature, conditions)
- [ ] Weather-appropriate suggestions ("Bring an umbrella!")
- [ ] Best time to visit recommendations
- [ ] Link to detailed forecast

**API:** OpenWeatherMap or similar free tier.

---

#### 15. Accessibility Page
**Problem:** Footer links to `/accessibilita` but the page doesn't exist yet.

**Solution:** Create dedicated accessibility statement page.

**Requirements:**
- [ ] WCAG compliance statement
- [ ] Accessibility features list
- [ ] Known limitations (if any)
- [ ] How to report accessibility issues
- [ ] Physical accessibility info for each station (wheelchair access, etc.)

---

#### 16. Photo Spots / Instagram Moments
**Problem:** Visitors may want to know the best photo opportunities.

**Solution:** Highlight photo-worthy spots.

**Requirements:**
- [ ] "Best photo spot" marker at select stations
- [ ] Photo tips or suggested angles
- [ ] User-submitted photos gallery (requires moderation)
- [ ] Instagram hashtag promotion

---

#### 17. Gamification / Badges
**Problem:** Could increase engagement and tour completion rates.

**Solution:** Light gamification elements.

**Requirements:**
- [ ] Badges for milestones (first station, halfway, complete)
- [ ] "Tour Champion" certificate on completion
- [ ] Optional: leaderboard for fastest completions (privacy-respecting)
- [ ] Collectible digital stamps for each station

**Caution:** Keep it subtle; the content should be the star.

---

## Quick Wins

Low-effort improvements that can be implemented immediately:

1. **Progress indicator** - Add "Stazione X di 12" to `[slug].astro` hero section
2. **Current station highlighting** - Add `current` class to timeline items (CSS already exists)
3. **Walking distance in connectors** - Show "~5 min (350m)" in "Prosegui verso la stazione"
4. **Total tour info on homepage** - "Un percorso di 3.5 km attraverso 12 tappe (~2 ore)"
5. **Create accessibility page** - `/accessibilita` is linked but doesn't exist

---

## Technical Considerations

### Map Implementation
- **Leaflet.js**: Recommended. Free, accessible, widely used.
- Consider custom map tiles for Pinocchio theming
- Ensure map is keyboard navigable
- Provide text alternative for screen readers

### Performance
- Lazy load map component (not needed on initial render)
- Optimize images further if adding more visual elements
- Service worker caching strategy for offline support

### Data Structure
- Station coordinates already exist in frontmatter
- May need to add: `walkingTimeToNext`, `distanceToNext`, `amenitiesNearby`

---

## Open Questions

1. **Map style**: Interactive functional map vs. illustrated artistic map?
2. **Offline priority**: How critical is offline support for this location?
3. **Gamification**: Does it fit the educational/cultural tone?
4. **Multi-language**: Is there demand from non-Italian visitors?
5. **User research**: Can we observe/interview actual tour participants?

---

## Implementation Phases

### Phase 1: Essential Improvements
- Progress indicator on station pages
- Current station highlighting
- Walking time/distance between stations
- Interactive route map (basic)

### Phase 2: Tour Companion Features
- QR code landing experience
- Floating navigator widget
- Station visit tracking
- Offline mode / PWA

### Phase 3: Enhancements
- View options for station list
- Audio experience improvements
- Nearby amenities
- Accessibility page

### Phase 4: Nice to Have
- Social sharing
- Multi-language support
- Weather integration
- Gamification elements

---

## References

- [Leaflet.js Documentation](https://leafletjs.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Astro PWA Integration](https://docs.astro.build/en/guides/integrations-guide/)
- [OpenStreetMap](https://www.openstreetmap.org/) for amenities data
