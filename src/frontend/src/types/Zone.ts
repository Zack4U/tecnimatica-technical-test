export type ZoneOperationalStatus = 'active' | 'inactive';

export type ZoneResponse = {
  id: string;
  name: string;
  description: string | null;
  location: string;
  operational_status: ZoneOperationalStatus;
  created_at: string;
};
