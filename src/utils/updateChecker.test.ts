import { describe, expect, it, vi } from 'vitest';
import { checkForUpdate, isVersionNewer, LATEST_RELEASE_PAGE } from './updateChecker';

describe('isVersionNewer', () => {
  it('compares release versions numerically and accepts a v prefix', () => {
    expect(isVersionNewer('v0.10.0', '0.9.9')).toBe(true);
    expect(isVersionNewer('0.1.2', '0.1.2')).toBe(false);
    expect(isVersionNewer('0.1.1', '0.1.2')).toBe(false);
  });

  it('compares prerelease versions using semantic-version precedence', () => {
    expect(isVersionNewer('1.0.0', '1.0.0-rc.1')).toBe(true);
    expect(isVersionNewer('1.0.0-rc.2', '1.0.0-rc.1')).toBe(true);
    expect(isVersionNewer('1.0.0-rc.1', '1.0.0')).toBe(false);
  });

  it('rejects malformed versions', () => {
    expect(isVersionNewer('latest', '0.1.2')).toBe(false);
  });
});

describe('checkForUpdate', () => {
  it('reports the latest stable GitHub release when it is newer', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ tag_name: 'v0.2.0' }), { status: 200 }),
    );

    await expect(checkForUpdate('0.1.2', fetcher)).resolves.toEqual({
      state: 'available',
      latestVersion: '0.2.0',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/KhitMinnyo/md-editor/releases/latest',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(LATEST_RELEASE_PAGE).toBe('https://github.com/KhitMinnyo/md-editor/releases/latest');
  });

  it('reports the app as current when no newer release exists', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ tag_name: '0.1.2' }), { status: 200 }),
    );

    await expect(checkForUpdate('0.1.2', fetcher)).resolves.toEqual({
      state: 'current',
      latestVersion: '0.1.2',
    });
  });

  it('fails clearly when GitHub has no accessible latest release', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 404 }),
    );

    await expect(checkForUpdate('0.1.2', fetcher)).rejects.toThrow('HTTP 404');
  });
});
