import { z } from 'zod';
import { insertUserSchema, insertResumeSchema, insertJobSchema, users, resumes, jobs } from './schema.js';

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
        resumeId: z.string().optional(),
        resumeContent: z.string().optional(),
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
        resumeId: z.string(),
      }),
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/jobs/:id' as const,
      input: insertJobSchema.partial(),
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/jobs/:id' as const,
      input: z.object({}),
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  profile: {
    getFull: {
      method: 'GET' as const,
      path: '/api/profile' as const,
      responses: {
        200: z.any(),
      },
    },
    personalInfo: {
      update: {
        method: 'PATCH' as const,
        path: '/api/profile/personal-info' as const,
        responses: {
          200: z.any(),
        },
      },
    },
    education: {
      list: {
        method: 'GET' as const,
        path: '/api/profile/education' as const,
        responses: {
          200: z.array(z.any()),
        },
      },
      add: {
        method: 'POST' as const,
        path: '/api/profile/education' as const,
        responses: {
          201: z.any(),
        },
      },
      update: {
        method: 'PATCH' as const,
        path: '/api/profile/education/:id' as const,
        responses: {
          200: z.any(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/profile/education/:id' as const,
        responses: {
          200: z.any(),
        },
      },
    },
    experience: {
      list: {
        method: 'GET' as const,
        path: '/api/profile/experience' as const,
        responses: {
          200: z.array(z.any()),
        },
      },
      add: {
        method: 'POST' as const,
        path: '/api/profile/experience' as const,
        responses: {
          201: z.any(),
        },
      },
      update: {
        method: 'PATCH' as const,
        path: '/api/profile/experience/:id' as const,
        responses: {
          200: z.any(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/profile/experience/:id' as const,
        responses: {
          200: z.any(),
        },
      },
    },
    projects: {
      list: {
        method: 'GET' as const,
        path: '/api/profile/projects' as const,
        responses: {
          200: z.array(z.any()),
        },
      },
      add: {
        method: 'POST' as const,
        path: '/api/profile/projects' as const,
        responses: {
          201: z.any(),
        },
      },
      update: {
        method: 'PATCH' as const,
        path: '/api/profile/projects/:id' as const,
        responses: {
          200: z.any(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/profile/projects/:id' as const,
        responses: {
          200: z.any(),
        },
      },
    },
    skills: {
      list: {
        method: 'GET' as const,
        path: '/api/profile/skills' as const,
        responses: {
          200: z.array(z.any()),
        },
      },
      add: {
        method: 'POST' as const,
        path: '/api/profile/skills' as const,
        responses: {
          201: z.any(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/profile/skills/:id' as const,
        responses: {
          200: z.any(),
        },
      },
    },
    certifications: {
      list: {
        method: 'GET' as const,
        path: '/api/profile/certifications' as const,
        responses: {
          200: z.array(z.any()),
        },
      },
      add: {
        method: 'POST' as const,
        path: '/api/profile/certifications' as const,
        responses: {
          201: z.any(),
        },
      },
      update: {
        method: 'PATCH' as const,
        path: '/api/profile/certifications/:id' as const,
        responses: {
          200: z.any(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/profile/certifications/:id' as const,
        responses: {
          200: z.any(),
        },
      },
    },
    achievements: {
      list: {
        method: 'GET' as const,
        path: '/api/profile/achievements' as const,
        responses: {
          200: z.array(z.any()),
        },
      },
      add: {
        method: 'POST' as const,
        path: '/api/profile/achievements' as const,
        responses: {
          201: z.any(),
        },
      },
      update: {
        method: 'PATCH' as const,
        path: '/api/profile/achievements/:id' as const,
        responses: {
          200: z.any(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/profile/achievements/:id' as const,
        responses: {
          200: z.any(),
        },
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          totalJobs: z.number(),
          activeApplications: z.number(),
          interviewCount: z.number(),
          resumesCount: z.number(),
          recentResumes: z.array(z.custom<typeof resumes.$inferSelect>()),
          jobPipeline: z.object({
            new: z.number(),
            applied: z.number(),
            interview: z.number(),
            offer: z.number(),
            rejected: z.number(),
          }),
          avgAtsScore: z.number(),
        }),
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
