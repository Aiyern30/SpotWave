import { ShareTemplateDefinition } from "@/types/shareToInstagram";
import ClassicTemplate from "./ClassicTemplate";
import MinimalTemplate from "./MinimalTemplate";

export const shareTemplates: ShareTemplateDefinition[] = [
    { id: "classic", label: "Classic", Component: ClassicTemplate },
    { id: "minimal", label: "Minimal", Component: MinimalTemplate },
];