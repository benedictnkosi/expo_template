import { CheckAnswerResponse, RandomAIQuestion, Todo } from '@/types/api';
import { API_BASE_URL, HOST_URL } from '@/config/api';

export interface MySubjectsResponse {
  status: string;
  subjects: {
    id: number;
    name: string;
    active: boolean;
    totalSubjectQuestions: number;
    totalResults: number;
    correctAnswers: number;
  }[];
}

export interface ChapterResponse {
  status: string;
  chapter: {
    id: number;
    chapterName: string;
    summary: string;
    content: string;
    level: number;
    chapterNumber: number;
    status?: 'in_progress' | 'completed' | 'not_started';
    publishDate: string;
    readingDuration?: number;
    wordCount?: number;
    speed?: number;
    score?: number;
  };
  streak?: number;
  points?: number;
  readingPoints?: number;
  nextLevelWPM?: number;
  nextLevelNumber?: number;
  stats?: {
    completedChapters: number;
    readingDays: number;
    speeds?: {
      date: string;
      speed: number;
      score: number;
      chapterNumber: number;
    }[];
  };
  promotionProgress?: {
    chaptersCompleted: number;
    chaptersRequired: number;
    chaptersRemaining: number;
  };
  nextChapter?: {
    id: number;
    chapterName: string;
    status: string;
    publishDate: string;
  };
}

export async function getNextChapter(learnerUid: string): Promise<ChapterResponse> {
  const response = await fetch(`${HOST_URL}/api/learner/next-chapter?learnerUid=${learnerUid}`);

  if (!response.ok) {
    console.log('Failed to fetch next chapter');
  }

  return response.json();
}

function ensureHttps(url: string): string {
  // return url.replace('http://', 'https://');
  return url;
}

export async function fetchMySubjects(uid: string): Promise<MySubjectsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/learner/subjects?uid=${uid}&accounting2=true`
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
  duration: number,
  requesting_type: string,
  sheet_cell: string
): Promise<CheckAnswerResponse> {
  const response = await fetch(
    `${API_BASE_URL}/learner/check-answer`,
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
        requesting_type: requesting_type,
        sheet_cell: sheet_cell,
        duration: duration,
        mode: "normal"
      })
    }
  );

  // Only read the response body once
  const responseBody = await response.json();
  console.log('responseBody', responseBody);

  if (!response.ok) {
    throw new Error('Failed to check answer' + response.statusText);
  }

  return responseBody;
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
  avatar: string;
  follow_me_code: string;
  public_profile: boolean;
}> {
  const response = await fetch(
    `${API_BASE_URL}/learner?uid=${uid}`
  );

  if (!response.ok) {
    console.log('Failed to fetch learner');
  }

  const data = await response.json();
  // Set default role to 'learner' if not provided by the API
  return { ...data, role: data.role || 'learner', points: data.points || 0 };
}

export async function createLearner(uid: string, data: {
  name: string;
  grade: number;
  school: string;
  school_address: string;
  school_latitude: number;
  school_longitude: number;
  terms: string;
  curriculum: string;
  email: string;
  avatar: string;
}): Promise<{ status: string }> {
  const response = await fetch(
    `${API_BASE_URL}/learner/create`,
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
        email: data.email,
        avatar: data.avatar
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
    ensureHttps(`${API_BASE_URL}/grades`)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch grades');
  }

  const data: GradesResponse = await response.json();
  return data.grades;
}


export async function removeResults(uid: string, subjectName: string): Promise<void> {
  const response = await fetch(
    ensureHttps(`${API_BASE_URL}/learner/remove-results?uid=${uid}&subject_name=${subjectName}`),
    {
      method: 'DELETE',
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
      ensureHttps(`${API_BASE_URL}/learner/subject-stats?uid=${uid}&subject_name=${subjectName}`),
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
      ensureHttps(`${API_BASE_URL}/question/set-status`),
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

export async function updatePushToken(uid: string, pushToken: string): Promise<void> {
  const response = await fetch(
    `${HOST_URL}/api/push-notifications/update-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid,
        push_token: pushToken
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update push token');
  }
}

export async function getRandomAIQuestion(uid: string, subjectName?: string): Promise<RandomAIQuestion> {
  try {
    const url = new URL(`${API_BASE_URL}/question/random-ai`);
    url.searchParams.append('uid', uid);
    if (subjectName) {
      url.searchParams.append('subject_name', subjectName);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch random AI question');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching random AI question:', error);
    throw error;
  }
}

