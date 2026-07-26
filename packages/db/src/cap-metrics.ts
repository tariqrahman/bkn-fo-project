export const CAP_METRIC_LABELS: Record<string, string> = {
  salary_cap: "Salary Cap",
  cap_room: "Cap Room",
  luxury_tax: "Luxury Tax",
  tax_room: "Tax Room",
  luxury_tax_bill: "Luxury Tax Bill (Est.)",
  first_apron: "1st Apron",
  first_apron_room: "1st Apron Room",
  second_apron: "2nd Apron",
  second_apron_room: "2nd Apron Room",
  likely_bonuses: "Likely Bonuses Total",
  unlikely_bonuses: "Unlikely Bonuses Total",
};

export const CAP_METRIC_ORDER = [
  "salary_cap",
  "cap_room",
  "luxury_tax",
  "tax_room",
  "luxury_tax_bill",
  "first_apron",
  "first_apron_room",
  "second_apron",
  "second_apron_room",
  "likely_bonuses",
  "unlikely_bonuses",
] as const;
