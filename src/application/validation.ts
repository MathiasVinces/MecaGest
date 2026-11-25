import { z } from 'zod';

export const idSchema = z.uuid();
export const textSchema = z.string().trim().min(1).max(2000);
export const plateSchema = z.string().trim().max(14).regex(/^[a-zA-Z0-9 -]+$/)
  .transform(value => value.replace(/[ -]/g, '').toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{5,10}$/));
export const clientSchema = z.strictObject({ name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^[+0-9 ()-]{5,25}$/) });
export const vehicleSchema = z.strictObject({ clientId: idSchema, plate: plateSchema, brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(80) });
export const orderSchema = z.strictObject({ vehicleId: idSchema, mechanicId: idSchema, reason: textSchema });
export const intakeSchema = z.strictObject({
  plate: plateSchema, mechanicId: idSchema, reason: textSchema,
  newVehicle: z.strictObject({
    brand: vehicleSchema.shape.brand, model: vehicleSchema.shape.model,
    owner: z.union([z.strictObject({ clientId: idSchema }), clientSchema]),
  }).optional(),
});
export const diagnosisSchema = z.strictObject({ findings: textSchema, recommendedWork: textSchema, complete: z.boolean() });
export const authorizationSchema = z.strictObject({ decision: z.enum(['APPROVED', 'REJECTED']), evidence: textSchema });
export const repairSchema = z.strictObject({ activity: textSchema, outcome: z.enum(['PROGRESS', 'BLOCKED', 'COMPLETED']) });
