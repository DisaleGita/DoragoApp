import asyncio
from tempfile import SpooledTemporaryFile

import boto3  # type: ignore[import-untyped]
from botocore.client import BaseClient  # type: ignore[import-untyped]

from app.core.config import Settings


class PrivateObjectStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: BaseClient = boto3.client(
            "s3",
            endpoint_url=settings.storage_endpoint,
            aws_access_key_id=(
                settings.storage_access_key.get_secret_value()
                if settings.storage_access_key
                else None
            ),
            aws_secret_access_key=(
                settings.storage_secret_key.get_secret_value()
                if settings.storage_secret_key
                else None
            ),
            region_name=settings.storage_region,
            use_ssl=settings.storage_use_ssl,
        )

    async def ensure_bucket(self) -> None:
        def ensure() -> None:
            try:
                self.client.head_bucket(Bucket=self.settings.storage_bucket)
            except Exception:
                self.client.create_bucket(Bucket=self.settings.storage_bucket)

        await asyncio.to_thread(ensure)

    async def put(self, key: str, file_obj: SpooledTemporaryFile[bytes], mime_type: str) -> None:
        file_obj.seek(0)
        await asyncio.to_thread(
            self.client.upload_fileobj,
            file_obj,
            self.settings.storage_bucket,
            key,
            ExtraArgs={"ContentType": mime_type},
        )

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(
            self.client.delete_object, Bucket=self.settings.storage_bucket, Key=key
        )

    async def read(self, key: str) -> bytes:
        def download() -> bytes:
            response = self.client.get_object(Bucket=self.settings.storage_bucket, Key=key)
            body = response["Body"]
            try:
                return bytes(body.read())
            finally:
                body.close()

        return await asyncio.to_thread(download)
