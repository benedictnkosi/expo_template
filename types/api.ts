export interface Grade {
  id: number;
  number: number;
  active: number;
}

export interface Subject {
  id: string;
  name: string;
  totalQuestions: number;
  answeredQuestions: number;
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
  subjects: {
    subject: {
      subject: {
        id: number;
        name: string;
      };
    };
    total_questions: number;
    answered_questions: number;
    correct_answers: number;
  }[];
}

export interface CheckAnswerResponse {
  status: string;
  is_correct: boolean;
  correct_answers: string;
} 