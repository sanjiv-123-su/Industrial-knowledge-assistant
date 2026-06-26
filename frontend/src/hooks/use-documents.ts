import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL, type DocumentResponse } from "@/lib/api";

export function useDocuments() {
  return useQuery<DocumentResponse[]>({
    queryKey: ["documents"],
    queryFn: () => apiFetch<DocumentResponse[]>("/documents"),
    retry: 2,
  });
}

export function useDocument(id: string | null) {
  return useQuery<DocumentResponse>({
    queryKey: ["documents", id],
    queryFn: () => apiFetch<DocumentResponse>(`/documents/${id}`),
    enabled: !!id,
    retry: 1,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      file,
      title,
      department,
      version,
      onProgress,
    }: {
      file: File;
      title: string;
      department: string;
      version: string;
      onProgress?: (pct: number) => void;
    }) => {
      return new Promise<DocumentResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append("file", file);
        form.append("title", title);
        form.append("department", department);
        form.append("version", version);

        xhr.open("POST", `${API_BASE_URL}/documents/upload`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress?.(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as DocumentResponse);
            } catch {
              reject(new Error("Invalid server response"));
            }
          } else {
            try {
              const parsed = JSON.parse(xhr.responseText);
              reject(new Error(parsed.detail || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(form);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ status: string; message: string }>(`/documents/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useReindexDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<DocumentResponse>(`/documents/${id}/reindex`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}