export interface AuthorizedMember {
  id: string;
  name: string;
  normalized: string;
  email: string;
  role: 'owner' | 'member';
  avatarColor: string;
}

export const AUTHORIZED_MEMBERS: AuthorizedMember[] = [
  {
    id: 'user-shivansh-uuid',
    name: 'Shivansh',
    normalized: 'shivansh',
    email: 'shivansh@teammind.ai',
    role: 'owner',
    avatarColor: 'bg-blue-600',
  },
  {
    id: 'user-dana-uuid',
    name: 'Dana',
    normalized: 'dana',
    email: 'dana@teammind.ai',
    role: 'member',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'user-lial-uuid',
    name: 'Lial',
    normalized: 'lial',
    email: 'lial@teammind.ai',
    role: 'member',
    avatarColor: 'bg-purple-600',
  },
  {
    id: 'user-niya-uuid',
    name: 'Niya',
    normalized: 'niya',
    email: 'niya@teammind.ai',
    role: 'member',
    avatarColor: 'bg-amber-600',
  },
];

export function getAuthorizedMemberByName(name: string): AuthorizedMember | undefined {
  const normalized = name.trim().toLowerCase();
  return AUTHORIZED_MEMBERS.find((m) => m.normalized === normalized);
}

export function getAuthorizedMemberById(id: string): AuthorizedMember | undefined {
  return AUTHORIZED_MEMBERS.find((m) => m.id === id);
}

export function isAuthorizedName(name: string): boolean {
  return !!getAuthorizedMemberByName(name);
}
