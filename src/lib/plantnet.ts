/**
 * PlantNet API client for plant identification.
 * Docs: https://my.plantnet.org/doc/openapi
 * Free tier: 500 identifications/day.
 */

import { ProxyAgent } from "undici";

const PLANTNET_BASE = "https://my-api.plantnet.org/v2";
const PROXY_URL = process.env.HTTPS_PROXY || "";

export interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    scientificName: string;
    genus: { scientificNameWithoutAuthor: string };
    family: { scientificNameWithoutAuthor: string };
    commonNames: string[];
  };
  images: { url: { o: string; m: string; s: string } }[];
  gbif?: { id: string };
}

export interface PlantNetResponse {
  query: { project: string; images: string[]; organs: string[] };
  language: string;
  preferedReferential: string;
  bestMatch: string;
  results: PlantNetResult[];
  remainingIdentificationRequests: number;
}

export async function identifyPlant(
  imageBase64: string,
  organ: string = "leaf"
): Promise<PlantNetResponse> {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) throw new Error("PLANTNET_API_KEY is not configured");

  // Convert base64 to blob
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const blob = new Blob([buffer], { type: "image/jpeg" });

  const formData = new FormData();
  formData.append("images", blob, "photo.jpg");
  formData.append("organs", organ);

  const url = `${PLANTNET_BASE}/identify/all?include-related-images=true&no-reject=false&nb-results=5&lang=ru&type=kt&api-key=${apiKey}`;

  // Optional egress proxy for external APIs
  const dispatcher = process.env.NODE_ENV === "production" && PROXY_URL
    ? new ProxyAgent(PROXY_URL)
    : undefined;

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    // @ts-expect-error undici dispatcher option for Node.js fetch
    dispatcher,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PlantNet API error ${res.status}: ${text}`);
  }

  return res.json();
}
