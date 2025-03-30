from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import File
from .serializers import FileSerializer
from .services import calculate_file_hash
from django.db.models import Sum
from django.db.models import Sum, F, Q, Count, IntegerField
from rest_framework.decorators import action


class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    @action(detail=False, methods=['get'])
    def storage_statistics(self, request):
        """
        Calculates and returns storage statistics.
        """
        unique_storage = File.objects.filter(related_file__isnull=True).aggregate(total_size=Sum('size'))[
                             'total_size'] or 0
        total_storage_if_duplicates = File.objects.all().aggregate(total_size=Sum('size'))['total_size'] or 0
        referenced_counts = File.objects.filter(
            id__in=File.objects.filter(related_file__isnull=False).values_list('related_file', flat=True)
        ).annotate(
            reference_count=Count('references')
        ).values('id', 'reference_count')

        storage_savings = 0
        referenced_file_ids = [item['id'] for item in referenced_counts]

        if referenced_file_ids:
            referenced_file_sizes = File.objects.filter(id__in=referenced_file_ids).values('id', 'size')
            size_map = {item['id']: item['size'] for item in referenced_file_sizes}

            for ref_info in referenced_counts:
                file_id = ref_info['id']
                count = ref_info['reference_count']
                size = size_map.get(file_id, 0)
                storage_savings += size * count

        return Response({
            'unique_storage_used': unique_storage,
            'total_storage_if_duplicates': total_storage_if_duplicates,
            'storage_savings': storage_savings,
        }, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        file_hash = calculate_file_hash(file_obj)
        existing_file = File.objects.filter(file_hash=file_hash).first()
        if existing_file:
            data = {
                'original_filename': file_obj.name,
                'file_type': file_obj.content_type,
                'related_file': existing_file.id,
            }
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
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
        serializer.save()