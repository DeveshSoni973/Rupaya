import { api } from "../http";
import type { PaginatedResponse } from "./types";

export interface Group {
  id: string;
  name: string;
  member_count: number;
}

export interface GroupMember {
  id: string; // Membership ID
  user_id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GroupDetail {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  member_count: number;
}

export interface GroupCreate {
  name: string;
  initial_members: string[];
}

export interface AddMemberRequest {
  user_id?: string;
  email?: string;
}

export const GroupsAPI = {
  create(data: GroupCreate) {
    return api.post<Group>("/groups/", data);
  },

  list(search?: string, filter?: string, sort_by?: string, order?: string, skip = 0, limit = 20) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (filter) params.append("filter", filter);
    if (sort_by) params.append("sort_by", sort_by);
    if (order) params.append("order", order);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());


    const queryString = params.toString();
    return api.get<PaginatedResponse<Group>>(
      `/groups/${queryString ? `?${queryString}` : ""}`
    );
  },


  getDetail(id: string) {
    return api.get<GroupDetail>(`/groups/${id}`);
  },

  addMember(groupId: string, data: AddMemberRequest) {
    return api.post<GroupMember>(`/groups/${groupId}/members`, data);
  },

  removeMember(groupId: string, memberId: string) {
    return api.delete(`/groups/${groupId}/members/${memberId}`);
  },
};
