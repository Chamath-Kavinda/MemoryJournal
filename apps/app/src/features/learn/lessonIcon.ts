import {
  BookOpen,
  Brain,
  Hash,
  House,
  Link,
  Moon,
  Repeat,
  ScanFace,
  type LucideIcon,
} from 'lucide-react-native';

/** The icon of each bundled lesson (section 15.11). A lesson added later falls back to a book. */
const LESSON_ICONS: Readonly<Record<string, LucideIcon>> = {
  'what-memory-is': Brain,
  'memory-palace': House,
  'linking-stories': Link,
  'chunking-numbers': Hash,
  'names-and-faces': ScanFace,
  'spaced-recall': Repeat,
  'evening-review': Moon,
};

export function lessonIcon(lessonId: string): LucideIcon {
  return LESSON_ICONS[lessonId] ?? BookOpen;
}
