
export interface SubItemAnalysis {
  questionIndex: number;
  type: "Multiple Choice" | "Essay";
  tk: number; // Tingkat Kesukaran
  dp: number; // Daya Beda
  distractors?: { [key: string]: number }; // For MC
  validity?: number; // For Essay
  status: "Sangat Layak" | "Layak" | "Revisi" | "Buang";
  recommendation: string;
}

export interface AssignmentAnalysis {
  reliability: number;
  mean: number;
  completionRate: number;
  items: SubItemAnalysis[];
}

/**
 * Calculate Tingkat Kesukaran (TK)
 * TK = B / N
 * B: Number of students who answered correctly
 * N: Total students
 */
export function calculateTK(correctCount: number, totalStudents: number): number {
  if (totalStudents === 0) return 0;
  return correctCount / totalStudents;
}

/**
 * TK Interpretation
 */
export function interpretTK(tk: number): string {
  if (tk >= 0.7) return "Mudah";
  if (tk >= 0.3) return "Sedang";
  return "Sukar";
}

/**
 * Calculate Daya Beda (DP)
 * DP = (BA - BB) / (0.5 * N)
 * BA: Correct in upper group
 * BB: Correct in lower group
 * N: Total students
 */
export function calculateDP(upperCorrect: number, lowerCorrect: number, groupSize: number): number {
  if (groupSize === 0) return 0;
  return (upperCorrect - lowerCorrect) / groupSize;
}

/**
 * DP Interpretation
 */
export function interpretDP(dp: number): string {
  if (dp >= 0.4) return "Sangat Baik";
  if (dp >= 0.3) return "Baik";
  if (dp >= 0.2) return "Cukup (Perlu Revisi)";
  return "Jelek (Buang)";
}

/**
 * Reliability KR-20 for Multiple Choice
 */
export function calculateKR20(n: number, pValues: number[], totalVariance: number): number {
  if (n <= 1 || totalVariance === 0) return 0;
  const sumPQ = pValues.reduce((sum, p) => sum + p * (1 - p), 0);
  return (n / (n - 1)) * (1 - sumPQ / totalVariance);
}

/**
 * Reliability Alpha Cronbach for Essay
 */
export function calculateAlphaCronbach(n: number, itemVariances: number[], totalVariance: number): number {
  if (n <= 1 || totalVariance === 0) return 0;
  const sumVariances = itemVariances.reduce((sum, v) => sum + v, 0);
  return (n / (n - 1)) * (1 - sumVariances / totalVariance);
}

export function calculateVariance(scores: number[]): number {
  if (scores.length <= 1) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squareDiffs = scores.map(s => Math.pow(s - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / (scores.length - 1);
}
