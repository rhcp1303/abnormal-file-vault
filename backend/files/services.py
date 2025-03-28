import hashlib
from .models import File

def check_and_handle_duplicate_file(file_obj):
    file_hash = calculate_file_hash(file_obj)
    existing_file = File.objects.filter(file_hash=file_hash).first()
    return existing_file, file_hash

def calculate_file_hash(file_obj):
    hasher = hashlib.md5()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    return hasher.hexdigest()