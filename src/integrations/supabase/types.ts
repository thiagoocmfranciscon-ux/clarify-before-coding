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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          doc_type: string
          entity_id: string
          entity_type: string
          external_number: string | null
          file_name: string
          id: string
          mime: string
          organization_id: string
          sha256: string | null
          size_bytes: number
          status: string
          storage_path: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          entity_id: string
          entity_type: string
          external_number?: string | null
          file_name: string
          id?: string
          mime: string
          organization_id: string
          sha256?: string | null
          size_bytes: number
          status?: string
          storage_path: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          entity_id?: string
          entity_type?: string
          external_number?: string | null
          file_name?: string
          id?: string
          mime?: string
          organization_id?: string
          sha256?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          verification_status?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          organization_id?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          created_at: string
          id: string
          items: Json
          machine_type: string
          needs_validation: boolean
          organization_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          machine_type: string
          needs_validation?: boolean
          organization_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          machine_type?: string
          needs_validation?: boolean
          organization_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          answers: Json
          archived_at: string | null
          archived_by: string | null
          bad_count: number
          brand: string | null
          check_date: string
          check_time: string | null
          consultant: string | null
          contract: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_notes: string | null
          customer_signer: string | null
          equipment_id: string | null
          fleet_number: string | null
          hour_meter: number | null
          id: string
          invoice: string | null
          kind: string
          machine_type: string
          model: string | null
          organization_id: string
          responsible_cpf: string | null
          responsible_name: string | null
          serial: string | null
          tech_notes: string | null
          template_id: string
          template_version: number
          types: string[]
          updated_at: string
          version: number
        }
        Insert: {
          answers?: Json
          archived_at?: string | null
          archived_by?: string | null
          bad_count?: number
          brand?: string | null
          check_date?: string
          check_time?: string | null
          consultant?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_signer?: string | null
          equipment_id?: string | null
          fleet_number?: string | null
          hour_meter?: number | null
          id?: string
          invoice?: string | null
          kind: string
          machine_type: string
          model?: string | null
          organization_id: string
          responsible_cpf?: string | null
          responsible_name?: string | null
          serial?: string | null
          tech_notes?: string | null
          template_id: string
          template_version: number
          types?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          answers?: Json
          archived_at?: string | null
          archived_by?: string | null
          bad_count?: number
          brand?: string | null
          check_date?: string
          check_time?: string | null
          consultant?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_signer?: string | null
          equipment_id?: string | null
          fleet_number?: string | null
          hour_meter?: number | null
          id?: string
          invoice?: string | null
          kind?: string
          machine_type?: string
          model?: string | null
          organization_id?: string
          responsible_cpf?: string | null
          responsible_name?: string | null
          serial?: string | null
          tech_notes?: string | null
          template_id?: string
          template_version?: number
          types?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          role: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          city: string | null
          created_at: string
          created_by: string | null
          document: string | null
          id: string
          legal_name: string
          notes: string | null
          organization_id: string
          segment: string | null
          status: string
          trade_name: string | null
          uf: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          id?: string
          legal_name: string
          notes?: string | null
          organization_id?: string
          segment?: string | null
          status?: string
          trade_name?: string | null
          uf?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          id?: string
          legal_name?: string
          notes?: string | null
          organization_id?: string
          segment?: string | null
          status?: string
          trade_name?: string | null
          uf?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          hour_meter: number | null
          hour_meter_at: string | null
          id: string
          manufacturer: string
          model: string
          organization_id: string
          serial: string
          status: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          hour_meter?: number | null
          hour_meter_at?: string | null
          id?: string
          manufacturer: string
          model: string
          organization_id?: string
          serial: string
          status?: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          hour_meter?: number | null
          hour_meter_at?: string | null
          id?: string
          manufacturer?: string
          model?: string
          organization_id?: string
          serial?: string
          status?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      equipment_readings: {
        Row: {
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
          is_correction: boolean
          note: string | null
          organization_id: string
          read_at: string
          value: number
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          is_correction?: boolean
          note?: string | null
          organization_id?: string
          read_at?: string
          value: number
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          is_correction?: boolean
          note?: string | null
          organization_id?: string
          read_at?: string
          value?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_readings_equipment_id_organization_id_fkey"
            columns: ["equipment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          organization_id: string
          phone: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plans: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
          interval_days: number | null
          interval_hours: number | null
          last_done_date: string | null
          last_done_hours: number | null
          last_work_order_id: string | null
          name: string
          organization_id: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          interval_days?: number | null
          interval_hours?: number | null
          last_done_date?: string | null
          last_done_hours?: number | null
          last_work_order_id?: string | null
          name: string
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          interval_days?: number | null
          interval_hours?: number | null
          last_done_date?: string | null
          last_done_hours?: number | null
          last_work_order_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_equipment_id_organization_id_fkey"
            columns: ["equipment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      org_counters: {
        Row: {
          key: string
          organization_id: string
          value: number
        }
        Insert: {
          key: string
          organization_id: string
          value?: number
        }
        Update: {
          key?: string
          organization_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      part_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      part_requests: {
        Row: {
          created_at: string
          id: string
          movement_id: string | null
          note: string | null
          organization_id: string
          part_id: string
          qty: number
          requested_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_id?: string | null
          note?: string | null
          organization_id?: string
          part_id: string
          qty: number
          requested_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_id?: string | null
          note?: string | null
          organization_id?: string
          part_id?: string
          qty?: number
          requested_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_requests_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_requests_part_id_organization_id_fkey"
            columns: ["part_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "part_requests_work_order_id_organization_id_fkey"
            columns: ["work_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      parts: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          category_id: string
          code: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          location: string | null
          min_qty: number
          organization_id: string
          status: string
          supplier_id: string | null
          unit_id: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          category_id: string
          code: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          location?: string | null
          min_qty?: number
          organization_id?: string
          status?: string
          supplier_id?: string | null
          unit_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string | null
          min_qty?: number
          organization_id?: string
          status?: string
          supplier_id?: string | null
          unit_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "parts_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "parts_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "parts_unit_id_organization_id_fkey"
            columns: ["unit_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          must_change_password: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_balances: {
        Row: {
          avg_cost: number
          last_cost: number | null
          organization_id: string
          part_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          last_cost?: number | null
          organization_id: string
          part_id: string
          qty?: number
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          last_cost?: number | null
          organization_id?: string
          part_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_part_id_organization_id_fkey"
            columns: ["part_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          avg_cost_after: number
          balance_after: number
          created_at: string
          created_by: string | null
          document_ref: string | null
          id: string
          idempotency_key: string
          organization_id: string
          part_id: string
          part_request_id: string | null
          qty: number
          reason: string | null
          reversed_movement_id: string | null
          supplier_id: string | null
          total_cost: number
          type: Database["public"]["Enums"]["stock_mov_type"]
          unit_cost: number
          work_order_id: string | null
        }
        Insert: {
          avg_cost_after: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          document_ref?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          part_id: string
          part_request_id?: string | null
          qty: number
          reason?: string | null
          reversed_movement_id?: string | null
          supplier_id?: string | null
          total_cost: number
          type: Database["public"]["Enums"]["stock_mov_type"]
          unit_cost: number
          work_order_id?: string | null
        }
        Update: {
          avg_cost_after?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          document_ref?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          part_id?: string
          part_request_id?: string | null
          qty?: number
          reason?: string | null
          reversed_movement_id?: string | null
          supplier_id?: string | null
          total_cost?: number
          type?: Database["public"]["Enums"]["stock_mov_type"]
          unit_cost?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_part_id_organization_id_fkey"
            columns: ["part_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_reversed_movement_id_fkey"
            columns: ["reversed_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_work_order_id_organization_id_fkey"
            columns: ["work_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          document: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          id?: string
          name: string
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_private: {
        Row: {
          created_at: string
          created_by: string | null
          hourly_cost: number | null
          organization_id: string
          phone: string | null
          technician_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hourly_cost?: number | null
          organization_id?: string
          phone?: string | null
          technician_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hourly_cost?: number | null
          organization_id?: string
          phone?: string | null
          technician_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "technician_private_technician_id_organization_id_fkey"
            columns: ["technician_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      technicians: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          specialty: string | null
          status: string
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "technicians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          allows_fraction: boolean
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          allows_fraction?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id?: string
        }
        Update: {
          allows_fraction?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          kind: string
          odometer: number | null
          organization_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          kind: string
          odometer?: number | null
          organization_id?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          kind?: string
          odometer?: number | null
          organization_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_events_vehicle_id_organization_id_fkey"
            columns: ["vehicle_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      vehicle_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          organization_id: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          organization_id?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          organization_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_organization_id_fkey"
            columns: ["vehicle_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      vehicles: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          driver_technician_id: string | null
          id: string
          insurance_due: string | null
          model: string
          next_service_date: string | null
          next_service_km: number | null
          odometer: number | null
          organization_id: string
          plate: string
          status: string
          type: string
          updated_at: string
          version: number
          year: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          driver_technician_id?: string | null
          id?: string
          insurance_due?: string | null
          model: string
          next_service_date?: string | null
          next_service_km?: number | null
          odometer?: number | null
          organization_id?: string
          plate: string
          status?: string
          type?: string
          updated_at?: string
          version?: number
          year?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          driver_technician_id?: string | null
          id?: string
          insurance_due?: string | null
          model?: string
          next_service_date?: string | null
          next_service_km?: number | null
          odometer?: number | null
          organization_id?: string
          plate?: string
          status?: string
          type?: string
          updated_at?: string
          version?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_technician_id_organization_id_fkey"
            columns: ["driver_technician_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_log_costs: {
        Row: {
          cost: number
          hourly_cost: number
          organization_id: string
          work_log_id: string
        }
        Insert: {
          cost: number
          hourly_cost: number
          organization_id: string
          work_log_id: string
        }
        Update: {
          cost?: number
          hourly_cost?: number
          organization_id?: string
          work_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_log_costs_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: true
            referencedRelation: "work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_logs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          duration_minutes: number | null
          ended_at: string
          id: string
          organization_id: string
          started_at: string
          technician_id: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          duration_minutes?: number | null
          ended_at: string
          id?: string
          organization_id?: string
          started_at: string
          technician_id: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number | null
          ended_at?: string
          id?: string
          organization_id?: string
          started_at?: string
          technician_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_technician_id_organization_id_fkey"
            columns: ["technician_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "work_logs_work_order_id_organization_id_fkey"
            columns: ["work_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      work_order_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_primary: boolean
          organization_id: string
          technician_id: string
          unassigned_at: string | null
          work_order_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_primary?: boolean
          organization_id: string
          technician_id: string
          unassigned_at?: string | null
          work_order_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_primary?: boolean
          organization_id?: string
          technician_id?: string
          unassigned_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_assignments_technician_id_organization_id_fkey"
            columns: ["technician_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_organization_id_fkey"
            columns: ["work_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      work_order_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          organization_id: string
          work_order_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          organization_id?: string
          work_order_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          organization_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_expenses_work_order_id_organization_id_fkey"
            columns: ["work_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      work_order_status_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["wo_status"] | null
          id: string
          organization_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["wo_status"]
          work_order_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["wo_status"] | null
          id?: string
          organization_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["wo_status"]
          work_order_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["wo_status"] | null
          id?: string
          organization_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["wo_status"]
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_status_events_work_order_id_organization_id_fkey"
            columns: ["work_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      work_orders: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          checklist: Json
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          diagnosis: string | null
          diagnosis_started_at: string | null
          due_date: string | null
          equipment_id: string
          execution_started_at: string | null
          hour_meter_reading: number | null
          id: string
          number: string
          opened_at: string
          organization_id: string
          parent_work_order_id: string | null
          priority: Database["public"]["Enums"]["wo_priority"]
          solution: string | null
          status: Database["public"]["Enums"]["wo_status"]
          tech_completed_at: string | null
          type: Database["public"]["Enums"]["wo_type"]
          updated_at: string
          version: number
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          checklist?: Json
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description: string
          diagnosis?: string | null
          diagnosis_started_at?: string | null
          due_date?: string | null
          equipment_id: string
          execution_started_at?: string | null
          hour_meter_reading?: number | null
          id?: string
          number: string
          opened_at?: string
          organization_id: string
          parent_work_order_id?: string | null
          priority?: Database["public"]["Enums"]["wo_priority"]
          solution?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          tech_completed_at?: string | null
          type: Database["public"]["Enums"]["wo_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          checklist?: Json
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string
          diagnosis?: string | null
          diagnosis_started_at?: string | null
          due_date?: string | null
          equipment_id?: string
          execution_started_at?: string | null
          hour_meter_reading?: number | null
          id?: string
          number?: string
          opened_at?: string
          organization_id?: string
          parent_work_order_id?: string | null
          priority?: Database["public"]["Enums"]["wo_priority"]
          solution?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          tech_completed_at?: string | null
          type?: Database["public"]["Enums"]["wo_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_customer_id_organization_id_fkey"
            columns: ["equipment_id", "customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id", "customer_id", "organization_id"]
          },
          {
            foreignKeyName: "work_orders_parent_work_order_id_fkey"
            columns: ["parent_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: never; Returns: Json }
      can_view_wo: { Args: { _wo: string }; Returns: boolean }
      create_work_order: {
        Args: {
          p_customer_id: string
          p_description: string
          p_due_date: string
          p_equipment_id: string
          p_hour_meter: number
          p_parent_id?: string
          p_priority: Database["public"]["Enums"]["wo_priority"]
          p_technician_id: string
          p_type: Database["public"]["Enums"]["wo_type"]
        }
        Returns: {
          cancel_reason: string | null
          canceled_at: string | null
          checklist: Json
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          diagnosis: string | null
          diagnosis_started_at: string | null
          due_date: string | null
          equipment_id: string
          execution_started_at: string | null
          hour_meter_reading: number | null
          id: string
          number: string
          opened_at: string
          organization_id: string
          parent_work_order_id: string | null
          priority: Database["public"]["Enums"]["wo_priority"]
          solution: string | null
          status: Database["public"]["Enums"]["wo_status"]
          tech_completed_at: string | null
          type: Database["public"]["Enums"]["wo_type"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "work_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dashboard_kpis: { Args: { p_from: string; p_to: string }; Returns: Json }
      effective_role: {
        Args: { _r: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      global_search: { Args: { p_q: string }; Returns: Json }
      has_any_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_assigned: { Args: { _wo: string }; Returns: boolean }
      is_member: { Args: { _org: string }; Returns: boolean }
      log_export: {
        Args: { p_kind: string; p_params: Json }
        Returns: undefined
      }
      my_org: { Args: never; Returns: string }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      my_technician_id: { Args: never; Returns: string }
      reject_part_request: {
        Args: { p_id: string; p_note: string }
        Returns: undefined
      }
      stock_move: {
        Args: {
          p_document_ref: string
          p_idempotency_key: string
          p_part_id: string
          p_part_request_id?: string
          p_qty: number
          p_reason: string
          p_reversed_movement_id?: string
          p_supplier_id: string
          p_type: Database["public"]["Enums"]["stock_mov_type"]
          p_unit_cost: number
          p_work_order_id: string
        }
        Returns: {
          avg_cost_after: number
          balance_after: number
          created_at: string
          created_by: string | null
          document_ref: string | null
          id: string
          idempotency_key: string
          organization_id: string
          part_id: string
          part_request_id: string | null
          qty: number
          reason: string | null
          reversed_movement_id: string | null
          supplier_id: string | null
          total_cost: number
          type: Database["public"]["Enums"]["stock_mov_type"]
          unit_cost: number
          work_order_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wo_allowed_next: {
        Args: { p_from: Database["public"]["Enums"]["wo_status"] }
        Returns: Database["public"]["Enums"]["wo_status"][]
      }
      wo_assign: {
        Args: {
          p_primary: boolean
          p_remove?: boolean
          p_technician_id: string
          p_wo: string
        }
        Returns: undefined
      }
      wo_costs: { Args: { p_wo: string }; Returns: Json }
      wo_transition: {
        Args: {
          p_expected_version: number
          p_reason: string
          p_return_parts?: boolean
          p_to: Database["public"]["Enums"]["wo_status"]
          p_wo: string
        }
        Returns: {
          cancel_reason: string | null
          canceled_at: string | null
          checklist: Json
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          diagnosis: string | null
          diagnosis_started_at: string | null
          due_date: string | null
          equipment_id: string
          execution_started_at: string | null
          hour_meter_reading: number | null
          id: string
          number: string
          opened_at: string
          organization_id: string
          parent_work_order_id: string | null
          priority: Database["public"]["Enums"]["wo_priority"]
          solution: string | null
          status: Database["public"]["Enums"]["wo_status"]
          tech_completed_at: string | null
          type: Database["public"]["Enums"]["wo_type"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "work_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "tecnico"
        | "almoxarife"
        | "leitura"
        | "ceo"
        | "diretor_comercial"
        | "gestor_manutencao"
        | "almoxarifado"
      stock_mov_type:
        | "abertura"
        | "entrada"
        | "saida"
        | "ajuste_entrada"
        | "ajuste_saida"
        | "estorno"
      wo_priority: "baixa" | "media" | "alta" | "critica"
      wo_status:
        | "aberta"
        | "em_diagnostico"
        | "aguardando_peca"
        | "em_andamento"
        | "concluida_tecnicamente"
        | "encerrada"
        | "cancelada"
      wo_type: "preventiva" | "corretiva" | "reforma_geral"
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
    Enums: {
      app_role: [
        "admin",
        "gestor",
        "tecnico",
        "almoxarife",
        "leitura",
        "ceo",
        "diretor_comercial",
        "gestor_manutencao",
        "almoxarifado",
      ],
      stock_mov_type: [
        "abertura",
        "entrada",
        "saida",
        "ajuste_entrada",
        "ajuste_saida",
        "estorno",
      ],
      wo_priority: ["baixa", "media", "alta", "critica"],
      wo_status: [
        "aberta",
        "em_diagnostico",
        "aguardando_peca",
        "em_andamento",
        "concluida_tecnicamente",
        "encerrada",
        "cancelada",
      ],
      wo_type: ["preventiva", "corretiva", "reforma_geral"],
    },
  },
} as const
