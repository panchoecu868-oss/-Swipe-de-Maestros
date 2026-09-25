import type { PlanKind } from "@/config/pricing";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "expired";

export interface VerifiedEvent {
  /** Id único de la entrega (idempotencia). */
  eventId: string;
  type: string;
  /** Referencia a la membresía/suscripción en el proveedor, si el evento la trae. */
  membershipId: string | null;
  payload: Record<string, unknown>;
}

export interface MembershipSnapshot {
  membershipId: string;
  /** Nuestro user id (viaja en metadata desde el checkout). */
  userId: string | null;
  plan: PlanKind | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  raw: unknown;
}

/**
 * Proveedor de pagos. La app solo conoce esta interfaz: cambiar de Whop a otro proveedor
 * es escribir otra implementación, sin tocar el resto.
 */
export interface PaymentProvider {
  name: string;
  createCheckout(input: { plan: PlanKind; userId: string; redirectUrl: string }): Promise<{ url: string }>;
  /** Verifica la firma sobre el body CRUDO. Lanza si es inválida. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): VerifiedEvent;
  /** Estado autoritativo consultado a la API del proveedor (no se confía en el payload). */
  getMembership(membershipId: string): Promise<MembershipSnapshot>;
}
