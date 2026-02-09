import { z } from 'zod';
import { insertUserSchema, insertResumeSchema, insertJobSchema, users, resumes, jobs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    sync: { // Sync Firebase user to Postgres
      method: 'POST' as const,
      path: '/api/users/sync' as const,
      input: insertUserSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        201: z.custom<typeof users.$inferSelect>(),
      },
    },
  },
  resumes: {
    list: {
      method: 'GET' as const,
      path: '/api/resumes' as const,
      responses: {
        200: z.array(z.custom<typeof resumes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/resumes' as const,
      input: insertResumeSchema,
      responses: {
        201: z.custom<typeof resumes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    analyze: { // The core AI feature
      method: 'POST' as const,
      path: '/api/resumes/analyze' as const,
      input: z.object({
        resumeId: z.number(),
        jobDescription: z.string(),
      }),
      responses: {
        200: z.object({
          atsScore: z.number(),
          sectionScores: z.object({
            skills: z.number(),
            experience: z.number(),
            education: z.number(),
            formatting: z.number(),
          }),
          missingKeywords: z.array(z.string()),
          feedback: z.string(),
          optimizedLatex: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/resumes/:id' as const,
      responses: {
        200: z.custom<typeof resumes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs' as const,
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
    create: { // For manual tracking
      method: 'POST' as const,
      path: '/api/jobs' as const,
      input: insertJobSchema,
      responses: {
        201: z.custom<typeof jobs.$inferSelect>(),
      },
    },
    recommend: { // Generate/Fetch jobs based on resume
      method: 'POST' as const,
      path: '/api/jobs/recommend' as const,
      input: z.object({
        resumeId: z.number(),
      }),
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
