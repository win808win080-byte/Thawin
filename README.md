# Portfolio ของนายธาวิน เดชวัฒน์

เว็บไซต์ Portfolio แบบ static ภาษาไทย สร้างด้วย HTML, CSS และ JavaScript แบ่งเป็น 3 หน้าแยกกัน รองรับหน้าจอมือถือและเดสก์ท็อป

## เปิดใช้งาน

เปิด Terminal ในโฟลเดอร์ `assets` แล้วรัน local server (หน้าแอดมินใช้ JavaScript modules และเชื่อม Supabase):

```powershell
python -m http.server 5500
```

จากนั้นเปิด `http://localhost:5500` โดยแต่ละหน้าจะอยู่ที่:

- `index.html` — หน้าแรก
- `work.html` — ผลงาน
- `about.html` — ประวัติส่วนตัว
- `admin.html` — จัดการ/อัปโหลดผลงาน

## ปรับแต่งหน้าเว็บ

- แก้ชื่อและข้อมูลแนะนำตัว/ประวัติส่วนตัวใน `index.html` หรือ `about.html`
- แก้ข้อมูลผลงานในการ์ด `.project-card` ใน `work.html`
- ปรับสีและการจัดวางใน `style.css`
- แบนเนอร์แนวนอนด้านบนหน้าแรกใช้ไฟล์ `รูป/รูปโปร.png` โดยกำหนด `src` ของ `.home-banner img` ใน `index.html`
- ภาพในกรอบโปรไฟล์ใช้ไฟล์ `รูป/เอง.jpg` ทั้งหน้าแรกและหน้าประวัติส่วนตัว หากเปลี่ยนรูป ให้อัปเดต `src` ของ `.avatar-art img` ใน `index.html` และ `about.html` โดยกำหนดตำแหน่งครอปใน `style.css`

## เชื่อม Supabase เพื่อแชร์ผลงานออนไลน์

หน้าแอดมินและหน้าผลงานใช้ Supabase Database สำหรับรายละเอียด และ Supabase Storage สำหรับรูป/PDF การเพิ่ม จัดเรียง หรือลบผลงานจะมีผลกับผู้ชมทุกคนทันที ไม่ต้องส่งออกไฟล์หรือเผยแพร่ GitHub Pages ใหม่

### ตั้งค่า Supabase ครั้งแรก

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com/) และรอให้ฐานข้อมูลพร้อม
2. ใน **Authentication → Users** สร้างผู้ใช้ผู้ดูแลด้วยอีเมลและรหัสผ่าน จากนั้นยืนยันอีเมลให้เรียบร้อย ปิดการสมัครสมาชิกสาธารณะใน **Authentication → Providers → Email** เพื่อไม่ให้คนอื่นสร้างบัญชีได้
3. เปิด [supabase-setup.sql](./supabase-setup.sql) เปลี่ยน `YOUR_ADMIN_EMAIL` ในเงื่อนไขอีเมลให้ตรงกับอีเมลผู้ดูแล แล้วรันทั้งหมดใน **SQL Editor** ของโปรเจกต์
4. เปิด **Project Settings → API** แล้วคัดลอก Project URL และ publishable key หรือ legacy `anon` key (ห้ามใช้ `service_role` หรือ secret key) ใส่ใน `supabase-config.js`
5. อัปโหลดไฟล์ที่แก้แล้วไปยัง GitHub repo โดยวางไฟล์ HTML, JS, CSS, `supabase-config.js` และ `supabase-setup.sql` ในตำแหน่งที่ตรงกับหน้าเว็บปัจจุบัน แล้ว commit/push
6. เปิด `admin.html` ใส่อีเมล/รหัสผ่านผู้ดูแล เพิ่มผลงาน แล้วตรวจหน้า `work.html`

สิทธิ์ฐานข้อมูลใน SQL อนุญาตให้ทุกคนอ่านผลงาน แต่เฉพาะอีเมลผู้ดูแลที่ระบุไว้เพิ่ม/แก้ไข/ลบและอัปโหลดไฟล์ได้ รูปกับ PDF ตั้งเป็น public เพื่อให้หน้า Portfolio โหลดได้ ห้ามเก็บข้อมูลลับไว้ในผลงาน อย่าใส่ service-role key ไว้ในเว็บหรือส่งให้ผู้อื่น

เมื่อเข้าสู่ระบบจากเบราว์เซอร์เครื่องที่มีผลงานเก่า ปุ่ม **ย้ายผลงานเดิมเข้า Supabase** จะปรากฏขึ้น กดปุ่มเพื่อย้ายรายละเอียด รูป และ PDF จาก IndexedDB โดยไม่ลบข้อมูลเดิม ไฟล์ `supabase-config.js` ที่ยังเป็นค่า `YOUR_PROJECT_ID`/`YOUR_SUPABASE_ANON_KEY` หมายถึงยังไม่ได้เชื่อมโปรเจกต์
