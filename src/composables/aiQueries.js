import { useMutation, useQuery } from '@tanstack/vue-query'
import * as aiService from '@/services/aiService.js'
import { queryKeys } from '@/services/queryKeys.js'

// AI state. Only the CONFIGURATION is a query (whether the tools exist at all, kept for a minute and never
// refetched on focus); every generation is a mutation whose result lives in the component that asked: AI output
// is generated text that may be wrong, so it is never cached across lessons or put in Pinia.
export const useAiStatusQuery = () =>
  useQuery({ queryKey: queryKeys.aiStatus, queryFn: aiService.getAiStatus, staleTime: 60_000 })

export const useAskLessonQuestion = (courseId, lessonId) =>
  useMutation({ mutationFn: (question) => aiService.askLessonQuestion(courseId.value, lessonId.value, question) })

export const useLessonSummary = (courseId, lessonId) =>
  useMutation({ mutationFn: () => aiService.getLessonSummary(courseId.value, lessonId.value) })

export const useGeneratePractice = (courseId, lessonId) =>
  useMutation({ mutationFn: () => aiService.generatePracticeQuestions(courseId.value, lessonId.value) })

export const useGenerateQuizDraft = (courseId) =>
  useMutation({ mutationFn: (options) => aiService.generateQuizDraft(courseId.value, options) })
