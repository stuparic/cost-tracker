/** Scope every read/write to the caller's household; uid identifies the member. */
export interface HouseholdContext {
  householdId: string;
  uid: string;
  /** Display name used for the legacy createdBy field */
  displayName?: string;
}
