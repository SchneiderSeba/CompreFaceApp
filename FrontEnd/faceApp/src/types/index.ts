
interface FaceItem {
  name: string
  image_id: string
  subject: string
  image: string
}

export interface CaptureResponse {
  name: string
  employeeCode: string
  image_id: string
}

export interface RecognitionSubject {
  subject: string
  similarity?: number
  displayName?: string
  employeeCode?: string
}

export interface AuthUser {
  id: number
  username: string | null
  displayName: string
  role: 'admin' | 'employee'
}

export interface Employee {
  id: number
  displayName: string
  employeeCode: string
  role: 'employee'
  comprefaceSubject: string
  createdAt: string
}

export interface RecognitionBox {
  probability?: number
}

export interface RecognitionResult {
  subjects?: RecognitionSubject[]
  box?: RecognitionBox
}

export interface RecognitionResponse {
  result?: RecognitionResult[]
}

export type { FaceItem }
