export type Reading = {
  id:            string;
  monitoring_id: string;
  value:         number;
  recorded_at:   string;
};

export type CreateReadingsBatchDto = {
  readings: { monitoring_id: string; value: number }[];
};

export type BatchReadingsResponse = {
  created: number;
  skipped: number;
  readings: Reading[];
};
