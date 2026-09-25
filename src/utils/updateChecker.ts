const LATEST_RELEASE_API = 'https://api.github.com/repos/KhitMinnyo/md-editor/releases/latest';
export const LATEST_RELEASE_PAGE = 'https://github.com/KhitMinnyo/md-editor/releases/latest';

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'current'; latestVersion: string }
  | { state: 'available'; latestVersion: string }
  | { state: 'error' };

function parseVersion(version: string): {
  core: number[];
  prerelease: string[] | null;
} | null {
  const match = version.trim().match(
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) return null;

  const prerelease = match[4]?.split('.') ?? null;
  if (prerelease?.some((part) => !part || (/^\d+$/.test(part) && part.length > 1 && part.startsWith('0')))) {
    return null;
  }

  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease,
  };
}

export function isVersionNewer(candidate: string, current: string): boolean {
  const candidateVersion = parseVersion(candidate);
  const currentVersion = parseVersion(current);
  if (!candidateVersion || !currentVersion) return false;

  for (let index = 0; index < candidateVersion.core.length; index++) {
    if (candidateVersion.core[index] !== currentVersion.core[index]) {
      return candidateVersion.core[index] > currentVersion.core[index];
    }
  }

  if (!candidateVersion.prerelease) return Boolean(currentVersion.prerelease);
  if (!currentVersion.prerelease) return false;

  const length = Math.max(candidateVersion.prerelease.length, currentVersion.prerelease.length);
  for (let index = 0; index < length; index++) {
    const candidatePart = candidateVersion.prerelease[index];
    const currentPart = currentVersion.prerelease[index];
    if (candidatePart === undefined) return false;
    if (currentPart === undefined) return true;
    if (candidatePart === currentPart) continue;

    const candidateIsNumeric = /^\d+$/.test(candidatePart);
    const currentIsNumeric = /^\d+$/.test(currentPart);
    if (candidateIsNumeric && currentIsNumeric) {
      return Number(candidatePart) > Number(currentPart);
    }
    if (candidateIsNumeric !== currentIsNumeric) return !candidateIsNumeric;
    return candidatePart > currentPart;
  }

  return false;
}

export async function checkForUpdate(
  currentVersion: string,
  fetcher: typeof fetch = fetch,
): Promise<{ state: 'available' | 'current'; latestVersion: string }> {
  const response = await fetcher(LATEST_RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status}`);
  }

  const release: unknown = await response.json();
  const tagName =
    typeof release === 'object' && release !== null && 'tag_name' in release
      ? release.tag_name
      : null;
  if (typeof tagName !== 'string' || !parseVersion(tagName)) {
    throw new Error('GitHub returned an invalid release version');
  }

  const latestVersion = tagName.replace(/^v/, '');
  return isVersionNewer(latestVersion, currentVersion)
    ? { state: 'available', latestVersion }
    : { state: 'current', latestVersion };
}
