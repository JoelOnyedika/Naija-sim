import { EXAM, type Grade } from '@/data/story';
import { EXAM_QUESTIONS } from '@/data/examQuestions';

/**
 * Exam Hall rules (pure). Every dice roll takes an `rnd` argument so tests can control it. A server will own real dice
 * in the multiplayer version. State is immutable: each function returns a new state.
 */
export interface ExamQ { q: string; options: string[]; answer: number }
export interface ExamState { qs: ExamQ[]; i: number; score: number; peeks: number; /** the option index a peek revealed for the current question */ revealed: number | null; caught: boolean; done: boolean; log: boolean[] }

const shuffle = <T,>(a: T[], rnd: () => number): T[] => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };

/** A fresh sitting: 8 random questions, options shuffled. */
export function startExam(rnd: () => number = Math.random): ExamState {
  const qs = shuffle(EXAM_QUESTIONS, rnd).slice(0, EXAM.questions).map((x): ExamQ => {
    const order = shuffle([0, 1, 2, 3], rnd);
    return { q: x.q, options: order.map((k) => x.options[k]), answer: order.indexOf(x.a) };
  });
  return { qs, i: 0, score: 0, peeks: 0, revealed: null, caught: false, done: false, log: [] };
}
const next = (s: ExamState, right: boolean): ExamState => ({ ...s, score: s.score + (right ? 1 : 0), log: [...s.log, right], i: s.i + 1, revealed: null, done: s.i + 1 >= s.qs.length });
/** Pick an option (-1 = the time ran out). */
export function answer(s: ExamState, choice: number): ExamState { if (s.done) return s; return next(s, choice === s.qs[s.i].answer); }
/** The chance the next peek is caught: rises with every peek already taken. */
export const peekChance = (peeks: number) => Math.min(EXAM.peekMax, EXAM.peekBase + EXAM.peekStep * peeks);
/** Cheat: reveals the answer, unless the invigilator sees. Caught ends the exam and the script is taken. */
export function peek(s: ExamState, rnd: () => number = Math.random): ExamState {
  if (s.done || s.revealed !== null) return s;
  if (rnd() < peekChance(s.peeks)) return { ...s, peeks: s.peeks + 1, caught: true, done: true };
  return { ...s, peeks: s.peeks + 1, revealed: s.qs[s.i].answer };
}
export function gradeFor(score: number, total: number): { grade: Grade; pay: number } {
  const share = total ? score / total : 0;
  const g = EXAM.grades.find((x) => share >= x.min) ?? EXAM.grades[EXAM.grades.length - 1];
  return { grade: g.grade, pay: g.pay };
}
/** The result of a finished sitting. A caught cheat gets no grade and no pay. */
export function finish(s: ExamState): { caught: boolean; grade: Grade | null; pay: number; score: number } {
  if (s.caught) return { caught: true, grade: null, pay: 0, score: s.score };
  const r = gradeFor(s.score, s.qs.length);
  return { caught: false, grade: r.grade, pay: r.pay, score: s.score };
}
