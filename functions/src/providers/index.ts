import { compsProvider } from "./comps.js";
import { insuranceProvider } from "./insurance.js";
import { mortgageRatesProvider } from "./mortgageRates.js";
import { propertyTaxProvider } from "./propertyTax.js";
import { rentEstimateProvider } from "./rentEstimate.js";
import type { CategoryEstimateProvider } from "./types.js";

export const categoryProviders: CategoryEstimateProvider[] = [
  mortgageRatesProvider,
  propertyTaxProvider,
  insuranceProvider,
  rentEstimateProvider,
  compsProvider,
];

export const categoryProviderByRoute = new Map<string, CategoryEstimateProvider>([
  ["mortgage-rates", mortgageRatesProvider],
  ["property-tax", propertyTaxProvider],
  ["insurance", insuranceProvider],
  ["rent", rentEstimateProvider],
  ["comps", compsProvider],
]);
