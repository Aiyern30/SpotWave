export interface ShareCardData {
    name: string;
    description?: string;
    coverImage: string;
    trackCount: number;
    duration: string; // pre-formatted, e.g. "1h 24m"
    ownerName: string;
    ownerAvatar?: string;
}

export interface ShareTemplateProps {
    data: ShareCardData;
}

export interface ShareTemplateDefinition {
    id: string;
    label: string;
    Component: React.ComponentType<ShareTemplateProps>;
}