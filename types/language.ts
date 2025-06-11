export interface Language {
    id: number;
    code: string;
    name: string;
    nativeName: string;
    enabled: boolean;
}

export interface LanguagesResponse {
    success: boolean;
    data: Language[];
} 