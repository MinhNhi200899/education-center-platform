import { EvaluationType } from '@prisma/client';

export interface EvaluationScores {
  speaking?: number;
  writing?: number;
  [key: string]: number | undefined;
}

export interface EvaluationFilters {
  centerId?: string;
  classId?: string;
  studentId?: string;
  teacherId?: string;
  evaluationType?: EvaluationType;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateEvaluationDTO {
  studentId: string;
  classId: string;
  teacherId?: string;
  evaluationType: EvaluationType;
  evaluationDate: string;
  participation?: number;
  homework?: number;
  behavior?: number;
  speakingScore?: number;
  writingScore?: number;
  scores?: EvaluationScores;
  comments?: string;
}

export interface UpdateEvaluationDTO {
  evaluationType?: EvaluationType;
  evaluationDate?: string;
  participation?: number;
  homework?: number;
  behavior?: number;
  speakingScore?: number;
  writingScore?: number;
  scores?: EvaluationScores;
  comments?: string | null;
  teacherId?: string;
}

export interface BulkEvaluationRecord {
  studentId: string;
  participation?: number;
  homework?: number;
  behavior?: number;
  speakingScore?: number;
  writingScore?: number;
  comments?: string;
}

export interface BulkCreateEvaluationDTO {
  classId: string;
  teacherId?: string;
  evaluationType: EvaluationType;
  evaluationDate: string;
  records: BulkEvaluationRecord[];
}

export interface EvaluationResponse {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  evaluationType: EvaluationType;
  evaluationDate: string;
  participation: number | null;
  homework: number | null;
  behavior: number | null;
  scores: EvaluationScores | null;
  speakingScore: number | null;
  writingScore: number | null;
  comments: string | null;
  student?: { id: string; fullName: string };
  class?: { id: string; name: string };
  teacher?: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

export interface BulkCreateResult {
  created: number;
  evaluations: EvaluationResponse[];
}

export interface PaginatedEvaluations {
  data: EvaluationResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
