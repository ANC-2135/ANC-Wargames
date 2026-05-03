// Shared types and contracts between client and server.

export type TeamId = string;

/** Body the client POSTs to /api/clicks. */
export interface ClickInput {
  teamId: TeamId;
  q: number;
  r: number;
}

/** Row returned by the server (and stored in SQLite). */
export interface Click {
  id: number;
  teamId: TeamId;
  q: number;
  r: number;
  createdAt: string; // ISO 8601 (sqlite datetime('now'))
}
