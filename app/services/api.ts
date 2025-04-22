interface LearnerData {
    name: string;
    grade: number;
    school: string;
    school_address: string;
    school_latitude: number;
    school_longitude: number;
    terms: string;
    curriculum: string;
    email?: string;
    phone_number?: string;
    avatar: string;
}

export async function createLearner(userId: string, data: LearnerData) {
    // ... existing code ...
} 