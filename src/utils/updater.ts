/**
 * Auto-update check, built on @tauri-apps/plugin-updater + plugin-process.
 *
 * This is scaffolding: the plugins are registered (see src-tauri/src/lib.rs
 * and capabilities/default.json) and this helper is wired up, but
 * `tauri.conf.json`'s `plugins.updater` block (endpoint + public key) isn't
 * configured yet — that requires a real signing keypair generated with
 * `npx tauri signer generate`, which needs to be done on a machine with
 * network access. Until that's done, this fails gracefully with a message
 * instead of throwing. See README's "Auto-Update Setup" section.
 */
import { isTauri } from './fileManager';

export async function checkForUpdates(): Promise<string> {
  if (!isTauri()) {
    return 'Update ကို desktop app ထဲကနေပဲ စစ်ဆေးလို့ရပါတယ်။';
  }
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      return 'Version အသစ်ဆုံးကို သုံးနေပြီးဖြစ်ပါတယ်။';
    }
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await update.downloadAndInstall();
    await relaunch();
    return `v${update.version} ကို install လုပ်ပြီး ပြန်ဖွင့်နေပါပြီ...`;
  } catch (err) {
    console.error('Update check failed:', err);
    return 'Update စစ်ဆေးလို့မရပါ — auto-update ကို အပြည့်အစုံ setup မလုပ်ရသေးပါ (README ကိုကြည့်ပါ)။';
  }
}
