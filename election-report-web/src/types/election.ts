import type { PledgeContentSection } from "../lib/pledge-content";

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
  detailSections?: PledgeContentSection[];
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

export type CandidateElectionResult = {
  elected: boolean | null;
  voteCount?: number;
  voteRate?: number;
  rank?: number;
};

export type CandidateElectionResultStatus =
  | "ELECTED"
  | "NOT_ELECTED"
  | "UNKNOWN";

export type CandidateCriminalRecordStatus =
  | "HAS_RECORD"
  | "NONE"
  | "UNKNOWN"
  | "UNAVAILABLE";

export type CandidateCriminalRecordDisclosure = {
  analyzedAt?: string;
  excerpt?: string;
  offenses: string[];
  pageCount?: number;
  punishments: string[];
  recordCount?: number;
  sourceMaterialId?: string;
  sourceMaterialPath?: string;
  status: CandidateCriminalRecordStatus;
  summary: string;
  textCharCount?: number;
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
  result?: CandidateElectionResult;
  criminalRecord?: CandidateCriminalRecordDisclosure;
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
