import { SubjectsResponse, MySubjectsResponse, CheckAnswerResponse } from '@/types/api';
import { API_BASE_URL } from '@/config/api';
import { mixpanel, Events } from '@/services/mixpanel';

function ensureHttps(url: string): string {
  return url.replace('http://', 'https://');
}

export async function fetchAvailableSubjects(uid: string): Promise<SubjectsResponse> {

  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/subjects-not-enrolled?uid=${uid}`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch subjects');
  }

  const data = await response.json();
  return data;
}

export async function fetchMySubjects(uid: string): Promise<MySubjectsResponse> {


  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/subjects?uid=${uid}`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch enrolled subjects');
  }

  return { subjects: await response.json() };
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
  mixpanel.track(Events.ANSWER_QUESTION, {
    "user_id": uid,
    "question_id": questionId
  });

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
        grade: data.grade.toString()
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

export async function removeResults(uid: string, subjectId: number): Promise<void> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/public/learn/learner/remove-results`),
    {
      method: 'POST',
      body: JSON.stringify({
        uid,
        subject_id: subjectId
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to remove results');
  }
} 