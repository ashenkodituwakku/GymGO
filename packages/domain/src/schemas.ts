/**
 * Validation schemas for everything that crosses the network boundary.
 *
 * These live in the domain package so the server and the clients validate
 * against the same definitions, and so a future Expo client cannot drift.
 */

import { z } from 'zod';

const trimmedText = (max: number) => z.string().trim().min(1).max(max);

/**
 * User text is stored as plain text and escaped at render time. We strip
 * control characters here so stored data cannot carry terminal escapes into
 * logs, and cap length to bound abuse.
 */
const safeText = (max: number) =>
  trimmedText(max).transform((value) => value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ''));

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const reviewInputSchema = z.object({
  gymId: trimmedText(64),
  overall: z.number().int().min(1).max(5),
  equipment: z.number().int().min(1).max(5).nullable().default(null),
  cleanliness: z.number().int().min(1).max(5).nullable().default(null),
  atmosphere: z.number().int().min(1).max(5).nullable().default(null),
  value: z.number().int().min(1).max(5).nullable().default(null),
  body: safeText(2000),
  visitedOn: isoDateSchema.nullable().default(null),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const correctionInputSchema = z.object({
  gymId: trimmedText(64),
  targetKind: z.enum([
    'offer_price',
    'offer_eligibility',
    'visitor_hours',
    'equipment',
    'amenity',
    'operating_status',
    'contact_details',
    'other',
  ]),
  targetId: z.string().trim().max(64).nullable().default(null),
  proposedValue: safeText(500),
  evidenceNote: safeText(1000),
  evidenceUrl: z.string().trim().url().max(500).nullable().default(null),
});
export type CorrectionInput = z.infer<typeof correctionInputSchema>;

export const ownershipClaimInputSchema = z.object({
  gymId: trimmedText(64),
  claimantName: safeText(120),
  claimantRole: safeText(120),
  evidenceType: z.enum([
    'work_email_domain',
    'phone_callback',
    'business_document',
    'website_verification',
  ]),
  /**
   * Free-text reference to evidence held out of band (a ticket id, a work
   * email address, a callback number). Never returned in a public response.
   */
  evidenceRef: safeText(300),
});
export type OwnershipClaimInput = z.infer<typeof ownershipClaimInputSchema>;

export const ownerReplyInputSchema = z.object({
  reviewId: trimmedText(64),
  body: safeText(1000),
});
export type OwnerReplyInput = z.infer<typeof ownerReplyInputSchema>;

export const contentReportInputSchema = z.object({
  subjectType: z.enum(['review', 'correction', 'gym']),
  subjectId: trimmedText(64),
  reason: safeText(500),
});
export type ContentReportInput = z.infer<typeof contentReportInputSchema>;

export const moderationDecisionSchema = z.object({
  id: trimmedText(64),
  decision: z.enum(['approve', 'reject']),
  reason: safeText(300),
});
export type ModerationDecision = z.infer<typeof moderationDecisionSchema>;

export const equipmentRequirementSchema = z.object({
  equipmentTypeId: trimmedText(64),
  minMaxWeightKg: z.number().int().min(1).max(100).nullable().default(null),
});

export const searchQuerySchema = z.object({
  text: z.string().trim().max(120).nullable().default(null),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  radiusKm: z.number().min(0.2).max(50).default(5),
  budgetMinor: z.number().int().min(0).max(100_000).nullable().default(null),
  visitDate: isoDateSchema,
  visitMinuteOfDay: z.number().int().min(0).max(1439),
  requiredEquipment: z.array(equipmentRequirementSchema).max(15).default([]),
  preferredEquipment: z.array(equipmentRequirementSchema).max(15).default([]),
  requiredAmenities: z.array(trimmedText(48)).max(10).default([]),
  sort: z.enum(['best_match', 'distance', 'visit_cost', 'rating']).default('best_match'),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
