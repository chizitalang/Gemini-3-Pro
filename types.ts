
export interface CredentialRecord {
  id: string;
  username: string;
  password_hash: string; // In a real app, we might store a hash, but for this generator viewing tool we store plain for display (securely handled)
  password_plain: string; // Stored for the purpose of the "View History" feature requested
  created_at: string;
  tags?: string[];
  remark?: string;
  group?: string;
}

export interface GenerateConfig {
  username?: string;
  usernameType: 'manual' | 'pattern';
  usernamePattern?: string;
  length: number;
  useUppercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  remark?: string;
  group?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
