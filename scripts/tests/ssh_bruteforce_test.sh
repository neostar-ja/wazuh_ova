#!/bin/bash

# กำหนด IP เป้าหมาย (เครื่อง Worker ของคุณ) และ Username ที่จะทดสอบ
TARGET="10.251.151.12"
USERNAME="wazuh-user"

echo "🚀 Starting SSH Brute Force Simulation against $TARGET..."
echo "--------------------------------------------------------"

# ลูปเพื่อยิงรหัสผ่านปลอมจำนวน 20 ครั้ง (rule 5763 ต้องการ 8 failures/120 sec)
for i in {1..20}
do
    echo "[Attempt $i] Trying to login with fake password..."

    # บังคับใช้ Password auth เท่านั้น (ปิด PublicKey เพื่อกัน auto-login ด้วย SSH key)
    sshpass -p "FakePassword$i!" ssh \
        -o StrictHostKeyChecking=no \
        -o PubkeyAuthentication=no \
        -o PreferredAuthentications=password \
        $USERNAME@$TARGET "exit" &>/dev/null

    # หน่วงเวลาเล็กน้อยเพื่อไม่ให้ Connection ถูกตัดเร็วเกินไป
    sleep 1
done

echo "--------------------------------------------------------"
echo "✅ Attack simulation completed! Check your Wazuh and Telegram."
