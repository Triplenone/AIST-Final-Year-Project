"""
测试用户 seed 脚本：CHAN TAI MAN / LEE TAI MAN

目的：
    令前端 caregiver_lee 登入 /family 后，PrimaryResidentBriefing hero 由
    fallback 的 test-user01 切换至 "CHAN TAI MAN"。
    前端配对逻辑：slugify(resident.name) === 'chan-tai-man'。
    注意：name 须为纯英文，slugify 才能正确产出 'chan-tai-man'。

使用方法（仿 check_device_id.py / test_data_reception.py）：
    cd backend/backend
    ..\\venv\\Scripts\\python.exe seed_test_users.py
    或
    python seed_test_users.py

设计原则：
    - 纯加性，不改 schema / model / migration / route
    - 完全 idempotent：以 name 完全相符为去重 key
    - 不执行 DDL，不创建关系表

Limitations（future slice 范畴）：
    - Caregiver password 由前端 localStorage demo account 模拟，
      backend 不负责 auth；本 script 只写人物资料。
    - 不创建 caregiver_resident 关系表，前端暂用 username slug
      静态 mapping (caregiver_lee → chan-tai-man)。
    - 上述两项需另外设计，需要 schema 改动时由 Lin 范畴处理。
"""
import os
import sys

# 添加项目路径到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database import SessionLocal
    from app.models.device import Device
    from app.models.user import Gender, RoleType, User
except ImportError as e:
    print("[错误] 导入错误:", e)
    print("\n请确保：")
    print("   1. 已激活虚拟环境（venv）")
    print("   2. 已安装所有依赖：pip install -r requirements.txt")
    print("   3. 在 backend/backend 目录下运行此脚本")
    print("\n正确运行方式：")
    print("   ..\\venv\\Scripts\\python.exe seed_test_users.py")
    sys.exit(1)


SEED_USERS = [
    {
        "name": "CHAN TAI MAN",
        "role_type": RoleType.ELDERLY,
        "gender": Gender.MALE,
        "age": 78,
        "contact_info": "+852 9000 0001",
        "medical_conditions": "高血壓、輕度認知障礙",
    },
    {
        "name": "LEE TAI MAN",
        "role_type": RoleType.CAREGIVER,
        "gender": Gender.FEMALE,
        "age": 42,
        "contact_info": "+852 9000 0002",
        "medical_conditions": None,
    },
]

PRIMARY_ELDERLY_NAME = SEED_USERS[0]["name"]
PRIMARY_DEVICE_MAC = "0000"


def upsert_user(db, payload):
    """以 name 完全相符为去重 key，存在即跳过。返回 (user, created)。"""
    existing = db.query(User).filter(User.name == payload["name"]).first()
    if existing is not None:
        print(f'[seed] User "{payload["name"]}" exists -> user_id={existing.user_id} (skipped)')
        return existing, False

    user = User(**payload)
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f'[seed] User "{payload["name"]}" created -> user_id={user.user_id}')
    return user, True


def link_primary_device(db, primary_user):
    """将 mac='0000' 的 device 连到主测试 elderly。Best-effort，失败只 print warning。"""
    if primary_user is None:
        print(f"[seed] WARNING: primary user not resolved, skip device link")
        return

    device = db.query(Device).filter(Device.mac_address == PRIMARY_DEVICE_MAC).first()
    if device is None:
        print(f"[seed] WARNING: device mac={PRIMARY_DEVICE_MAC} not found, skip device link")
        return

    if device.elderly_user_id == primary_user.user_id:
        print(f"[seed] Device mac={PRIMARY_DEVICE_MAC} already linked to user_id={primary_user.user_id} (skipped)")
        return

    if device.elderly_user_id is not None and device.elderly_user_id != primary_user.user_id:
        print(
            f"[seed] WARNING: device mac={PRIMARY_DEVICE_MAC} already occupied by "
            f"user_id={device.elderly_user_id}, skip (will not overwrite)"
        )
        return

    device.elderly_user_id = primary_user.user_id
    db.commit()
    print(f"[seed] Device mac={PRIMARY_DEVICE_MAC} -> linked elderly_user_id={primary_user.user_id}")


def main():
    print("[seed] connecting via app.database.SessionLocal ...")
    db = SessionLocal()
    try:
        primary_user = None
        for payload in SEED_USERS:
            user, _created = upsert_user(db, payload)
            if payload["name"] == PRIMARY_ELDERLY_NAME:
                primary_user = user

        link_primary_device(db, primary_user)
        print("[seed] done.")
    except Exception as exc:
        db.rollback()
        print(f"[seed] ERROR: {exc}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
