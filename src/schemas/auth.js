import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const newCredentialsSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string()
    .min(1, 'Password is required')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
})

export const signupSchema = newCredentialsSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
