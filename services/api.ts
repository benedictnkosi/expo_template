import { SubjectsResponse, MySubjectsResponse, CheckAnswerResponse } from '@/types/api';
import { API_BASE_URL } from '@/config/api';

export async function fetchAvailableSubjects(uid: string): Promise<SubjectsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/public/learn/learner/subjects-not-enrolled?uid=${uid}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch subjects');
  }

  const data = await response.json();
  return data;
}

export async function fetchMySubjects(uid: string): Promise<MySubjectsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/public/learn/learner/subjects?uid=${uid}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch enrolled subjects');
  }

  return { subjects: await response.json() };
}

export async function removeSubject(uid: string, subjectId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/public/learn/learner/remove-subject`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
  const response = await fetch(
    `${API_BASE_URL}/public/learn/learner/assign-subject`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    `${API_BASE_URL}/public/learn/learner/check-answer`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    `${API_BASE_URL}/public/learn/learner?uid=${uid}`
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
  const response = await fetch(
    `${API_BASE_URL}/public/learn/learner/update`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        name: data.name,
        grade: data.grade.toString()
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update learner');
  }
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
    `${API_BASE_URL}/public/learn/grades`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch grades');
  }

  const data: GradesResponse = await response.json();
  return data.grades;
}

export async function fetchQuestion(uid: string, subjectId: number) {
  const response = await fetch(
    `${API_BASE_URL}/public/learn/question/random?subject_id=${subjectId}&uid=${uid}&question_id=0`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }

  return response.json();
} 