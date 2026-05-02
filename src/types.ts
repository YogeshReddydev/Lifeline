export type UserRole = 'patient' | 'guardian' | 'doctor' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  guardianCode?: string;
  linkedPatients?: string[];
  linkedGuardians?: string[];
  createdAt: string;
  specialization?: string;
  qualification?: string;
  hospital?: string;
  experience?: string;
  licenseNumber?: string;
  isAvailable?: boolean;
  readyForTreatment?: boolean;
  lastCheckupCondition?: string;
}

export interface TriageSession {
  id?: string;
  userId: string;
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  summary: string;
  timestamp: string;
}

export interface MedicineAnalysis {
  id?: string;
  userId: string;
  medicineName: string;
  analysis: {
    usage: string;
    risks: string[];
    warnings: string[];
    precautions: string[];
    dosageRecommendation?: string;
  };
  timestamp: string;
}

export interface SkinAnalysis {
  id?: string;
  userId: string;
  imageUrl: string;
  symptoms: string;
  analysis: {
    condition: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  };
  timestamp: string;
}

export interface SOSAlert {
  id?: string;
  userId: string;
  userName: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  status: 'active' | 'resolved';
  timestamp: string;
}
