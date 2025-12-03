export type SuggestedFriend = {
  id: string;
  username: string;
  displayName: string;
  tagline: string;
  avatar?: string;
};

export const SUGGESTED_FRIENDS: SuggestedFriend[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'trinity',
    displayName: 'Trinity',
    tagline: 'Ace defender, loves neon arenas.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=trinity',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'morpheus',
    displayName: 'Morpheus',
    tagline: 'Strategist with perfect paddle control.',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=morpheus',
  },
];
