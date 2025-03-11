import { SubjectsResponse, MySubjectsResponse, CheckAnswerResponse } from '@/types/api';
import { API_BASE_URL } from '@/config/api';

function ensureHttps(url: string): string {
  return url.replace('http://', 'https://');
}

export async function fetchAvailableSubjects(grade: string): Promise<SubjectsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/subject/getSubjectsByGrade?grade=${grade}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch subjects');
  }

  return response.json();
}

export async function fetchMySubjects(uid: string): Promise<MySubjectsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/learner/subjects?uid=${uid}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch enrolled subjects');
  }

  return response.json();
}

export async function checkAnswer(
  uid: string,
  questionId: number,
  answer: string,
  duration: number
): Promise<CheckAnswerResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/learner/check-answer`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid,
        question_id: questionId,
        answer,
        answers: [],
        requesting_type: 'real',
        duration: duration
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check answer');
  }

  const data = await response.json();
  return data;
}

export async function getLearner(uid: string): Promise<{
  id: number;
  uid: string;
  name: string;
  grade: {
    id: number;
    number: number;
    active: number;
  };
  school_name: string;
  school_address: string;
  school_latitude: number;
  school_longitude: number;
  curriculum: string;
  terms: string;
  email: string;
  role?: string;
  points: number;
  streak: number;
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/learner?uid=${uid}`
  );

  if (!response.ok) {
    console.log('Failed to fetch learner');
  }

  const data = await response.json();
  // Set default role to 'learner' if not provided by the API
  return { ...data, role: data.role || 'learner', points: data.points || 0 };
}

export async function updateLearner(uid: string, data: {
  name: string;
  grade: number;
  school: string;
  school_address: string;
  school_latitude: number;
  school_longitude: number;
  terms: string;
  curriculum: string;
  email: string;
}): Promise<{ status: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/learner/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid,
        name: data.name,
        grade: data.grade.toString(),
        school_name: data.school,
        school_address: data.school_address,
        school_latitude: data.school_latitude,
        school_longitude: data.school_longitude,
        terms: data.terms,
        curriculum: data.curriculum,
        email: data.email
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update learner' }));
    throw new Error(error.message || 'Failed to update learner');
  }

  return response.json();
}

interface Grade {
  id: number;
  number: number;
  active: boolean;
}

interface GradesResponse {
  status: string;
  grades: Grade[];
}

export async function fetchGrades(): Promise<Grade[]> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/api/grades`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch grades');
  }

  const data: GradesResponse = await response.json();
  console.log('Grades API response:', data);
  return data.grades;
}

export async function fetchQuestion(uid: string, subjectId: number) {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/api/question/random?subject_id=${subjectId}&uid=${uid}&question_id=0`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }

  return response.json();
}

export async function removeResults(uid: string, subjectName: string): Promise<void> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/api/learner/results/remove?uid=${uid}&subject_name=${subjectName}`),
    {
      method: 'DELETE',
    }
  );
  if (!response.ok) {
    throw new Error('Failed to remove results');
  }
}

interface StreakResponse {
  status: string;
  data: {
    currentStreak: number;
    longestStreak: number;
    questionsAnsweredToday: number;
    questionsNeededToday: number;
    streakMaintained: boolean;
  };
}

export async function trackStreak(uid: string): Promise<StreakResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/streak/track`, {
      method: 'POST',
      body: JSON.stringify({
        uid
      })
    });

    if (!response.ok) {
      throw new Error('Failed to track streak');
    }

    const data: StreakResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error tracking streak:', error);
    throw error;
  }
}

interface StreakData {
  status: string;
  data: {
    currentStreak: number;
    longestStreak: number;
    questionsAnsweredToday: number;
    questionsNeededToday: number;
    streakMaintained: boolean;
  };
}

export async function getStreak(uid: string): Promise<StreakData> {
  try {
    const response = await fetch(
      ensureHttps(`${API_BASE_URL}/api/streaks/${uid}`),
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch streak data');
    }

    const data: StreakData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching streak:', error);
    throw error;
  }
}

interface Ranking {
  name: string;
  score: number;
  position: number;
  isCurrentLearner: boolean;
}

interface RankingsResponse {
  status: string;
  rankings: Ranking[];
  currentLearnerScore: number;
  currentLearnerPosition: number;
  totalLearners: number;
}

export async function getTopLearners(uid: string): Promise<RankingsResponse> {
  try {
    const response = await fetch(
      ensureHttps(`${API_BASE_URL}/api/rankings/top-learners/${uid}`),
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch rankings');
    }

    const data: RankingsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching rankings:', error);
    throw error;
  }
}

interface SubjectStats {
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

export async function getSubjectStats(uid: string, subjectName: string): Promise<SubjectStats> {
  try {
    const response = await fetch(
      ensureHttps(`${API_BASE_URL}/api/learner/stats?uid=${uid}&subject=${subjectName}`),
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch subject stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subject stats:', error);
    throw error;
  }
}

interface QuestionStatusData {
  question_id: number;
  status: 'approved' | 'rejected';
  email: string;
  uid: string;
  comment: string;
}

export async function setQuestionStatus(data: QuestionStatusData): Promise<void> {
  try {
    const response = await fetch(
      ensureHttps(`${API_BASE_URL}/api/question/status`),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update question status');
    }

    return response.json();
  } catch (error) {
    console.error('Error setting question status:', error);
    throw error;
  }
} 