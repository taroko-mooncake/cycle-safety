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

export async function getJurisdictionEmail(lat: number, lon: number): Promise<string> {
  try {
    // Using OpenStreetMap Nominatim for reverse geocoding (free, requires User-Agent)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'TrafficWatchAI/1.0',
        },
      }
    );

    if (!response.ok) {
      return DEFAULT_EMAIL;
    }

    const data = await response.json();
    const address = data.address || {};
    
    // Check specific city first, then state
    const city = address.city || address.town || address.village || "";
    const state = address.state || "";

    // Specific City Logic
    if (city === "Washington" && state === "District of Columbia") return "dpw@dc.gov";
    if (city === "New York") return "311@nyc.gov";
    if (city === "San Francisco") return "311@sfgov.org";

    // State Logic
    if (state && EMAIL_MAPPING[state]) {
      return EMAIL_MAPPING[state];
    }

    return DEFAULT_EMAIL;
  } catch (error) {
    console.error("Error fetching jurisdiction:", error);
    return DEFAULT_EMAIL;
  }
}