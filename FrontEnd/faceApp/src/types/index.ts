
interface FaceItem {
  name: string
  image_id: string
  subject: string
  image: string
}

export interface CaptureResponse {
  name: string
  image_id: string
}

export interface RecognitionSubject {
  subject: string
  similarity?: number
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
