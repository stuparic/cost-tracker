export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  householdId: string;
  /** Personal shared-secret for the phone notification webhook (MacroDroid) */
  webhookToken?: string;
  createdAt: string;
}

export interface HouseholdMember {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface Household {
  id: string;
  name: string;
  memberUids: string[];
  inviteCode: string;
  createdAt: string;
}

export interface MeResponse {
  user: UserProfile;
  household: Household & { members: HouseholdMember[] };
}
