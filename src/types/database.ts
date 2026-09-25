// Migration-aligned types; regenerate against Supabase after applying migrations.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type CredentialType = 'COURSE_CERTIFICATE' | 'INTERNSHIP' | 'EMPLOYMENT' | 'CONTRIBUTION' | 'BUG_BOUNTY' | 'APPRECIATION' | 'ACHIEVEMENT';
export type CredentialStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ISSUED' | 'EXPIRED' | 'REVOKED';
export type BadgeCategory = 'COURSE' | 'SECURITY' | 'CONTRIBUTION' | 'INTERNSHIP' | 'RECOGNITION';
export type CredentialCategory = 'COURSE' | 'INTERNSHIP' | 'EMPLOYMENT' | 'CONTRIBUTION' | 'APPRECIATION' | 'BUG_BOUNTY' | 'ACHIEVEMENT';
export type IssuerRole = 'ISSUER' | 'REVIEWER' | 'ADMIN';
export type OrganizationType = 'SECURITY_COMPANY'|'UNIVERSITY'|'TRAINING_PROVIDER'|'CORPORATE'|'COMMUNITY';
export type OrganizationVerifiedStatus = 'PENDING'|'VERIFIED'|'SUSPENDED';
export type OrganizationMemberRole = 'ADMIN'|'REVIEWER'|'ISSUER'|'VIEWER';
export type OrganizationMemberStatus = 'INVITED'|'ACTIVE'|'SUSPENDED';
export type Database = { public: { Tables: {
profiles: {
Row: { headline: string | null; country: string | null; portfolio_url: string | null; visibility: "public" | "private"; avatar_updated_at: string | null; id: string; full_name: string; username: string | null; avatar_url: string | null; bio: string | null; linkedin_url: string | null; github_url: string | null; website_url: string | null; created_at: string; updated_at: string };
Insert: { headline?: string | null; country?: string | null; portfolio_url?: string | null; visibility?: "public" | "private"; avatar_updated_at?: string | null; id: string; full_name?: string; username?: string | null; avatar_url?: string | null; bio?: string | null; linkedin_url?: string | null; github_url?: string | null; website_url?: string | null; created_at?: string; updated_at?: string };
Update: { headline?: string | null; country?: string | null; portfolio_url?: string | null; visibility?: "public" | "private"; avatar_updated_at?: string | null; id?: string; full_name?: string; username?: string | null; avatar_url?: string | null; bio?: string | null; linkedin_url?: string | null; github_url?: string | null; website_url?: string | null; created_at?: string; updated_at?: string };
Relationships: [];
};
credentials: {
Row: { id: string; credential_id: string; certificate_slug: string; owner_id: string; issuer_id: string | null; organization_id: string; issuer_user_id: string | null; approved_by: string | null; credential_type: CredentialType; category: CredentialCategory; title: string; description: string | null; issue_date: string; expiry_date: string | null; status: CredentialStatus; issued_at: string | null; revoked_at: string | null; revocation_reason: string | null; certificate_file_url: string | null; verification_hash: string; public_visible: boolean; public_holder_name: string | null; created_at: string; updated_at: string };
Insert: { id?: string; credential_id?: string; certificate_slug?: string; owner_id: string; issuer_id?: string | null; organization_id: string; issuer_user_id?: string | null; approved_by?: string | null; credential_type: CredentialType; category: CredentialCategory; title: string; description?: string | null; issue_date: string; expiry_date?: string | null; status?: CredentialStatus; issued_at?: string | null; revoked_at?: string | null; revocation_reason?: string | null; certificate_file_url?: string | null; verification_hash?: string; public_visible?: boolean; public_holder_name?: string | null; created_at?: string; updated_at?: string };
Update: { id?: string; credential_id?: string; certificate_slug?: string; owner_id?: string; issuer_id?: string | null; organization_id?: string; issuer_user_id?: string | null; approved_by?: string | null; credential_type?: CredentialType; category?: CredentialCategory; title?: string; description?: string | null; issue_date?: string; expiry_date?: string | null; status?: CredentialStatus; issued_at?: string | null; revoked_at?: string | null; revocation_reason?: string | null; certificate_file_url?: string | null; verification_hash?: string; public_visible?: boolean; public_holder_name?: string | null; created_at?: string; updated_at?: string };
Relationships: [{ foreignKeyName: "credentials_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
};
organizations: {
Row:{id:string;name:string;slug:string;logo_url:string|null;description:string|null;website:string|null;organization_type:OrganizationType;verified_status:OrganizationVerifiedStatus;created_at:string;updated_at:string};
Insert:{id?:string;name:string;slug:string;logo_url?:string|null;description?:string|null;website?:string|null;organization_type:OrganizationType;verified_status?:OrganizationVerifiedStatus;created_at?:string;updated_at?:string};
Update:{id?:string;name?:string;slug?:string;logo_url?:string|null;description?:string|null;website?:string|null;organization_type?:OrganizationType;verified_status?:OrganizationVerifiedStatus;created_at?:string;updated_at?:string};Relationships:[];
};
organization_members:{
Row:{id:string;organization_id:string;user_id:string;role:OrganizationMemberRole;status:OrganizationMemberStatus;created_at:string};
Insert:{id?:string;organization_id:string;user_id:string;role:OrganizationMemberRole;status?:OrganizationMemberStatus;created_at?:string};
Update:{id?:string;organization_id?:string;user_id?:string;role?:OrganizationMemberRole;status?:OrganizationMemberStatus;created_at?:string};Relationships:[];
};
certificate_templates:{
Row:{id:string;name:string;type:CredentialType;description:string|null;template_file:string;preview_image:string|null;is_active:boolean;created_at:string;updated_at:string};
Insert:{id?:string;name:string;type:CredentialType;description?:string|null;template_file:string;preview_image?:string|null;is_active?:boolean;created_at?:string;updated_at?:string};
Update:{id?:string;name?:string;type?:CredentialType;description?:string|null;template_file?:string;preview_image?:string|null;is_active?:boolean;created_at?:string;updated_at?:string};Relationships:[];
};
credential_issuers: {
Row: { id: string; user_id: string; issuer_name: string; role: IssuerRole; active: boolean; created_at: string; updated_at: string };
Insert: { id?: string; user_id: string; issuer_name?: string; role?: IssuerRole; active?: boolean; created_at?: string; updated_at?: string };
Update: { id?: string; user_id?: string; issuer_name?: string; role?: IssuerRole; active?: boolean; created_at?: string; updated_at?: string };
Relationships: [];
};
credential_events: {
Row: { id: string; credential_id: string; actor_user_id: string | null; event_type: string; from_status: CredentialStatus | null; to_status: CredentialStatus | null; details: Json; created_at: string };
Insert: { id?: string; credential_id: string; actor_user_id?: string | null; event_type: string; from_status?: CredentialStatus | null; to_status?: CredentialStatus | null; details?: Json; created_at?: string };
Update: never;
Relationships: [];
};
badges: {
Row: { id: string; name: string; slug: string; description: string | null; category: BadgeCategory; level: string | null; icon_url: string; active: boolean; created_at: string };
Insert: { id?: string; name: string; slug: string; description?: string | null; category: BadgeCategory; level?: string | null; icon_url: string; active?: boolean; created_at?: string };
Update: { id?: string; name?: string; slug?: string; description?: string | null; category?: BadgeCategory; level?: string | null; icon_url?: string; active?: boolean; created_at?: string };
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
find_candidate_for_issuance: { Args: {candidate_email: string}; Returns: Json };
is_active_issuer: { Args: {allowed_roles?: IssuerRole[]}; Returns: boolean };
is_organization_member:{Args:{target_org:string;allowed_roles?:OrganizationMemberRole[]};Returns:boolean};
has_organization_role:{Args:{allowed_roles?:OrganizationMemberRole[]};Returns:boolean};
admin_update_organization_status:{Args:{actor_user:string;target_organization:string;new_status:OrganizationVerifiedStatus};Returns:Json};
admin_upsert_organization_member:{Args:{actor_user:string;target_organization:string;target_user:string;new_role:OrganizationMemberRole;new_status?:OrganizationMemberStatus};Returns:Json};
admin_remove_organization_member:{Args:{actor_user:string;target_membership:string};Returns:Json};
admin_create_organization:{Args:{actor_user:string;new_name:string;new_slug:string;new_type:OrganizationType;new_description?:string|null;new_website?:string|null;new_status?:OrganizationVerifiedStatus};Returns:Json};
make_certificate_slug:{Args:{new_title:string;public_id:string};Returns:string};
create_credential_draft: { Args: {actor_user:string;target_organization?:string;recipient_user:string;new_type:CredentialType;new_category:CredentialCategory;new_title:string;new_description:string|null;new_issue_date:string;new_expiry_date:string|null;new_badge?:string|null}; Returns: Json };
transition_credential: { Args: {actor_user:string;target_credential:string;requested_action:string;reason?:string|null}; Returns: Json };
is_email_registered: { Args: {email_to_check: string}; Returns: boolean };
registration_email_state: { Args: {email_to_check: string}; Returns: string };
verify_public_credential: { Args: {requested_id: string; requester_hash: string}; Returns: Json };
prune_verification_activity: { Args: Record<string, never>; Returns: undefined };
}; Enums: {credential_type: CredentialType; credential_status: CredentialStatus; badge_category: BadgeCategory; credential_category: CredentialCategory; issuer_role: IssuerRole;organization_type:OrganizationType;organization_verified_status:OrganizationVerifiedStatus;organization_member_role:OrganizationMemberRole;organization_member_status:OrganizationMemberStatus}; CompositeTypes: Record<string, never>; } };
