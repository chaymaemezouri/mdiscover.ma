import { Role, UserStatus, ProValidationStatus, Locale } from '@prisma/client';

export type SafeUser = {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  locale: Locale;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  individualProfile?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  professionalProfile?: {
    id: string;
    companyName: string;
    sector: string | null;
    taxId: string | null;
    ice: string | null;
    tradeRegister: string | null;
    contactPerson: string;
    billingAddress: string | null;
    documentUrls: string[];
    validationStatus: ProValidationStatus;
    validatedAt: Date | null;
    rejectionReason: string | null;
  } | null;
};

type UserWithProfiles = {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  locale: Locale;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  individualProfile?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  professionalProfile?: {
    id: string;
    companyName: string;
    sector: string | null;
    taxId: string | null;
    ice: string | null;
    tradeRegister: string | null;
    contactPerson: string;
    billingAddress: string | null;
    documentUrls: string[];
    validationStatus: ProValidationStatus;
    validatedAt: Date | null;
    rejectionReason: string | null;
  } | null;
};

export function toSafeUser(user: UserWithProfiles): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
