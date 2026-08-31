/**
 * GymDeck Member Mobile - Zod Runtime Validation Schemas
 */

import { z } from 'zod';

export const EmailSchema = z
  .string()
  .min(1, 'Email address is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const PhoneSchema = z
  .string()
  .regex(/^[0-9+]{10,15}$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

export const OtpSchema = z
  .string()
  .length(6, 'Verification code must be exactly 6 digits')
  .regex(/^[0-9]+$/, 'Verification code must contain digits only');

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const SignupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
    email: EmailSchema,
    phone: PhoneSchema,
    gymCode: z.string().optional(),
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms and Conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordSchema = z
  .object({
    otp: OtpSchema,
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().positive(),
  tokenType: z.literal('Bearer'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
