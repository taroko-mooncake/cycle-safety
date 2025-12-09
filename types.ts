export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface AnalysisResult {
  licensePlate: string;
  vehicleDescription: string;
  violationType?: string;
}

export interface ViolationReport {
  id: string;
  timestamp: string;
  location: GeoLocation | null;
  analysis: AnalysisResult;
  userReportedViolation: string;
  recipientEmail: string;
  imageUrl?: string; // Base64 string for preview
}