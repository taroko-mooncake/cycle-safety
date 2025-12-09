import { Jurisdiction } from '../types';

const EMAIL_MAPPING: Record<string, string> = {
  "District of Columbia": "dpw@dc.gov",
  "Washington": "dpw@dc.gov",
  "California": "traffic-safety@dot.ca.gov",
  "New York": "311@nyc.gov",
  "Texas": "contact@txdot.gov",
  "Florida": "communications@dot.state.fl.us",
  "Illinois": "dot.feedback@illinois.gov",
  "Pennsylvania": "penndot@pa.gov",
  "Ohio": "info@dot.ohio.gov",
  "Georgia": "contact@dot.ga.gov",
  "North Carolina": "contact@ncdot.gov",
  "Michigan": "contact@michigan.gov",
};

const DEFAULT_EMAIL = "violations@usa.gov";

export async function getJurisdictionDetails(lat: number, lon: number): Promise<Jurisdiction> {
  const result: Jurisdiction = {
    state: "",
    city: "",
    email: DEFAULT_EMAIL
  };

  try {
    // Using OpenStreetMap Nominatim for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'TrafficWatchAI/1.0',
        },
      }
    );

    if (!response.ok) {
      return result;
    }

    const data = await response.json();
    const address = data.address || {};
    
    // Check specific city first, then state
    const city = address.city || address.town || address.village || "";
    const state = address.state || "";

    result.city = city;
    result.state = state;

    // Specific City Logic for Email
    if (city === "Washington" && state === "District of Columbia") {
        result.email = "dpw@dc.gov";
        return result;
    }
    if (city === "New York") {
        result.email = "311@nyc.gov";
        return result;
    }
    if (city === "San Francisco") {
        result.email = "311@sfgov.org";
        return result;
    }

    // State Logic
    if (state && EMAIL_MAPPING[state]) {
      result.email = EMAIL_MAPPING[state];
    }

    return result;
  } catch (error) {
    console.error("Error fetching jurisdiction:", error);
    return result;
  }
}
