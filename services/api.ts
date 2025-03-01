import { SubjectsResponse, MySubjectsResponse, CheckAnswerResponse } from '@/types/api';
import { API_BASE_URL } from '@/config/api';
import { mixpanel, Events } from '@/services/mixpanel';

function ensureHttps(url: string): string {
  return url.replace('http://', 'https://');
}

export async function fetchAvailableSubjects(grade: string): Promise<SubjectsResponse> {

  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/getSubjectsByGrade?grade=${grade}`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch subjects');
  }

  const data = await response.json();
  return data;
}

export async function fetchMySubjects(uid: string): Promise<Subject[]> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/subjects?uid=${uid}`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch enrolled subjects');
  }

  return await response.json();
}

export async function removeSubject(uid: string, subjectId: number): Promise<void> {
  mixpanel.track(Events.REMOVE_SUBJECT, {
    "user_id": uid,
    "subject_id": subjectId
  });

  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/remove-subject`),
    {
      method: 'POST',
      body: JSON.stringify({
        uid,
        subject_id: subjectId
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove subject');
  }
}

export async function assignSubject(uid: string, subjectId: number): Promise<void> {
  mixpanel.track(Events.ADD_SUBJECT, {
    "user_id": uid,
    "subject_id": subjectId
  });

  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/assign-subject`),
    {
      method: 'POST',
      body: JSON.stringify({
        uid,
        subject_id: subjectId
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to assign subject');
  }
}

export async function checkAnswer(
  uid: string,
  questionId: number,
  answer: string
): Promise<CheckAnswerResponse> {


  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/check-answer`),
    {
      method: 'POST',
      body: JSON.stringify({
        uid,
        question_id: questionId,
        answer,
        answers: [],
        requesting_type: 'real'
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check answer');
  }

  return response.json();
}



interface Learner {
  id: number;
  uid: string;
  name: string;
  grade: {
    id: number;
    number: number;
    active: number;
  };
}

interface LearnerResponse {
  id: number;
  uid: string;
  name: string;
  overide_term: boolean;
  grade: {
    id: number;
    number: number;
    active: number;
  };
  notification_hour: number;
  school_name: string;
  school_address: string;
  school_latitude: number;
  school_longitude: number;
}

export async function getLearner(uid: string): Promise<LearnerResponse> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner?uid=${uid}`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch learner');
  }

  return response.json();
}

export async function updateLearner(uid: string, data: {
  name: string;
  grade: number;
  school: string;
  school_address: string;
  school_latitude: number;
  school_longitude: number;
  notification_hour: number;
}) {
  mixpanel.track(Events.UPDATE_PROFILE, {
    "user_id": uid,
    "name": data.name,
    "grade": data.grade.toString()
  });

  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/update`),
    {
      method: 'POST',
      body: JSON.stringify({
        uid,
        name: data.name,
        grade: data.grade.toString(),
        "school_name": data.school,
        "school_address": data.school_address,
        "school_latitude": data.school_latitude,
        "school_longitude": data.school_longitude,
        "notification_hour": data.notification_hour
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
  active: number;
}

interface GradesResponse {
  status: string;
  grades: Grade[];
}

export async function fetchGrades(): Promise<Grade[]> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/grades`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch grades');
  }

  const data: GradesResponse = await response.json();
  return data.grades;
}

export async function fetchQuestion(uid: string, subjectId: number) {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/question/random?subject_id=${subjectId}&uid=${uid}&question_id=0`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }

  return response.json();
}

export async function removeResults(uid: string, subjectName: string): Promise<void> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/remove-results`),
    {
      method: 'POST',
      body: JSON.stringify({
        uid,
        subject_name: subjectName
      })
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
    const response = await fetch(`${API_BASE_URL}/api/streaks/track/${uid}`, {
      method: 'POST'
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
      ensureHttps(`${API_BASE_URL}/public/learn/learner/subject-stats?uid=${uid}&subject_name=${subjectName}`),
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

interface RegisterResponse {
  status: string;
  message?: string;
  user?: {
    uid: string;
    name: string;
    grade: number;
  };
}

export async function registerLearner(data: {
  uid: string;
  name: string;
  grade: number;
}): Promise<RegisterResponse> {
  try {
    const response = await fetch(
      ensureHttps(`${API_BASE_URL}/public/learn/learner/create`),
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to register learner');
    }

    return await response.json();
  } catch (error) {
    console.error('Error registering learner:', error);
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
      ensureHttps(`${API_BASE_URL}/public/learn/question/set-status`),
      {
        method: 'POST',
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