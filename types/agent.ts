export type AnswerValue = string | number | string[];

export type QuestionType = "multi" | "single" | "scale" | "text";

export interface QuestionOption {
  id: string;
  label: string;
  hint?: string;
}

export interface Question {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface AgentState {
  answers: Record<string, AnswerValue>;
  asked: string[];
  completed: boolean;
}

export interface AgentResponse {
  nextQuestion?: Question | null;
  state: AgentState;
  reason?: string;
  summaryMarkdown?: string;
}
