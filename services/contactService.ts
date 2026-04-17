//rai-pos-app\services\contactService.ts


// services/contactService.ts
import { graphQLRequest } from './apiClient'

export interface Contact {
    id: number
    orgId: number
    branchId: number | null   // null = global
    label: string          // Display label / nickname
    name: string
    email: string
    phone?: string | null
    position?: string | null
    department?: string | null
    notes?: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    branch?: {
        id: number
        name: string
        address: string
    } | null
}

export interface ContactInput {
    branchId?: number | null   // omit or null = global
    label: string
    name: string
    email: string
    phone?: string | null
    position?: string | null
    department?: string | null
    notes?: string | null
}

// ─── Fragments ────────────────────────────────────────────────────────────────

const CONTACT_FIELDS = `
  id
  branchId
  label
  name
  email
  phone
  position
  department
  notes
  isActive
  createdAt
  updatedAt
  branch {
    id
    name
    address
  }
`

// ─── Service ─────────────────────────────────────────────────────────────────

export class ContactService {

    /**
     * Fetch contacts for an org.
     * - branchId provided → returns global (branchId=null) + that branch's contacts
     * - branchId omitted  → returns all contacts for the org
     * - query provided    → server-side search across label, name, email, dept, position
     */
    static async getContacts(
        branchId?: number | null,
        query?: string,
    ): Promise<Contact[]> {
        const gql = `
      query GetContacts( $branchId: Int, $query: String) {
        contacts(branchId: $branchId, query: $query) {
          ${CONTACT_FIELDS}
        }
      }
    `
        const response = await graphQLRequest(gql, {
            branchId: branchId ?? null,
            query: query ?? null,
        })
        return response.contacts ?? []
    }

    /** Fetch a single contact by id */
    static async getContact(id: number): Promise<Contact | null> {
        const gql = `
      query GetContact($id: Int!) {
        contact(id: $id) {
          ${CONTACT_FIELDS}
        }
      }
    `
        const response = await graphQLRequest(gql, { id })
        return response.contact ?? null
    }

    /** Create a new contact */
    static async createContact(input: ContactInput): Promise<Contact> {
        const gql = `
      mutation CreateContact(
        $branchId:   Int
        $label:      String!
        $name:       String!
        $email:      String!
        $phone:      String
        $position:   String
        $department: String
        $notes:      String
      ) {
        createContact(
          branchId:   $branchId
          label:      $label
          name:       $name
          email:      $email
          phone:      $phone
          position:   $position
          department: $department
          notes:      $notes
        ) {
          ${CONTACT_FIELDS}
        }
      }
    `
        try {
            const response = await graphQLRequest(gql, {
                branchId: input.branchId ?? null,
                label: input.label,
                name: input.name,
                email: input.email,
                phone: input.phone ?? null,
                position: input.position ?? null,
                department: input.department ?? null,
                notes: input.notes ?? null,
            })
            return response.createContact
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error creating contact:', error)
            }
            throw new Error('Failed to create contact. Please try again.')

        }

    }

    /** Update an existing contact (partial update — only changed fields needed) */
    static async updateContact(
        id: number,
        input: Partial<Omit<ContactInput, 'orgId'>>,
    ): Promise<Contact> {
        const gql = `
      mutation UpdateContact(
        $id:         Int!
        $branchId:   Int
        $label:      String
        $name:       String
        $email:      String
        $phone:      String
        $position:   String
        $department: String
        $notes:      String
        $isActive:   Boolean
      ) {
        updateContact(
          id:         $id
          branchId:   $branchId
          label:      $label
          name:       $name
          email:      $email
          phone:      $phone
          position:   $position
          department: $department
          notes:      $notes
          isActive:   $isActive
        ) {
          ${CONTACT_FIELDS}
        }
      }
    `
        const response = await graphQLRequest(gql, { id, ...input })
        return response.updateContact
    }

    /** Hard-delete a contact */
    static async deleteContact(id: number): Promise<{ id: number }> {
        const gql = `
      mutation DeleteContact($id: Int!) {
        deleteContact(id: $id) {
          id
        }
      }
    `
        const response = await graphQLRequest(gql, { id })
        return response.deleteContact
    }

    /** Toggle isActive on/off */
    static async toggleContact(id: number): Promise<Contact> {
        const gql = `
      mutation ToggleContact($id: Int!) {
        toggleContact(id: $id) {
          id
          isActive
        }
      }
    `
        const response = await graphQLRequest(gql, { id })
        return response.toggleContact
    }
}   