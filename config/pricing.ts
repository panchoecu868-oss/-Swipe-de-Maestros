/** Precios mostrados en la landing. El cobro real lo definen los planes creados en Whop. */
export const PRICING = {
  currency: "USD",
  monthly: { price: 25, label: "Mensual", period: "mes" },
  yearly: { price: 125, label: "Anual", period: "año" },
} as const;
export type PlanKind = "monthly" | "yearly";
