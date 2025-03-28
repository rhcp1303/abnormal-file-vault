import hashlib


def calculate_file_hash(file_obj):
    hasher = hashlib.md5()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    return hasher.hexdigest()
