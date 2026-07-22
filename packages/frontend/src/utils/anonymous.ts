// Deterministic anonymous name generator — same algorithm as njs-service
// so participant names are consistent between client and server.

const adjectives = [
  'Silent', 'Bright', 'Clever', 'Swift', 'Calm', 'Eager', 'Gentle', 'Happy', 'Wise', 'Bold',
  'Friendly', 'Quiet', 'Active', 'Smart', 'Curious', 'Patient', 'Honest', 'Cheerful', 'Brave', 'Kind'
];

const nouns = [
  'Panda', 'Eagle', 'Koala', 'Falcon', 'Owl', 'Dolphin', 'Fox', 'Tiger', 'Lion', 'Wolf',
  'Rabbit', 'Deer', 'Otter', 'Cheetah', 'Bear', 'Panther', 'Squirrel', 'Badger', 'Lynx', 'Jaguar'
];

export function getAnonymousName(userId: number | string, role: string): string {
  const parsedId = typeof userId === 'number' ? userId : parseInt(String(userId), 10) || 0;
  const adjIndex = Math.abs(parsedId) % adjectives.length;
  const nounIndex = (Math.abs(parsedId) + 3) % nouns.length;
  const adj = adjectives[adjIndex];
  const noun = nouns[nounIndex];

  let roleSuffix = 'Learner';
  const cleanRole = String(role).toUpperCase();
  if (cleanRole === 'SUPER') {
    roleSuffix = 'Creator';
  } else if (cleanRole === 'PRO') {
    roleSuffix = 'Pro';
  }

  return `Anonymous ${adj} ${noun} (${roleSuffix})`;
}
