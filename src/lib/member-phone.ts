import { z } from "zod";

export const memberPhoneSchema = z.string().trim().max(25)
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value === "" || /^\d{10,11}$/.test(value), "Telefone inválido. Use DDD + número.");