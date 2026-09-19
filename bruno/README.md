# Romies API - Bruno Collection

ชุด API Collection สำหรับทดสอบและเรียกใช้งาน Backend ของโปรเจกต์ **Romies-Trip-and-Track** โดยใช้ [Bruno](https://www.usebruno.com/) (Git-friendly API Client)

---

## 🚀 วิธีเปิดใช้งานด้วย Bruno Desktop App

1. ดาวน์โหลดและติดตั้งโปรแกรม **Bruno** จาก [https://www.usebruno.com/downloads](https://www.usebruno.com/downloads) (หากยังไม่ได้ติดตั้ง)
2. เปิดโปรแกรม Bruno ขึ้นมา
3. คลิก **"Open Collection"**
4. เลือกเปิดโฟลเดอร์ `bruno` ที่อยู่ในรากของโปรเจกต์นี้:
   ```text
   d:\Roamies\Romies-Trip-and-Track\bruno
   ```
5. ที่มุมขวาบนของหน้าต่าง Bruno เลือก Environment เป็น **`Local`** (จะชี้ไปที่ `http://localhost:3001` อัตโนมัติ)
6. สามารถคลิกเลือก Request (เช่น `App/Get Hello` หรือ `Trips/Create Trip`) แล้วกดปุ่ม **Send** เพื่อทดสอบยิง API ได้ทันที!

---

## 📂 โครงสร้าง Collection ในโฟลเดอร์นี้

```text
bruno/
├── bruno.json               # คอนฟิกหลักของ Collection
├── README.md                # คู่มือการใช้งาน
├── environments/
│   └── Local.bru            # ตัวแปร baseUrl (http://localhost:3001)
├── App/
│   └── Get Hello.bru        # ทดสอบ Health Check (GET /)
├── Trips/
│   ├── Create Trip.bru      # สร้างทริปใหม่ (POST /trips)
│   └── Get Trips.bru        # ดึงรายการทริป (GET /trips)
└── Expenses/
    └── Create Expense.bru   # สร้างบิลค่าใช้จ่าย (POST /expenses)
```

---

## 💻 การรันผ่าน Command Line (Bruno CLI)

สามารถรันเทส API ทั้งหมดผ่าน Terminal หรือใน CI/CD pipeline ได้ด้วยคำสั่ง:

```bash
# รันผ่าน npx ได้ทันทีโดยไม่ต้องติดตั้ง
npx @usebruno/cli run --env Local
```
