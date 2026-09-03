export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          document_id: string | null
          id: string
          ip: string | null
          meta: Json
          owner_id: string | null
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          owner_id?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          owner_id?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          contato: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          observacoes: string | null
          owner_id: string
          razao_social: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          owner_id: string
          razao_social: string
          telefone?: string | null
          tipo?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          owner_id?: string
          razao_social?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: []
      }
      contract_audits: {
        Row: {
          company_id: string | null
          created_at: string
          document_id: string | null
          file_name: string
          id: string
          owner_id: string
          result: Json
          summary: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          file_name: string
          id?: string
          owner_id: string
          result?: Json
          summary?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          file_name?: string
          id?: string
          owner_id?: string
          result?: Json
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean
          company_id: string | null
          created_at: string
          document_id: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          notice_days: number | null
          number: string | null
          owner_id: string
          responsible: string | null
          start_date: string | null
          status: string
          type: string | null
          value: number | null
        }
        Insert: {
          auto_renew?: boolean
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          notice_days?: number | null
          number?: string | null
          owner_id: string
          responsible?: string | null
          start_date?: string | null
          status?: string
          type?: string | null
          value?: number | null
        }
        Update: {
          auto_renew?: boolean
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          notice_days?: number | null
          number?: string | null
          owner_id?: string
          responsible?: string | null
          start_date?: string | null
          status?: string
          type?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_evidence: {
        Row: {
          created_at: string
          document_id: string
          evidence: Json
          final_hash: string | null
          id: string
          owner_id: string
          request_id: string | null
          verification_code: string
        }
        Insert: {
          created_at?: string
          document_id: string
          evidence?: Json
          final_hash?: string | null
          id?: string
          owner_id: string
          request_id?: string | null
          verification_code: string
        }
        Update: {
          created_at?: string
          document_id?: string
          evidence?: Json
          final_hash?: string | null
          id?: string
          owner_id?: string
          request_id?: string | null
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_evidence_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "signing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string | null
          created_at: string
          folder_id: string | null
          hash: string | null
          id: string
          mime_type: string | null
          name: string
          owner_id: string
          page_count: number | null
          signed_storage_path: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
          updated_at: string
          version: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          folder_id?: string | null
          hash?: string | null
          id?: string
          mime_type?: string | null
          name: string
          owner_id: string
          page_count?: number | null
          signed_storage_path?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          folder_id?: string | null
          hash?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          owner_id?: string
          page_count?: number | null
          signed_storage_path?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          public_shared_at: string | null
          public_token: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          public_shared_at?: string | null
          public_token?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          public_shared_at?: string | null
          public_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auto_sync: boolean
          config: Json
          connected: boolean
          created_at: string
          id: string
          owner_id: string
          provider: string
          root_folder: string | null
        }
        Insert: {
          auto_sync?: boolean
          config?: Json
          connected?: boolean
          created_at?: string
          id?: string
          owner_id: string
          provider: string
          root_folder?: string | null
        }
        Update: {
          auto_sync?: boolean
          config?: Json
          connected?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          provider?: string
          root_folder?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          plan: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          plan?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plan?: string
        }
        Relationships: []
      }
      signature_fields: {
        Row: {
          h: number
          id: string
          owner_id: string
          page: number
          request_id: string
          required: boolean
          signer_id: string | null
          type: string
          value: string | null
          w: number
          x: number
          y: number
        }
        Insert: {
          h?: number
          id?: string
          owner_id: string
          page?: number
          request_id: string
          required?: boolean
          signer_id?: string | null
          type?: string
          value?: string | null
          w?: number
          x?: number
          y?: number
        }
        Update: {
          h?: number
          id?: string
          owner_id?: string
          page?: number
          request_id?: string
          required?: boolean
          signer_id?: string | null
          type?: string
          value?: string | null
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "signature_fields_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "signing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_fields_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "signers"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          created_at: string
          hash: string | null
          id: string
          image_data: string | null
          owner_id: string
          request_id: string
          signer_id: string
          typed_name: string | null
        }
        Insert: {
          created_at?: string
          hash?: string | null
          id?: string
          image_data?: string | null
          owner_id: string
          request_id: string
          signer_id: string
          typed_name?: string | null
        }
        Update: {
          created_at?: string
          hash?: string | null
          id?: string
          image_data?: string | null
          owner_id?: string
          request_id?: string
          signer_id?: string
          typed_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "signing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "signers"
            referencedColumns: ["id"]
          },
        ]
      }
      signers: {
        Row: {
          accepted_terms: boolean
          auth_method: string
          cpf: string | null
          created_at: string
          device: string | null
          email: string
          geo: string | null
          id: string
          ip: string | null
          name: string
          order_index: number
          owner_id: string
          phone: string | null
          photo_id_path: string | null
          request_id: string
          required: boolean
          revoked: boolean
          selfie_path: string | null
          signed_at: string | null
          status: string
          token: string
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_terms?: boolean
          auth_method?: string
          cpf?: string | null
          created_at?: string
          device?: string | null
          email: string
          geo?: string | null
          id?: string
          ip?: string | null
          name: string
          order_index?: number
          owner_id: string
          phone?: string | null
          photo_id_path?: string | null
          request_id: string
          required?: boolean
          revoked?: boolean
          selfie_path?: string | null
          signed_at?: string | null
          status?: string
          token: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_terms?: boolean
          auth_method?: string
          cpf?: string | null
          created_at?: string
          device?: string | null
          email?: string
          geo?: string | null
          id?: string
          ip?: string | null
          name?: string
          order_index?: number
          owner_id?: string
          phone?: string | null
          photo_id_path?: string | null
          request_id?: string
          required?: boolean
          revoked?: boolean
          selfie_path?: string | null
          signed_at?: string | null
          status?: string
          token?: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "signing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string
          expires_at: string | null
          id: string
          message: string | null
          mode: string
          owner_id: string
          require_geo: boolean
          require_photo_id: boolean
          require_selfie: boolean
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id: string
          expires_at?: string | null
          id?: string
          message?: string | null
          mode?: string
          owner_id: string
          require_geo?: boolean
          require_photo_id?: boolean
          require_selfie?: boolean
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          mode?: string
          owner_id?: string
          require_geo?: boolean
          require_photo_id?: boolean
          require_selfie?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "signing_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
