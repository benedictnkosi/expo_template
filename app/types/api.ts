export interface Grade {
    id: number;
    active: boolean;
    number: number;
}

export interface Learner {
    id: number;
    uid: string;
    grade: Grade;
    score: number;
    name: string;
    notification_hour: number;
    role: string;
    created: string;
    lastSeen: string;
    school_address: string;
    school_name: string;
    school_latitude: number;
    school_longitude: number;
    terms: string;
    curriculum: string;
    private_school: boolean;
    email: string;
    rating: number;
    rating_cancelled?: string;
}

export interface SubjectStats {
    status: string;
    data: {
        subject: {
            id: number;
            name: string;
        };
        stats: {
            total_answers: number;
            correct_answers: number;
            incorrect_answers: number;
            correct_percentage: number;
            incorrect_percentage: number;
        };
    };
}

// ... rest of existing types ... 