export interface VenueReference {
  id: string;
  label: string;
  mapsUrl: string;
  aliases: string[];
}

export const venueReferences: VenueReference[] = [
  {
    id: 'umc-tuparev',
    label: 'CM SPORT (UMC TUPAREV)',
    mapsUrl: 'https://maps.app.goo.gl/qa4wtQ94JRaGdk9s7',
    aliases: ['umc', 'umc tuparev', 'cm sport', 'cm sport umc tuparev', 'tuparev'],
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const mergeVenueReferences = (extraReferences: VenueReference[] = []) => {
  const merged = [...venueReferences, ...extraReferences];
  const seen = new Set<string>();

  return merged.filter((venue) => {
    const key = normalize(venue.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function getVenueSuggestions(query: string, limit = 5, extraReferences: VenueReference[] = []) {
  const clean = normalize(query);
  if (!clean) return [];

  return mergeVenueReferences(extraReferences)
    .map((venue) => {
      const haystacks = [venue.label, ...venue.aliases];
      const score = haystacks.reduce((best, item) => {
        const text = normalize(item);
        if (!text) return best;
        if (text === clean) return Math.max(best, 100);
        if (text.startsWith(clean)) return Math.max(best, 90 - (text.length - clean.length));
        if (text.includes(clean)) return Math.max(best, 60 - (text.length - clean.length));
        return best;
      }, 0);

      return score > 0 ? { venue, score } : null;
    })
    .filter((item): item is { venue: VenueReference; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.venue.label.localeCompare(b.venue.label))
    .slice(0, limit)
    .map((item) => item.venue);
}

export function findVenueReference(query: string, extraReferences: VenueReference[] = []) {
  const clean = normalize(query);
  if (!clean) return null;

  return mergeVenueReferences(extraReferences).find((venue) => {
    const haystacks = [venue.label, ...venue.aliases];
    return haystacks.some((item) => normalize(item) === clean);
  }) ?? null;
}

export function getVenueMapsUrl(location: string, locationUrl?: string, extraReferences: VenueReference[] = []) {
  if (locationUrl) return locationUrl;
  const matched = findVenueReference(location, extraReferences);
  if (matched) return matched.mapsUrl;
  const query = encodeURIComponent(location.trim());
  return query ? `https://www.google.com/maps/search/?api=1&query=${query}` : undefined;
}
