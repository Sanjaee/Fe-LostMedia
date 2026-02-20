export interface Room {
  id: string;
  name: string;
  description?: string;
  max_participants?: number;
  participant_count: number;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  max_participants?: number;
}

export interface JoinRoomResponse {
  url: string;
  token: string;
}
