from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    ENVIRONMENT: str = "dev"
    APP_VERSION: str = "0.1.0"

    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://cs2user:localdev123@localhost:5432/cs2analytics"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # ClickHouse
    CLICKHOUSE_URL: str = "http://localhost:8123"

    # JWT
    JWT_SECRET: str = "change-me-in-production-use-64-chars-minimum-random-string-here"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # MinIO (S3)
    MINIO_ENDPOINT: str = "http://localhost:9002"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "cs2-demos"


settings = Settings()
