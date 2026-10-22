export interface PresetAvatar {
  id: string;
  name: string;
  gender: "male" | "female";
  style: string;
  url: string;
}

export const MALE_AVATARS: PresetAvatar[] = [
  {
    id: "felix",
    name: "Felix",
    gender: "male",
    style: "Casual Guy",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
  },
  {
    id: "oliver",
    name: "Oliver",
    gender: "male",
    style: "Modern Vibe",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=ccfbf1",
  },
  {
    id: "liam",
    name: "Liam",
    gender: "male",
    style: "Clean Look",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&backgroundColor=e0f2fe",
  },
];

export const FEMALE_AVATARS: PresetAvatar[] = [
  {
    id: "jocelyn",
    name: "Jocelyn",
    gender: "female",
    style: "Warm Smile",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=ffdfbf",
  },
  {
    id: "aneka",
    name: "Aneka",
    gender: "female",
    style: "Professional",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=d1d4f9",
  },
  {
    id: "sophia",
    name: "Sophia",
    gender: "female",
    style: "Vibrant",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&backgroundColor=fef3c7",
  },
];

export const PRESET_AVATARS: PresetAvatar[] = [...MALE_AVATARS, ...FEMALE_AVATARS];

/**
 * Randomly picks one of the 3 male or 3 female avatars based on gender.
 */
export function getRandomAvatarByGender(gender?: string | null): string {
  const isFemale = gender ? gender.trim().toLowerCase() === "female" : false;
  const pool = isFemale ? FEMALE_AVATARS : MALE_AVATARS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx].url;
}
