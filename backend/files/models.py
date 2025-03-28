from django.db import models
import uuid
import os
from .services import calculate_file_hash


def file_upload_path(instance, filename):
    """Generate file path for new file upload"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('uploads', filename)


class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=file_upload_path, null=True, blank=True)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    size = models.BigIntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    related_file = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='references')

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.original_filename

    def save(self, *args, **kwargs):
        """Override save to calculate and store the file hash only for original uploads."""
        if not self.pk and self.file:
            self.file_hash = calculate_file_hash(self.file)
            self.size = self.file.size
        super().save(*args, **kwargs)
