import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { handleCategoryEstimate, handleEstimateBundle } from "./http/handlers.js";
import { handleCollectHouseTaxResearch } from "./http/taxResearchHandler.js";

initializeApp();

const runtimeOptions = {
  region: "us-central1",
  cors: false,
  timeoutSeconds: 30,
  memory: "256MiB" as const,
};

export const estimatesBundle = onRequest(runtimeOptions, (req, res) => {
  void handleEstimateBundle(req, res);
});

export const estimatesMortgageRates = onRequest(runtimeOptions, (req, res) => {
  void handleCategoryEstimate(req, res, "mortgage-rates");
});

export const estimatesPropertyTax = onRequest(runtimeOptions, (req, res) => {
  void handleCategoryEstimate(req, res, "property-tax");
});

export const estimatesInsurance = onRequest(runtimeOptions, (req, res) => {
  void handleCategoryEstimate(req, res, "insurance");
});

export const estimatesRent = onRequest(runtimeOptions, (req, res) => {
  void handleCategoryEstimate(req, res, "rent");
});

export const estimatesComps = onRequest(runtimeOptions, (req, res) => {
  void handleCategoryEstimate(req, res, "comps");
});

export const collectHouseTaxResearch = onRequest(runtimeOptions, (req, res) => {
  void handleCollectHouseTaxResearch(req, res);
});
