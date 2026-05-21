from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

from ..core.config import settings

os.makedirs("/app/data", exist_ok=True)
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default="viewer")  # superadmin|admin|analyst|viewer
    is_active = Column(Boolean, default=True)
    theme = Column(String(10), default="dark")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    target = Column(String(200), nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class CustomIOC(Base):
    __tablename__ = "custom_ioc"
    id = Column(Integer, primary_key=True, index=True)
    ioc_type = Column(String(20), nullable=False)  # ip|domain|hash|url
    value = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    added_by = Column(String(50), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    severity = Column(String(20), default="high")


class AlertTuning(Base):
    __tablename__ = "alert_tuning"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(20), nullable=False, unique=True)
    original_level = Column(Integer, nullable=False)
    tuned_level = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    added_by = Column(String(50), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    review_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")  # active|expired|reverted


class AlertConfig(Base):
    __tablename__ = "alert_config"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(50), nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    from ..core.security import get_password_hash
    db = SessionLocal()
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            email="admin@hospital.wu.ac.th",
            full_name="SOC Administrator",
            hashed_password=get_password_hash("Wazuh@S0C2026!"),
            role="superadmin",
        )
        db.add(admin)
        db.commit()
        print("Default admin user created: admin / Wazuh@S0C2026!")
    db.close()
