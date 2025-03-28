from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import File
from .serializers import FileSerializer
from .services import check_and_handle_duplicate_file

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        existing_file, file_hash = check_and_handle_duplicate_file(file_obj)

        if existing_file:
            return Response(
                {'error': 'Duplicate file detected', 'existing_file_id': existing_file.id},
                status=status.HTTP_409_CONFLICT
            )
        else:
            data = {
                'file': file_obj,
                'original_filename': file_obj.name,
                'file_type': file_obj.content_type,
                'size': file_obj.size,
                'file_hash': file_hash
            }

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(file_hash=serializer.validated_data['file_hash'])