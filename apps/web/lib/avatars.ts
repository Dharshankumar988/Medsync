export interface PresetAvatar {
  id: string;
  name: string;
  gender: "male" | "female";
  style: string;
  url: string;
}

export const MALE_AVATAR: PresetAvatar = {
  id: "male",
  name: "Male Profile",
  gender: "male",
  style: "Standard Male",
  url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
};

export const FEMALE_AVATAR: PresetAvatar = {
  id: "female",
  name: "Female Profile",
  gender: "female",
  style: "Standard Female",
  url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=d1d4f9",
};

export const MALE_AVATARS: PresetAvatar[] = [MALE_AVATAR];
export const FEMALE_AVATARS: PresetAvatar[] = [FEMALE_AVATAR];
export const PRESET_AVATARS: PresetAvatar[] = [MALE_AVATAR, FEMALE_AVATAR];

/**
 * Returns the exact default avatar based on gender selection:
 * Male -> Male Avatar
 * Female -> Female Avatar
 */
export function getAvatarByGender(gender?: string | null): string {
  const isFemale = gender ? gender.trim().toLowerCase() === "female" : false;
  return isFemale ? FEMALE_AVATAR.url : MALE_AVATAR.url;
}

export function getRandomAvatarByGender(gender?: string | null): string {
  return getAvatarByGender(gender);
}
