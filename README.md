# FarsiPSX — پنل مدیریت + سازنده APK

## اجرای پنل (محلی)

```powershell
cd "C:\Users\pc\Documents\Default Project\admin-panel"
npm run panel
# http://localhost:8787/admin
```

## بخشهای پنل

| بخش | کار |
|---|---|
| بازیها | اسم، پکیج، کنسول (PS1/PS2)، کاور، آیکون، لینک بازار، نسخه دیتا |
| لینکهای چندسروره | چند آدرس دانلود OBB با الویت و fallback |
| ظاهر | تم پلیاستیشن، رنگها، نمایش بج PS1/PS2 |
| متنها | رشتههای فارسی/انگلیسی |
| پیغامها | پیغام قفل بازار و نصب غیربازار |
| قالبها | نسخه قالب PS1 / PS2 (آپلودی در آینده) |
| **ساخت APK** | **فایل بیس + لوگو + اسم + پکیج → خروجی امضاشده، همانجا** |
| انتشار | پیشنویس → `config.json` عمومی (تمام APKها آپدیت میشوند) |

## ساخت APK

1. فایل بیس را در پوشهٔ `base/` بگذارید (`base.apk`).
2. در تب «ساخت APK»:package، اسم، آیکون و فایل بیس رو انتخاب کنید.
3. دکمهٔ «ساخت و تحویل APK» → لینک دانلود در همان صفحه.

مراحل داخلی: استخراج APK → ویرایش رشتهها در `AndroidManifest.xml` (پکیج و نام) → جایگزینی `ic_launcher*.png` → `zipalign` → `apksigner` با keystore موجود.

**نکته:** تغییر پکیج در APK کامپایلشده با ویرایش باینری منیفست انجام میشود تا کد و `R.java` دستنخورده بمانند. بنابراین فایل بیس باید `context.packageName` رو در Runtime بخواند، نه `BuildConfig.APPLICATION_ID`.

## فایل بیس (ساختهشده)

فایل `base/base.apk` از پروژهٔ ARMSX2 فعلی ساخته شده و **هر دو هستهٔ PS1 و PS2** را دارد:

```
package : com.farsipsx.base
label   : FarsiPSX          ← باید literal باشد تا پنل آنرا عوض کند
size    : ~53 MB
```

دستور ساخت دوباره:

```powershell
cd "C:\Users\pc\AndroidStudioProjects\bully\platforms\android"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat ':app:assemblePlayRelease' `
  '-Parmsx2.applicationId=com.farsipsx.base' `
  '-Parmsx2.appLabel=FarsiPSX' `
  '-Parmsx2.versionCode=1' '-Parmsx2.versionName=1.0'
Copy-Item app\build\outputs\apk\play\release\app-play-release.apk `
  "C:\Users\pc\Documents\Default Project\admin-panel\base\base.apk" -Force
```

آدرس `base_config_url` در `app/src/main/res/values/strings_base.xml` روی **`https://newmshop.ir/config.json`** تنظیم و فایل بیس دوباره ساخته شد.

## دانلود دیتا (OBB + بایوس) — طراحی جدید

فایل دیتا **داخل مسیر استاندارد اندروید** ساخته میشود:

```
Android/obb/<package>/main.<versionCode>.<package>.obb
```

جریان کار:

1. قبل از دانلود، اپ داخل همان مسیر یک **فایل OBB راهنما (seed)** میگذارد. این فایل کوچکJSONای است:

   ```json
   { "gameUrl": "https://.../game.bin", "console": "PS1", "biosUrl": "", "bios": "<base64>" }
   ```

   منبع seed به ترتیب: فایل موجود → `assets/seed.obb` داخل APK → `manifest.obb` روی سرورهای تنظیمشده → فیلدهای `gameUrl` / `biosUrl` / `bios` داخل `config.json`.

2. موقع زدن «دریافت دیتا»: اپ `gameUrl` رو از seed میخواند، فایل بازیو دانلود میکند، سپس بایوس PS1 یا PS2 رو (از `bios` یا `biosUrl`) میگیرد.

