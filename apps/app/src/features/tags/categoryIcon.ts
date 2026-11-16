import type { TagCategory } from '@memory-journal/core';
import { Hash, MapPin, Tag as TagGlyph, Users, type LucideIcon } from 'lucide-react-native';

/** Icons of the default categories, by their fixed ids (section 15.11). */
const DEFAULT_ICONS: Readonly<Record<string, LucideIcon>> = {
  people: Users,
  places: MapPin,
  numbers: Hash,
};

/** The icon of a category: Users, MapPin or Hash for the defaults and Tag for a custom one. */
export function categoryIcon(category: Pick<TagCategory, 'id'> | undefined): LucideIcon {
  return (category && DEFAULT_ICONS[category.id]) || TagGlyph;
}