interface ReportMessageData {
  author_id: string;
  reporter_id: string;
  message_uid: string;
  message: string;
}

export async function reportMessage(data: ReportMessageData): Promise<void> {
  try {
    const response = await fetch(
      ensureHttps(`${API_BASE_URL}/report/create`),
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
      throw new Error(error.message || 'Failed to report message');
    }

    return response.json();
  } catch (error) {
    console.error('Error reporting message:', error);
    throw error;
  }
}

interface UploadFileResponse {
  fileName: string;
  status: string;
}

export async function uploadFile(formData: FormData): Promise<UploadFileResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/upload-file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

export function getFileUrl(fileName: string): string {
  return `${API_BASE_URL}/get-chat-file?file=${fileName}`;
}

export interface LearnerBadge {
  id: number;
  name: string;
  rules: string;
  image: string;
  earned: boolean;
}

export async function getLearnerBadges(uid: string): Promise<LearnerBadge[]> {
  const response = await fetch(
    `${HOST_URL}/api/badges/learner/${uid}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch learner badges');
  }

  const data = await response.json();
  return data.badges;
}

export interface Badge {
  id: number;
  name: string;
  rules: string;
  image: string;
}

export async function getAllBadges(): Promise<Badge[]> {
  const response = await fetch(
    `${HOST_URL}/api/badges`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch all badges');
  }

  const data = await response.json();
  return data.badges;
}

export interface SubjectPerformance {
  subject: string;
  totalAnswers: number;
  correctAnswers: string;
  incorrectAnswers: string;
  percentage: number;
  grade: number;
  gradeDescription: string;
}

export interface LearnerPerformanceResponse {
  data: SubjectPerformance[];
}

export async function getLearnerPerformance(uid: string): Promise<LearnerPerformanceResponse> {
  try {
    const response = await fetch(`${HOST_URL}/api/learner/${uid}/subject-performance`);
    if (!response.ok) {
      throw new Error('Failed to fetch learner performance');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching learner performance:', error);
    throw error;
  }
}

export async function getTodos(learnerUid: string): Promise<Todo[]> {
  try {
    const response = await fetch(`${HOST_URL}/api/todos?learnerUid=${learnerUid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch todos');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
}

export interface Message {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
}

export async function getMessages(): Promise<MessagesResponse> {
  const response = await fetch(`${HOST_URL}/public/learn/messages`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
}

export async function updateVersion(uid: string, version: string, os: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/learner/update-version`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        version,
        os
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update version');
  }

  return response.json();
}

export interface PastChapter {
  id: number;
  chapterName: string;
  summary: string;
  content: string;
  level: number;
  chapterNumber: number;
  publishDate: string;
  readingDuration: number;
  wordCount: number;
}

export interface PastChaptersResponse {
  status: string;
  chapters: PastChapter[];
}

export async function getPastChapters(learnerUid: string): Promise<PastChaptersResponse> {
  const response = await fetch(`${HOST_URL}/api/learner/past-chapters?learnerUid=${learnerUid}`);

  if (!response.ok) {
    throw new Error('Failed to fetch past chapters');
  }

  return response.json();
}

export async function getChapterById(learnerUid: string, chapterId: number): Promise<ChapterResponse> {
  const response = await fetch(`${HOST_URL}/api/learner/chapter/${chapterId}?learnerUid=${learnerUid}`);
  const data = await response.json();
  return data;
}

export interface ReadingStats {
  status: string;
  streak: number;
  points: number;
  readingPoints: number;
  nextLevelWPM?: number;
  nextLevelNumber?: number;
  stats: {
    completedChapters: number;
    readingDays: number;
    speeds: {
      date: string;
      speed: number;
      score: number;
      chapterNumber: number;
    }[];
  };
  promotionProgress?: {
    chaptersCompleted: number;
    chaptersRequired: number;
    chaptersRemaining: number;
  };
}

export async function getLearnerStats(learnerUid: string): Promise<ReadingStats> {
  const response = await fetch(`${HOST_URL}/api/learner/reading-stats?learnerUid=${learnerUid}`);
  if (!response.ok) {
    throw new Error('Failed to fetch learner stats');
  }
  return response.json();
} 