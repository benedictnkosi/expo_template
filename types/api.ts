export interface Grade {
  id: number;
  number: number;
  active: number;
}

export interface Subject {
  id: string;
  name: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
}

export interface APISubject {
  id: number;
  name: string;
  active: boolean;
  totalResults: number;
  totalSubjectQuestions: number;
  correctAnswers: number;
}

export interface LearnerSubject {
  subject: {
    id: number;
    highergrade: boolean;
    overideterm: boolean;
    last_updated: string;
    percentage: number;
    subject: Subject;
    learner: {
      id: number;
      uid: string;
      name: string;
      overide_term: boolean;
      grade: Grade;
    };
  };
  total_questions: number;
  answered_questions: number;
}

export interface SubjectsResponse {
  status: string;
  subjects: {
    id: number;
    name: string;
    active: boolean;
    grade: {
      id: number;
      number: number;
      active: number;
    };
    totalQuestions: number;
  }[];
}

export interface MySubjectsResponse {
  status: string;
  subjects: APISubject[];
}

export interface CheckAnswerResponse {
  status: string;
  is_correct: boolean;
  correct_answers: string;
} 