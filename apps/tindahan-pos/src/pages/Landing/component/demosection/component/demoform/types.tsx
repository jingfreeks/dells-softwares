export interface DemoFormFields {
  name: string;
  businessName: string;
  mobile: string;
  email: string;
  businessType: string;
  locations: string;
  message: string;
  consent: boolean;
}

export type DemoFormErrors = Partial<Record<keyof DemoFormFields, string>>;

export const BUSINESS_TYPES = [
  "Sari-sari store",
  "Mini grocery",
  "Canteen or eatery",
  "Bakery",
  "Hardware",
  "Pharmacy",
  "Other retail",
];

export const LOCATION_OPTIONS = ["Just one", "2 to 5", "More than 5"];
