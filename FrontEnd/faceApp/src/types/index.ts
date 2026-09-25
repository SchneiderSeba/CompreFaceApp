
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
  employee?: Employee
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
  updatedAt: string
  checkInCount: number
  lastCheckInAt: string | null
}

export interface DashboardStats {
  totals: {
    employees: number
    checkIns: number
    todayCheckIns: number
    todayEmployees: number
  }
  dailyCheckIns: Array<{ day: string; count: number }>
  employeeActivity: Array<{
    employeeId: number
    displayName: string
    employeeCode: string
    count: number
    lastCheckInAt: string | null
  }>
  recentCheckIns: Array<{
    id: number
    checkedInAt: string
    similarity: number | null
    employeeId: number
    displayName: string
    employeeCode: string
  }>
}

export interface CheckIn {
  id: number
  employeeId: number
  similarity: number | null
  detectionProbability: number | null
  checkedInAt: string
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
  matchedEmployee?: Employee | null
  checkIn?: CheckIn | null
}

export type { FaceItem }
