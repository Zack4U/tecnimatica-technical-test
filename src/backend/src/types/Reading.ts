export type Reading = {
  id:            string;
  monitoring_id: string;
  value:         number;
  recorded_at:   string;
};

export type ReadingResponse = Reading;

export type CreateReadingDto = {
  monitoring_id: string;
  value:         number;
  recorded_at?:  string;
};

export type ReadingWithContext = ReadingResponse & {
  monitoring: {
    id:              string;
    reading_type:    string;
    threshold_value: number;
    status:          string;
    sensor:          { id: string; name: string; type: string; };
    zone:            { id: string; name: string; };
  };
};

export type CreateReadingsBatchDto = {
  readings: CreateReadingDto[];
};
