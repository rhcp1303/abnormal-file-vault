from rest_framework import serializers
from .models import File
from .services import calculate_file_hash


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'file', 'original_filename', 'file_type', 'size', 'uploaded_at', 'file_hash', 'related_file']
        read_only_fields = ['id', 'uploaded_at', 'file_hash', 'size']

    def validate(self, data):
        if 'file' in data and 'related_file' in data:
            raise serializers.ValidationError("Cannot provide both 'file' and 'related_file'.")
        if 'file' not in data and 'related_file' not in data:
            raise serializers.ValidationError("Either 'file' or 'related_file' must be provided.")
        return data

    def create(self, validated_data):
        related_file = validated_data.pop('related_file', None)
        file_obj = validated_data.pop('file', None)

        if related_file:
            return File.objects.create(related_file=related_file,
                                       original_filename=validated_data['original_filename'],
                                       file_type=validated_data['file_type'])
        elif file_obj:
            instance = File.objects.create(file=file_obj, **validated_data)
            instance.file_hash = calculate_file_hash(file_obj)
            instance.size = file_obj.size
            instance.save()
            return instance
        else:
            raise serializers.ValidationError("Either 'file' or 'related_file' must be provided.")
