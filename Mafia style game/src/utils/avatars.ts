export const BIT_EMOJI_AVATARS = [
  '👾', '🤖', '👻', '🕹️',
  '🎮', '💀', '🗡️', '🛡️',
  '🕵️', '🎩', '👑', '⚡',
  '🕶️', '🐉', '🧙', '🎯',
  '🐱', '🦊', '🦄', '🐯'
];

export function getPlayerAvatar(avatarSeed?: string, playerIndex: number = 0): string {
  if (avatarSeed && BIT_EMOJI_AVATARS.includes(avatarSeed)) {
    return avatarSeed;
  }
  return BIT_EMOJI_AVATARS[Math.abs(playerIndex) % BIT_EMOJI_AVATARS.length];
}
