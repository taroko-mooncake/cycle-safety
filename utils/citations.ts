import { OfficialCitation } from '../types';

const DC_CITATIONS: Record<string, Partial<OfficialCitation>> = {
  "Stopping in Bicycle Lane": {
    code: "18-2405.1(g)",
    description: "Stopping, standing, or parking in a bicycle lane",
    fine: "$150"
  },
  "Blocking Crosswalk": {
    code: "18-2405.1(e)",
    description: "Stopping, standing, or parking in a crosswalk",
    fine: "$100"
  },
  "Improper Parking": {
    code: "18-2400",
    description: "Improper parking violation",
    fine: "$50"
  },
  "Using Phone Whilst Driving": {
     code: "50-1731.04",
     description: "Distracted Driving (Cell Phone)",
     fine: "$100"
  },
  "Running Red Light": {
    code: "18-2103.7",
    description: "Passing a red light or steady red arrow",
    fine: "$150"
  },
  "Dangerous Driving": {
    code: "50-2201.04",
    description: "Reckless driving",
    fine: "Court Appearance"
  }
};

export function getOfficialCitation(state: string, city: string, violation: string): OfficialCitation | null {
  if (!violation) return null;

  // Normalize checking for DC
  const isDC = 
    state === "District of Columbia" || 
    state === "DC" ||
    city === "Washington" || 
    (city === "Washington" && state === "District of Columbia");
  
  if (isDC) {
     let match = DC_CITATIONS[violation];

     // If no exact match, try fuzzy matching against keys or common terms
     // This helps when the AI returns "Car parked in bike lane" instead of the exact dropdown string
     if (!match) {
        const lowerV = violation.toLowerCase();
        
        if (lowerV.includes("bike lane") || lowerV.includes("bicycle lane")) {
          match = DC_CITATIONS["Stopping in Bicycle Lane"];
        } else if (lowerV.includes("crosswalk")) {
          match = DC_CITATIONS["Blocking Crosswalk"];
        } else if (lowerV.includes("red light")) {
          match = DC_CITATIONS["Running Red Light"];
        } else if (lowerV.includes("phone") || lowerV.includes("texting") || lowerV.includes("distracted")) {
          match = DC_CITATIONS["Using Phone Whilst Driving"];
        } else if ((lowerV.includes("park") || lowerV.includes("standing")) && (lowerV.includes("illegal") || lowerV.includes("improper") || lowerV.includes("double") || lowerV.includes("no stopping"))) {
          match = DC_CITATIONS["Improper Parking"];
        } else if (lowerV.includes("reckless") || lowerV.includes("dangerous") || lowerV.includes("speeding")) {
          match = DC_CITATIONS["Dangerous Driving"];
        }
     }

     if (match) {
       return {
         jurisdiction: "District of Columbia",
         code: match.code!,
         description: match.description!,
         fine: match.fine
       };
     }
  }
  
  // Future: Add other states/cities here
  
  return null;
}