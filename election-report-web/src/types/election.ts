export type OfficeType =
  | "governor"
  | "municipal_mayor"
  | "education_superintendent";

export type MaterialStatus = "pending" | "collected" | "analyzed";

export type MaterialDownloadStatus =
  | "METADATA_ONLY"
  | "DOWNLOADED"
  | "FAILED"
  | "SKIPPED_NO_URL";

export type CandidateCampaignMaterial = {
  id: string;
  materialType: string;
  title: string;
  sourceUrl?: string;
  sourceFilePath?: string;
  storagePath?: string;
  sha256?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  downloadStatus: MaterialDownloadStatus | string;
  metadataCollectedAt?: string;
  collectedAt?: string;
};

export type Pledge = {
  id: string;
  title: string;
  summary: string;
  category: string;
  details: string[];
};

export type CampaignMaterialAnalysis = {
  status: MaterialStatus;
  pdfUrl?: string;
  pageCount?: number;
  materialCount?: number;
  metadataCollectedCount?: number;
  downloadedCount?: number;
  materials?: CandidateCampaignMaterial[];
  dominantColors: string[];
  fontNotes: string;
  layoutNotes: string;
};

export type Candidate = {
  id: string;
  electionId: string;
  electionName: string;
  officeType: OfficeType;
  officeName: string;
  regionName: string;
  districtName?: string;
  partyName: string;
  candidateName: string;
  ballotNumber: string;
  status: "mock" | "registered" | "withdrawn" | "invalid";
  age: number;
  gender: "남" | "여";
  job: string;
  education: string;
  careers: string[];
  pledges: Pledge[];
  material: CampaignMaterialAnalysis;
  source: {
    candidateApiId?: string;
    pledgeApiId?: string;
    fetchedAt?: string;
  };
};

export type ElectionSummary = {
  totalCandidates: number;
  totalPledges: number;
  collectedMaterials: number;
  byOffice: Array<{
    officeType: OfficeType;
    label: string;
    count: number;
  }>;
  byRegion: Array<{
    regionName: string;
    count: number;
  }>;
};
