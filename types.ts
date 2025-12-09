export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface AnalysisResult {
  licensePlate: string;
  vehicleDescription: string;
  violationType?: string;
}

export interface OfficialCitation {
  jurisdiction: string;
  code: string;
  description: string;
  fine?: string;
}

export interface Jurisdiction {
  state: string;
  city: string;
  email: string;
}

export interface ViolationReport {
  id: string;
  timestamp: string;
  timestampSource?: 'metadata' | 'submission';
  location: GeoLocation | null;
  locationSource: 'image' | 'device' | 'manual' | null;
  analysis: AnalysisResult;
  userReportedViolation: string;
  recipientEmail: string;
  imageUrl?: string; // Base64 string for preview
  officialCitation?: OfficialCitation | null;
  jurisdiction?: Jurisdiction;
}