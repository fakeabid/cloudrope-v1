from storages.backends.s3boto3 import S3Boto3Storage


class PrivateS3Storage(S3Boto3Storage):
    default_acl = 'private'
    file_overwrite = False
    custom_domain = False  # Never use public CDN — always pre-signed URLs