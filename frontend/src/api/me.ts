import apiClient from './client';

export interface HouseholdMember {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface MeResponse {
  user: {
    uid: string;
    displayName: string;
    email?: string;
    photoURL?: string;
    householdId: string;
    webhookToken?: string;
  };
  household: {
    id: string;
    name: string;
    inviteCode: string;
    members: HouseholdMember[];
  };
}

export const meApi = {
  me: async (): Promise<MeResponse> => {
    const response = await apiClient.get<MeResponse>('/me');
    return response.data;
  },

  joinHousehold: async (code: string): Promise<MeResponse> => {
    const response = await apiClient.post<MeResponse>('/households/join', { code });
    return response.data;
  },

  regenerateInvite: async (): Promise<MeResponse> => {
    const response = await apiClient.post<MeResponse>('/households/regenerate-invite');
    return response.data;
  }
};
