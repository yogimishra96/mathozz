/**
 * Optional feedback channel; Firestore-backed by default.
 */
export interface FeedbackRepository {
  submit(uid: string, message: string): Promise<void>;
}
