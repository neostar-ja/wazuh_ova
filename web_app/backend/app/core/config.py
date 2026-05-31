from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "SOC Center"
    app_env: str = "production"
    app_base_path: str = "/wazuh"
    secret_key: str = ""
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:////app/data/soc_center.db"

    wazuh_api_host: str = "10.251.151.11"
    wazuh_api_port: int = 55000
    wazuh_api_user: str = "wazuh-wui"
    wazuh_api_pass: str = ""
    wazuh_verify_ssl: bool = False

    opensearch_host: str = "10.251.151.13"
    opensearch_port: int = 9200
    opensearch_user: str = "admin"
    opensearch_pass: str = ""
    opensearch_verify_ssl: bool = False
    opensearch_index: str = "wazuh-alerts-4.x-*"

    default_admin_username: str = "admin"
    default_admin_email: str = "admin@hospital.wu.ac.th"
    default_admin_full_name: str = "SOC Administrator"
    default_admin_password: str = ""

    grafana_url: str = ""
    grafana_ds_uid: str = "dfmhsi3iylzb4d"
    grafana_token: str = ""

    abuseipdb_key: str = ""
    otx_key: str = ""
    shodan_key: str = ""
    virustotal_key: str = ""

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Web Push (VAPID)
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_email: str = "mailto:soc@hospital.wu.ac.th"

    # SOAR Integration
    shuffle_url: str = ""
    shuffle_token: str = ""
    shuffle_webhook_url: str = ""
    shuffle_block_url: str = ""
    shuffle_esc_url: str = ""
    iris_url: str = ""
    iris_api_key: str = ""
    iris_customer_id: str = "1"
    misp_url: str = ""
    misp_api_key: str = ""

    class Config:
        env_file = "/opt/code/wazuh_ova/web_app/.env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
