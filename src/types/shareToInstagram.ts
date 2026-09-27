export interface ShareCardData {
    name: string;
    description?: string;
    coverImage: string;
    trackCount: number;
    duration: string;
    ownerName: string;
    ownerAvatar?: string;
    shareUrl: string;
}

export interface ShareTemplateProps {
    data: ShareCardData;
}

export interface ShareTemplateDefinition {
    id: string;
    label: string;
    Component: React.ComponentType<ShareTemplateProps>;
}