// Migration-aligned types; regenerate against Supabase after applying migrations.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type CredentialType = 'COURSE_CERTIFICATE' | 'INTERNSHIP' | 'EMPLOYMENT' | 'CONTRIBUTION' | 'BUG_BOUNTY' | 'APPRECIATION' | 'ACHIEVEMENT';
export type CredentialStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
export type BadgeCategory = 'COURSE' | 'SECURITY' | 'CONTRIBUTION' | 'INTERNSHIP' | 'RECOGNITION';
export type Database = { public: { Tables: {
profiles: {
Row: { headline: string | null; country: string | null; portfolio_url: string | null; visibility: "public" | "private"; avatar_updated_at: string | null; id: string; full_name: string; username: string | null; avatar_url: string | null; bio: string | null; linkedin_url: string | null; github_url: string | null; website_url: string | null; created_at: string; updated_at: string };
Insert: { headline?: string | null; country?: string | null; portfolio_url?: string | null; visibility?: "public" | "private"; avatar_updated_at?: string | null; id: string; full_name?: string; username?: string | null; avatar_url?: string | null; bio?: string | null; linkedin_url?: string | null; github_url?: string | null; website_url?: string | null; created_at?: string; updated_at?: string };
Update: { headline?: string | null; country?: string | null; portfolio_url?: string | null; visibility?: "public" | "private"; avatar_updated_at?: string | null; id?: string; full_name?: string; username?: string | null; avatar_url?: string | null; bio?: string | null; linkedin_url?: string | null; github_url?: string | null; website_url?: string | null; created_at?: string; updated_at?: string };
Relationships: [];
};
credentials: {
Row: { id: string; credential_id: string; owner_id: string; credential_type: CredentialType; title: string; description: string | null; issue_date: string; expiry_date: string | null; status: CredentialStatus; certificate_file_url: string | null; verification_hash: string; public_visible: boolean; public_holder_name: string | null; created_at: string; updated_at: string };
Insert: { id?: string; credential_id?: string; owner_id: string; credential_type: CredentialType; title: string; description?: string | null; issue_date: string; expiry_date?: string | null; status?: CredentialStatus; certificate_file_url?: string | null; verification_hash?: string; public_visible?: boolean; public_holder_name?: string | null; created_at?: string; updated_at?: string };
Update: { id?: string; credential_id?: string; owner_id?: string; credential_type?: CredentialType; title?: string; description?: string | null; issue_date?: string; expiry_date?: string | null; status?: CredentialStatus; certificate_file_url?: string | null; verification_hash?: string; public_visible?: boolean; public_holder_name?: string | null; created_at?: string; updated_at?: string };
Relationships: [{ foreignKeyName: "credentials_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
};
badges: {
Row: { id: string; name: string; slug: string; description: string | null; category: BadgeCategory; level: string | null; icon_url: string; created_at: string };
Insert: { id?: string; name: string; slug: string; description?: string | null; category: BadgeCategory; level?: string | null; icon_url: string; created_at?: string };
Update: { id?: string; name?: string; slug?: string; description?: string | null; category?: BadgeCategory; level?: string | null; icon_url?: string; created_at?: string };
Relationships: [];
};
credential_badges: {
Row: { credential_id: string; badge_id: string };
Insert: { credential_id: string; badge_id: string };
Update: { credential_id?: string; badge_id?: string };
Relationships: [{ foreignKeyName: "credential_badges_credential_id_fkey"; columns: ["credential_id"]; isOneToOne: false; referencedRelation: "credentials"; referencedColumns: ["id"] }, { foreignKeyName: "credential_badges_badge_id_fkey"; columns: ["badge_id"]; isOneToOne: false; referencedRelation: "badges"; referencedColumns: ["id"] }];
};
verification_logs: {
Row: { id: string; credential_id: string | null; ip_address: string | null; country: string | null; user_agent: string | null; verified_at: string; outcome: string };
Insert: { id?: string; credential_id?: string | null; ip_address?: string | null; country?: string | null; user_agent?: string | null; verified_at?: string; outcome: string };
Update: { id?: string; credential_id?: string | null; ip_address?: string | null; country?: string | null; user_agent?: string | null; verified_at?: string; outcome?: string };
Relationships: [{ foreignKeyName: "verification_logs_credential_id_fkey"; columns: ["credential_id"]; isOneToOne: false; referencedRelation: "credentials"; referencedColumns: ["id"] }];
};
verification_rate_limits: {
Row: { requester_hash: string; window_start: string; attempts: number };
Insert: { requester_hash: string; window_start: string; attempts: number };
Update: { requester_hash?: string; window_start?: string; attempts?: number };
Relationships: [];
};
}; Views: Record<string, never>; Functions: {
get_public_profile: { Args: {requested_username: string}; Returns: Json };
is_email_registered: { Args: {email_to_check: string}; Returns: boolean };
registration_email_state: { Args: {email_to_check: string}; Returns: string };
verify_public_credential: { Args: {requested_id: string; requester_hash: string}; Returns: Json };
prune_verification_activity: { Args: Record<string, never>; Returns: undefined };
}; Enums: {credential_type: CredentialType; credential_status: CredentialStatus; badge_category: BadgeCategory}; CompositeTypes: Record<string, never>; } };
