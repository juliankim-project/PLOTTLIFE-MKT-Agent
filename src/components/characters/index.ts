export { ContentMarketerCharacter } from "./content-marketer";
export { SeoExpertCharacter } from "./seo-expert";
export { PerformanceMarketerCharacter } from "./performance-marketer";
export { CrmRetentionCharacter } from "./crm-retention";
export { ServicePlannerCharacter } from "./service-planner";
export { MarketingPlannerCharacter } from "./marketing-planner";
export { UiUxDesignerCharacter } from "./ui-ux-designer";

import { ContentMarketerCharacter } from "./content-marketer";
import { SeoExpertCharacter } from "./seo-expert";
import { PerformanceMarketerCharacter } from "./performance-marketer";
import { CrmRetentionCharacter } from "./crm-retention";
import { ServicePlannerCharacter } from "./service-planner";
import { MarketingPlannerCharacter } from "./marketing-planner";
import { UiUxDesignerCharacter } from "./ui-ux-designer";

export const characterMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "content-marketer": ContentMarketerCharacter,
  "seo-expert": SeoExpertCharacter,
  "performance-marketer": PerformanceMarketerCharacter,
  "crm-retention": CrmRetentionCharacter,
  "service-planner": ServicePlannerCharacter,
  "marketing-planner": MarketingPlannerCharacter,
  "ui-ux-designer": UiUxDesignerCharacter,
};