3. در نهایت **همان فایل OBB** با این ساختار بازنویسی میشود:

   ```
   [دادههای بازی][بایوس][۸ بایت طول بایوس Little-Endian]["FPSXBIOS"]
   ```

   بایوس موقع اجرا توسط `extractBios()` از دم همین فایل خوانده و در پوشهٔ `bios/` استخراج میشود.

### ساخت فایل seed

```powershell
node tools/make-seed-obb.js `
  --game https://HOST/com.farsipsx.bully-v1/game.bin `
  --console PS1 `
  --bios C:\bios\scph1001.bin `
  --out out/bully-manifest.obb
```

سپس فایل خروجی رو با نام **`manifest.obb`** کنار `game.obb` روی سرور آپلود کنید. اگر بایوس را جداگانه هاست میکنید بجای `--bios` از `--bios-url` استفاده کنید.

## استقرار Cloudflare — انجام شد

| مورد | مقدار |
|---|---|
| Worker | `farsipsx-config` |
| Worker URL | `https://farsipsx-config.networkplus.workers.dev/config.json` |
| Routes | `newmshop.ir/config.json`، `newmshop.ir/admin*`، `newmshop.ir/api/*` (Zone `newmshop.ir`) |
| آدرس عمومی | **https://newmshop.ir/config.json** ✅ |
| پنل آنلاین | **https://newmshop.ir/admin?token=8jUna69fFWw2gqOu1YZyuKPp** |
| KV namespace | `farsipsx-config` → `4f3142cb797a410db40e9c0abc674c26` |
| Binding | `CONFIG` (Production + Preview) |
| DNS | رکورد `A` roots به `192.0.2.1` — Proxied (برای Worker Routing) |

پنل آنلاین با `ADMIN_TOKEN` (Secret) محافظت میشود. بدون توکن `401` میدهد.

> ساخت APK در Cloudflare Worker ممکن نیست (نیاز به Android SDK / keystore دارد). بنابراین:
> - **پنل محلی** (`http://localhost:8787/admin`) → ساخت و امضای APK
> - **پنل کلودفلر** (`https://newmshop.ir/admin`) → ویرایش تنظیمات و انتشار `config.json`

برای آپدیت Worker بعد از تغییر کد: `tools/bundle-worker.js` را اجرا کنید و محتوای `dist/worker.js` را در «Edit code»-worker قرار دهید.

**هاستینگ دیتا:** فعلاً R2 فعال نشد. بنابراین لینکهای آیکون/کاور و دانلود دیتا در `config.json` روی `https://github.com/USER/REPO/...` تنظیم شدهاند؛ قبل از انتشار واقعی آنها را به مخزن/سرور خودتان عوض کنید. سرور دوم (`data.newmshop.ir`) غیرفعال است تا زمانی که R2 راهاندازی شود.

## تنظیمات دیگری که لازم است (پیشنهاد من)

- `versionCode` / `versionName` هر بازی (برای آپدیت در بازار)
- `dataVersion` — تعیین میکند کدوم OBB دانلود شود
- لینک **Privacy Policy** و شرایط استفاده (کافه بازار اجبار میکند)
- دستهبندی و رده سنی بازار + اسکرینشاتها
- `minSdk` و معماریهای `.so` (arm64-v8a, armeabi-v7a)
-产品 ID خرید در Bazaar IAP (برای قفل لایسنس)

## فایلها

- `server.js` — سرویس محلی
- `src/worker.js` — نسخه Cloudflare Worker (برای deploy بعدی)
- `src/admin-ui.js` — رابط کاربری
- `tools/patch-manifest.js` — ویرایش AXML
- `tools/build-apk.js` — خط لوله ساخت و امضا
- `tools/apktool_3.0.3.jar` — فقط برای بررسی/ اشکالزدایی (در ساخت اصلی استفاده نمیشود)
- `data/draft.json`, `data/live.json` — تنظیمات
- `out/` — APKهای خروجی
