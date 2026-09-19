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
      add_ons: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          estimated_hours: number
          hourly_rate: number
          id: string
          is_active: boolean
          is_global: boolean
          name: string
          organization_id: string | null
          price: number
          pricing_mode: string
          service_id: string | null
          sort_order: number
          swatch_color: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number
          hourly_rate?: number
          id?: string
          is_active?: boolean
          is_global?: boolean
          name: string
          organization_id?: string | null
          price?: number
          pricing_mode?: string
          service_id?: string | null
          sort_order?: number
          swatch_color?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number
          hourly_rate?: number
          id?: string
          is_active?: boolean
          is_global?: boolean
          name?: string
          organization_id?: string | null
          price?: number
          pricing_mode?: string
          service_id?: string | null
          sort_order?: number
          swatch_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "add_ons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "add_ons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "add_ons_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      aftercare_tasks: {
        Row: {
          body: string
          channel: string
          created_at: string
          customer_id: string | null
          id: string
          job_id: string | null
          kind: string
          organization_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind: string
          organization_id: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          organization_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aftercare_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aftercare_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aftercare_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          channel: string
          created_at: string
          delay_minutes: number
          deleted_at: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          organization_id: string | null
          run_count: number
          template: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          delay_minutes?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          organization_id?: string | null
          run_count?: number
          template?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          delay_minutes?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          organization_id?: string | null
          run_count?: number
          template?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bays: {
        Row: {
          color: string | null
          created_at: string
          daily_hours_cap: number
          discipline: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          organization_id: string
          required_certification: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          daily_hours_cap?: number
          discipline?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          organization_id: string
          required_certification?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          daily_hours_cap?: number
          discipline?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          organization_id?: string
          required_certification?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bays_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bays_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          ghl_contact_id: string | null
          hubspot_contact_id: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          ghl_contact_id?: string | null
          hubspot_contact_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          ghl_contact_id?: string | null
          hubspot_contact_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          average_ticket_target: number
          created_at: string
          daily_revenue_target: number
          id: string
          monthly_revenue_target: number
          organization_id: string
          preset: string
          updated_at: string
          user_id: string
          widget_layout: Json
        }
        Insert: {
          average_ticket_target?: number
          created_at?: string
          daily_revenue_target?: number
          id?: string
          monthly_revenue_target?: number
          organization_id: string
          preset?: string
          updated_at?: string
          user_id: string
          widget_layout?: Json
        }
        Update: {
          average_ticket_target?: number
          created_at?: string
          daily_revenue_target?: number
          id?: string
          monthly_revenue_target?: number
          organization_id?: string
          preset?: string
          updated_at?: string
          user_id?: string
          widget_layout?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          estimate_id: string | null
          expected_close: string | null
          id: string
          job_id: string | null
          last_activity_at: string | null
          location_id: string | null
          loss_reason: string | null
          notes: string | null
          organization_id: string | null
          owner_name: string | null
          probability: number
          service_tags: string[]
          source: string | null
          speed_to_lead_at: string | null
          stage: string
          title: string
          updated_at: string
          value: number
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          estimate_id?: string | null
          expected_close?: string | null
          id?: string
          job_id?: string | null
          last_activity_at?: string | null
          location_id?: string | null
          loss_reason?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_name?: string | null
          probability?: number
          service_tags?: string[]
          source?: string | null
          speed_to_lead_at?: string | null
          stage?: string
          title: string
          updated_at?: string
          value?: number
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          estimate_id?: string | null
          expected_close?: string | null
          id?: string
          job_id?: string | null
          last_activity_at?: string | null
          location_id?: string | null
          loss_reason?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_name?: string | null
          probability?: number
          service_tags?: string[]
          source?: string | null
          speed_to_lead_at?: string | null
          stage?: string
          title?: string
          updated_at?: string
          value?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          doc_type: string
          file_url: string | null
          id: string
          job_id: string | null
          location_id: string | null
          name: string
          organization_id: string | null
          signed_at: string | null
          signer_name: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          doc_type?: string
          file_url?: string | null
          id?: string
          job_id?: string | null
          location_id?: string | null
          name: string
          organization_id?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          doc_type?: string
          file_url?: string | null
          id?: string
          job_id?: string | null
          location_id?: string | null
          name?: string
          organization_id?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          created_by: string | null
          deleted_at: string | null
          description: string
          estimate_id: string
          id: string
          organization_id: string | null
          owner_id: string
          position: number
          quantity: number
          unit_price: number
          updated_by: string | null
        }
        Insert: {
          created_by?: string | null
          deleted_at?: string | null
          description: string
          estimate_id: string
          id?: string
          organization_id?: string | null
          owner_id?: string
          position?: number
          quantity?: number
          unit_price?: number
          updated_by?: string | null
        }
        Update: {
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          organization_id?: string | null
          owner_id?: string
          position?: number
          quantity?: number
          unit_price?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          job_id: string | null
          location_id: string | null
          notes: string | null
          number: number
          organization_id: string | null
          owner_id: string
          status: string
          tax_rate: number
          title: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          location_id?: string | null
          notes?: string | null
          number?: number
          organization_id?: string | null
          owner_id?: string
          status?: string
          tax_rate?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          location_id?: string | null
          notes?: string | null
          number?: number
          organization_id?: string | null
          owner_id?: string
          status?: string
          tax_rate?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_connections: {
        Row: {
          api_key_ciphertext: string
          created_at: string
          id: string
          location_id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_ciphertext: string
          created_at?: string
          id?: string
          location_id: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_ciphertext?: string
          created_at?: string
          id?: string
          location_id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_defects: {
        Row: {
          created_at: string
          defect_type: string
          id: string
          inspection_id: string
          media_urls: string[]
          note: string | null
          organization_id: string
          panel: string
          photo_url: string | null
          pos_x: number
          pos_y: number
          severity: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          defect_type?: string
          id?: string
          inspection_id: string
          media_urls?: string[]
          note?: string | null
          organization_id: string
          panel: string
          photo_url?: string | null
          pos_x?: number
          pos_y?: number
          severity?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          defect_type?: string
          id?: string
          inspection_id?: string
          media_urls?: string[]
          note?: string | null
          organization_id?: string
          panel?: string
          photo_url?: string | null
          pos_x?: number
          pos_y?: number
          severity?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_defects_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_defects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          inspector: string | null
          job_id: string | null
          location_id: string | null
          mileage: number | null
          notes: string | null
          organization_id: string
          signature_name: string | null
          stage: string
          status: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
          waiver_token: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          inspector?: string | null
          job_id?: string | null
          location_id?: string | null
          mileage?: number | null
          notes?: string | null
          organization_id: string
          signature_name?: string | null
          stage?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          waiver_token?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          inspector?: string | null
          job_id?: string | null
          location_id?: string | null
          mileage?: number | null
          notes?: string | null
          organization_id?: string
          signature_name?: string | null
          stage?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          waiver_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          account_label: string | null
          connected_by: string | null
          created_at: string
          external_id: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          scopes: string[]
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          connected_by?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          provider: string
          scopes?: string[]
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          connected_by?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          scopes?: string[]
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_mappings: {
        Row: {
          id: string
          local_id: string
          local_type: string
          organization_id: string
          provider: string
          remote_id: string
          remote_url: string | null
          synced_at: string
        }
        Insert: {
          id?: string
          local_id: string
          local_type: string
          organization_id: string
          provider: string
          remote_id: string
          remote_url?: string | null
          synced_at?: string
        }
        Update: {
          id?: string
          local_id?: string
          local_type?: string
          organization_id?: string
          provider?: string
          remote_id?: string
          remote_url?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          access_token: string | null
          connection_id: string
          expires_at: string | null
          realm_id: string | null
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connection_id: string
          expires_at?: string | null
          realm_id?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connection_id?: string
          expires_at?: string | null
          realm_id?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string | null
          quantity_on_hand: number
          reorder_point: number
          sku: string | null
          supplier: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          quantity_on_hand?: number
          reorder_point?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          quantity_on_hand?: number
          reorder_point?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_rolls: {
        Row: {
          batch_id: string | null
          brand: string | null
          cost_per_foot: number
          created_at: string
          deleted_at: string | null
          id: string
          inventory_item_id: string | null
          location_id: string | null
          lot_number: string | null
          material_type: string
          notes: string | null
          organization_id: string
          original_feet: number
          product_line: string | null
          remaining_feet: number
          reorder_point_feet: number
          reserved_feet: number
          roll_code: string
          shelf: string | null
          status: string
          updated_at: string
          vendor: string | null
          width_inches: number
        }
        Insert: {
          batch_id?: string | null
          brand?: string | null
          cost_per_foot?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          inventory_item_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          material_type?: string
          notes?: string | null
          organization_id: string
          original_feet?: number
          product_line?: string | null
          remaining_feet?: number
          reorder_point_feet?: number
          reserved_feet?: number
          roll_code: string
          shelf?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
          width_inches?: number
        }
        Update: {
          batch_id?: string | null
          brand?: string | null
          cost_per_foot?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          inventory_item_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          material_type?: string
          notes?: string | null
          organization_id?: string
          original_feet?: number
          product_line?: string | null
          remaining_feet?: number
          reorder_point_feet?: number
          reserved_feet?: number
          roll_code?: string
          shelf?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
          width_inches?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_rolls_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_phases: {
        Row: {
          actual_minutes: number
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          estimated_hours: number
          id: string
          job_id: string
          notes: string | null
          organization_id: string
          phase: string
          sequence: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_minutes?: number
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_hours?: number
          id?: string
          job_id: string
          notes?: string | null
          organization_id: string
          phase: string
          sequence?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_minutes?: number
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_hours?: number
          id?: string
          job_id?: string
          notes?: string | null
          organization_id?: string
          phase?: string
          sequence?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_phases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_phases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_services: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          organization_id: string | null
          quantity: number
          service_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          organization_id?: string | null
          quantity?: number
          service_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          organization_id?: string | null
          quantity?: number
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_services_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          bay: string | null
          bay_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          cut_file_url: string | null
          deleted_at: string | null
          estimated_hours: number
          film_feet_estimate: number
          id: string
          installer: string | null
          key_released: boolean
          location_id: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          price: number
          qc_status: string
          roll_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_type: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          bay?: string | null
          bay_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          cut_file_url?: string | null
          deleted_at?: string | null
          estimated_hours?: number
          film_feet_estimate?: number
          id?: string
          installer?: string | null
          key_released?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          price?: number
          qc_status?: string
          roll_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_type?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          bay?: string | null
          bay_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          cut_file_url?: string | null
          deleted_at?: string | null
          estimated_hours?: number
          film_feet_estimate?: number
          id?: string
          installer?: string | null
          key_released?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          price?: number
          qc_status?: string
          roll_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_type?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_bay_id_fkey"
            columns: ["bay_id"]
            isOneToOne: false
            referencedRelation: "bays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_roll_id_fkey"
            columns: ["roll_id"]
            isOneToOne: false
            referencedRelation: "inventory_rolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          phone: string | null
          settings: Json | null
          state: string | null
          timezone: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
          settings?: Json | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
          settings?: Json | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_name: string | null
          body: string
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          direction: string
          id: string
          is_automated: boolean
          job_id: string | null
          location_id: string | null
          organization_id: string
          sent_at: string
          status: string
          subject: string | null
        }
        Insert: {
          author_name?: string | null
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          direction?: string
          id?: string
          is_automated?: boolean
          job_id?: string | null
          location_id?: string | null
          organization_id: string
          sent_at?: string
          status?: string
          subject?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          direction?: string
          id?: string
          is_automated?: boolean
          job_id?: string | null
          location_id?: string | null
          organization_id?: string
          sent_at?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          created_at: string
          deleted_at: string | null
          deposit_percent: number
          id: string
          name: string
          review_url: string | null
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_percent?: number
          id?: string
          name: string
          review_url?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_percent?: number
          id?: string
          name?: string
          review_url?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          estimate_id: string | null
          id: string
          job_id: string | null
          kind: string
          location_id: string | null
          method: string
          notes: string | null
          organization_id: string | null
          paid_at: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          estimate_id?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          location_id?: string | null
          method?: string
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          estimate_id?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          location_id?: string | null
          method?: string
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          location_id: string | null
          organization_id: string | null
          phone: string | null
          shop_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id: string
          location_id?: string | null
          organization_id?: string | null
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string | null
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_addons: {
        Row: {
          description: string | null
          film_feet: number
          id: string
          is_selected: boolean
          labor_hours: number
          name: string
          organization_id: string
          price: number
          proposal_id: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          film_feet?: number
          id?: string
          is_selected?: boolean
          labor_hours?: number
          name: string
          organization_id: string
          price?: number
          proposal_id: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          film_feet?: number
          id?: string
          is_selected?: boolean
          labor_hours?: number
          name?: string
          organization_id?: string
          price?: number
          proposal_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_addons_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_tiers: {
        Row: {
          description: string | null
          film_feet: number
          id: string
          includes: string[]
          is_recommended: boolean
          labor_hours: number
          name: string
          organization_id: string
          price: number
          proposal_id: string
          sort_order: number
          tier: string
        }
        Insert: {
          description?: string | null
          film_feet?: number
          id?: string
          includes?: string[]
          is_recommended?: boolean
          labor_hours?: number
          name: string
          organization_id: string
          price?: number
          proposal_id: string
          sort_order?: number
          tier?: string
        }
        Update: {
          description?: string | null
          film_feet?: number
          id?: string
          includes?: string[]
          is_recommended?: boolean
          labor_hours?: number
          name?: string
          organization_id?: string
          price?: number
          proposal_id?: string
          sort_order?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_tiers_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          customer_id: string | null
          deal_id: string | null
          deposit_amount: number
          deposit_percent: number
          film_feet: number
          id: string
          labor_hours: number
          location_id: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          selected_addon_ids: string[]
          selected_tier_id: string | null
          sent_at: string | null
          signature_name: string | null
          signed_at: string | null
          status: string
          title: string
          token: string
          total: number
          updated_at: string
          vehicle_id: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          deposit_amount?: number
          deposit_percent?: number
          film_feet?: number
          id?: string
          labor_hours?: number
          location_id?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          selected_addon_ids?: string[]
          selected_tier_id?: string | null
          sent_at?: string | null
          signature_name?: string | null
          signed_at?: string | null
          status?: string
          title?: string
          token: string
          total?: number
          updated_at?: string
          vehicle_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          deposit_amount?: number
          deposit_percent?: number
          film_feet?: number
          id?: string
          labor_hours?: number
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          selected_addon_ids?: string[]
          selected_tier_id?: string | null
          sent_at?: string | null
          signature_name?: string | null
          signed_at?: string | null
          status?: string
          title?: string
          token?: string
          total?: number
          updated_at?: string
          vehicle_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          description: string
          feet: number
          id: string
          organization_id: string
          product_line: string | null
          purchase_order_id: string
          quantity: number
          received: boolean
          sort_order: number
          unit_cost: number
          width_inches: number
        }
        Insert: {
          description: string
          feet?: number
          id?: string
          organization_id: string
          product_line?: string | null
          purchase_order_id: string
          quantity?: number
          received?: boolean
          sort_order?: number
          unit_cost?: number
          width_inches?: number
        }
        Update: {
          description?: string
          feet?: number
          id?: string
          organization_id?: string
          product_line?: string | null
          purchase_order_id?: string
          quantity?: number
          received?: boolean
          sort_order?: number
          unit_cost?: number
          width_inches?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          ordered_at: string | null
          organization_id: string
          po_number: string
          received_at: string | null
          status: string
          total: number
          updated_at: string
          vendor: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          organization_id: string
          po_number: string
          received_at?: string | null
          status?: string
          total?: number
          updated_at?: string
          vendor: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          organization_id?: string
          po_number?: string
          received_at?: string | null
          status?: string
          total?: number
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_checklists: {
        Row: {
          created_at: string
          edge_temp_f: number | null
          id: string
          inspector: string | null
          job_id: string
          notes: string | null
          organization_id: string
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edge_temp_f?: number | null
          id?: string
          inspector?: string | null
          job_id: string
          notes?: string | null
          organization_id: string
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edge_temp_f?: number | null
          id?: string
          inspector?: string | null
          job_id?: string
          notes?: string | null
          organization_id?: string
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_items: {
        Row: {
          checklist_id: string
          id: string
          is_required: boolean
          kind: string
          label: string
          note: string | null
          organization_id: string
          passed: boolean
          sort_order: number
          value_text: string | null
        }
        Insert: {
          checklist_id: string
          id?: string
          is_required?: boolean
          kind?: string
          label: string
          note?: string | null
          organization_id: string
          passed?: boolean
          sort_order?: number
          value_text?: string | null
        }
        Update: {
          checklist_id?: string
          id?: string
          is_required?: boolean
          kind?: string
          label?: string
          note?: string | null
          organization_id?: string
          passed?: boolean
          sort_order?: number
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "qc_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          permissions: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          permissions?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          permissions?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roll_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string | null
          feet: number
          id: string
          job_id: string | null
          kind: string
          note: string | null
          organization_id: string
          roll_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          feet?: number
          id?: string
          job_id?: string | null
          kind?: string
          note?: string | null
          organization_id: string
          roll_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          feet?: number
          id?: string
          job_id?: string | null
          kind?: string
          note?: string | null
          organization_id?: string
          roll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roll_transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roll_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roll_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roll_transactions_roll_id_fkey"
            columns: ["roll_id"]
            isOneToOne: false
            referencedRelation: "inventory_rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_add_ons: {
        Row: {
          add_on_id: string
          created_at: string
          id: string
          is_recommended: boolean
          organization_id: string | null
          price_override: number | null
          service_id: string
          sort_order: number
        }
        Insert: {
          add_on_id: string
          created_at?: string
          id?: string
          is_recommended?: boolean
          organization_id?: string | null
          price_override?: number | null
          service_id: string
          sort_order?: number
        }
        Update: {
          add_on_id?: string
          created_at?: string
          id?: string
          is_recommended?: boolean
          organization_id?: string | null
          price_override?: number | null
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "add_ons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_add_ons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_add_ons_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          accent_color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          location_id: string | null
          name: string
          organization_id: string | null
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          name: string
          organization_id?: string | null
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          name?: string
          organization_id?: string | null
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_options: {
        Row: {
          coverage_panels: string[]
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_delta_minutes: number
          id: string
          is_default: boolean
          kind: string
          name: string
          organization_id: string | null
          price_delta: number
          service_id: string
          sort_order: number
          swatch_color: string | null
          updated_at: string
        }
        Insert: {
          coverage_panels?: string[]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_delta_minutes?: number
          id?: string
          is_default?: boolean
          kind?: string
          name: string
          organization_id?: string | null
          price_delta?: number
          service_id: string
          sort_order?: number
          swatch_color?: string | null
          updated_at?: string
        }
        Update: {
          coverage_panels?: string[]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_delta_minutes?: number
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          organization_id?: string | null
          price_delta?: number
          service_id?: string
          sort_order?: number
          swatch_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_options_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variants: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          estimated_hours: number
          id: string
          is_active: boolean
          is_default: boolean
          organization_id: string | null
          price: number
          service_id: string
          sort_order: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          organization_id?: string | null
          price?: number
          service_id: string
          sort_order?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          organization_id?: string | null
          price?: number
          service_id?: string
          sort_order?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          category: string
          category_id: string | null
          coverage_panels: string[]
          created_at: string
          customer_description: string | null
          deleted_at: string | null
          deposit_type: string
          deposit_value: number
          description: string | null
          duration_minutes: number
          estimated_hours: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_internal: boolean
          is_public: boolean
          location_id: string | null
          name: string
          organization_id: string | null
          pricing_mode: string
          sort_order: number
          supports_add_ons: boolean
          swatch_color: string | null
          tags: string[]
          unit: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          category?: string
          category_id?: string | null
          coverage_panels?: string[]
          created_at?: string
          customer_description?: string | null
          deleted_at?: string | null
          deposit_type?: string
          deposit_value?: number
          description?: string | null
          duration_minutes?: number
          estimated_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_internal?: boolean
          is_public?: boolean
          location_id?: string | null
          name: string
          organization_id?: string | null
          pricing_mode?: string
          sort_order?: number
          supports_add_ons?: boolean
          swatch_color?: string | null
          tags?: string[]
          unit?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          category_id?: string | null
          coverage_panels?: string[]
          created_at?: string
          customer_description?: string | null
          deleted_at?: string | null
          deposit_type?: string
          deposit_value?: number
          description?: string | null
          duration_minutes?: number
          estimated_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_internal?: boolean
          is_public?: boolean
          location_id?: string | null
          name?: string
          organization_id?: string | null
          pricing_mode?: string
          sort_order?: number
          supports_add_ons?: boolean
          swatch_color?: string | null
          tags?: string[]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_events: {
        Row: {
          attempts: number
          created_at: string
          direction: string
          event_type: string
          id: string
          last_error: string | null
          local_id: string | null
          local_type: string | null
          next_attempt_at: string
          organization_id: string
          payload: Json
          provider: string
          remote_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          direction?: string
          event_type: string
          id?: string
          last_error?: string | null
          local_id?: string | null
          local_type?: string | null
          next_attempt_at?: string
          organization_id: string
          payload?: Json
          provider: string
          remote_id?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          direction?: string
          event_type?: string
          id?: string
          last_error?: string | null
          local_id?: string | null
          local_type?: string | null
          next_attempt_at?: string
          organization_id?: string
          payload?: Json
          provider?: string
          remote_id?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          commission_rate: number
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          location_id: string | null
          organization_id: string | null
          pay_rate: number
          pay_type: string
          phone: string | null
          specialties: string[]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          organization_id?: string | null
          pay_rate?: number
          pay_type?: string
          phone?: string | null
          specialties?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          organization_id?: string | null
          pay_rate?: number
          pay_type?: string
          phone?: string | null
          specialties?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_certifications: {
        Row: {
          certification: string
          created_at: string
          expires_on: string | null
          id: string
          issued_on: string | null
          level: string
          organization_id: string
          team_member_id: string
        }
        Insert: {
          certification: string
          created_at?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          level?: string
          organization_id: string
          team_member_id: string
        }
        Update: {
          certification?: string
          created_at?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          level?: string
          organization_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_certifications_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          job_id: string | null
          job_phase_id: string | null
          minutes: number
          note: string | null
          organization_id: string
          started_at: string
          team_member_id: string | null
          tech_name: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          job_phase_id?: string | null
          minutes?: number
          note?: string | null
          organization_id: string
          started_at?: string
          team_member_id?: string | null
          tech_name?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          job_phase_id?: string | null
          minutes?: number
          note?: string | null
          organization_id?: string
          started_at?: string
          team_member_id?: string | null
          tech_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_phase_id_fkey"
            columns: ["job_phase_id"]
            isOneToOne: false
            referencedRelation: "job_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          organization_id: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          location_id: string | null
          make: string | null
          model: string | null
          organization_id: string | null
          owner_id: string
          plate: string | null
          updated_by: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          make?: string | null
          model?: string | null
          organization_id?: string | null
          owner_id?: string
          plate?: string | null
          updated_by?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          make?: string | null
          model?: string | null
          organization_id?: string | null
          owner_id?: string
          plate?: string | null
          updated_by?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
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
      warranties: {
        Row: {
          certificate_number: string
          coverage_terms: string | null
          created_at: string
          customer_id: string | null
          expires_at: string | null
          id: string
          installer: string | null
          issued_at: string
          job_id: string | null
          location_id: string | null
          organization_id: string
          product: string | null
          roll_lots: string[]
          status: string
          token: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          certificate_number: string
          coverage_terms?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          installer?: string | null
          issued_at?: string
          job_id?: string | null
          location_id?: string | null
          organization_id: string
          product?: string | null
          roll_lots?: string[]
          status?: string
          token: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          certificate_number?: string
          coverage_terms?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          installer?: string | null
          issued_at?: string
          job_id?: string | null
          location_id?: string | null
          organization_id?: string
          product?: string | null
          roll_lots?: string[]
          status?: string
          token?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_organization_permission: {
        Args: {
          _organization_id: string
          _permission_key: string
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_organization: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
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
