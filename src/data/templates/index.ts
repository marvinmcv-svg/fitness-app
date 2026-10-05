import type { ProgramTemplate } from "../../domain/template";
import { fullBody } from "./full-body";
import { twiceWeeklyPrimerSplit } from "./twice-weekly-primer-split";
import { upperLower } from "./upper-lower";

export const TEMPLATES: ProgramTemplate[] = [fullBody, upperLower, twiceWeeklyPrimerSplit];
export const templateBySlug = (slug: string) => TEMPLATES.find((t) => t.slug === slug);
export { fullBody, twiceWeeklyPrimerSplit, upperLower };
