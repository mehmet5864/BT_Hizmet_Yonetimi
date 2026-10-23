export type ReportColumn = { key: string; label: string };

export type ReportTable = {
  id: string;
  title: string;
  description: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
  /** Özet kutusu (KPI): rapor başında gösterilir */
  summary?: { label: string; value: string }[];
  /** Yöntem / hesap notları */
  notes?: string[];
  /** Raporu alan kişi */
  generatedBy?: string;
  /** Uygulanan filtrelerin metni */
  scope?: string;
};

export type ReportFormat = "csv" | "pdf" | "docx";

export type ReportFilterOption = { value: string; label: string };

export type ReportFilterDef = {
  key: string;
  label: string;
  kind: "text" | "select" | "date";
  placeholder?: string;
  options?: ReportFilterOption[];
  /** Sayfada katalogdan doldurulur */
  optionSource?: "departments" | "vendors";
};

export type ReportFilters = {
  q?: string;
  departmentId?: string;
  assetType?: string;
  office?: string;
  status?: string;
  severity?: string;
  criticality?: string;
  role?: string;
  source?: string;
  kind?: string;
  dateFrom?: string;
  dateTo?: string;
  vendorId?: string;
};

export type ReportDef = {
  id: string;
  title: string;
  description: string;
  group: string;
  filters?: ReportFilterDef[];
};
