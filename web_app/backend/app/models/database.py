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


def _is_placeholder_secret(value: str) -> bool:
    normalized = (value or "").strip()
    if not normalized:
        return True

    lowered = normalized.lower()
    return (
        lowered in {"changeme", "change_me_in_env", "replace_me"}
        or "change_me" in lowered
        or "placeholder" in lowered
        or "redacted" in lowered
        or (normalized.startswith("<") and normalized.endswith(">"))
    )


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


class CaseTask(Base):
    __tablename__ = "case_tasks"
    id = Column(Integer, primary_key=True, index=True)
    iris_case_id = Column(Integer, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="todo")        # todo/in_progress/done/blocked
    priority = Column(String(20), default="medium")    # low/medium/high/critical
    assignee = Column(String(100), nullable=True)
    tags = Column(String(500), nullable=True)
    template_id = Column(String(100), nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CaseEvidence(Base):
    __tablename__ = "case_evidence"
    id = Column(Integer, primary_key=True, index=True)
    iris_case_id = Column(Integer, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(50), default="manual")  # wazuh/opensearch/investigate/ioc/misp/shuffle/manual
    ev_type = Column(String(30), default="text")   # json/text/screenshot/file_metadata/report
    sha256 = Column(String(64), nullable=True)
    content_preview = Column(Text, nullable=True)
    raw_json = Column(Text, nullable=True)
    linked_task_id = Column(Integer, nullable=True)
    linked_timeline_id = Column(Integer, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CaseActivityLog(Base):
    __tablename__ = "case_activity_log"
    id = Column(Integer, primary_key=True, index=True)
    iris_case_id = Column(Integer, nullable=False, index=True)
    action = Column(String(100), nullable=False)
    detail = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ShuffleActionHistory(Base):
    __tablename__ = "shuffle_action_history"
    id = Column(Integer, primary_key=True, index=True)
    iris_case_id = Column(Integer, nullable=True, index=True)
    action_type = Column(String(50), nullable=False)  # block/escalate/triage/notify
    payload_summary = Column(Text, nullable=True)
    execution_id = Column(String(200), nullable=True)
    response_mode = Column(String(20), default="simulation")  # simulation/live
    response_ok = Column(Boolean, default=True)
    response_detail = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IOCEnrichmentCache(Base):
    __tablename__ = "ioc_enrichment_cache"
    id = Column(Integer, primary_key=True, index=True)
    ioc_value = Column(String(500), unique=True, nullable=False, index=True)
    ioc_type = Column(String(20), nullable=False)  # ip|domain|hash|url
    abuseipdb_score = Column(Integer, nullable=True)
    otx_pulse_count = Column(Integer, nullable=True)
    virustotal_detections = Column(Integer, nullable=True)
    misp_matched = Column(Boolean, default=False)
    shodan_ports = Column(Text, nullable=True)  # JSON list
    raw_data = Column(Text, nullable=True)       # JSON blob
    source_statuses = Column(Text, nullable=True)  # JSON: {source: 'ok'|'error'|'not_configured'}
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(Text, unique=True, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


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
    if not db.query(User).filter(User.username == settings.default_admin_username).first():
        if _is_placeholder_secret(settings.default_admin_password):
            raise RuntimeError(
                "DEFAULT_ADMIN_PASSWORD is required to bootstrap the initial web app admin user."
            )
        admin = User(
            username=settings.default_admin_username,
            email=settings.default_admin_email,
            full_name=settings.default_admin_full_name,
            hashed_password=get_password_hash(settings.default_admin_password),
            role="superadmin",
        )
        db.add(admin)
        db.commit()
        print(f"Default admin user created: {settings.default_admin_username}")
    db.close()
