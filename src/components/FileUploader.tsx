import React, { useRef, useState } from 'react';
import { Upload, X, FileIcon, Image, FileText, Film, Music, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/invokeEdge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id?: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  url?: string;
  extraction?: {
    document_type?: string;
    summary?: string;
    expiry_date?: string;
  } | null;
}

interface FileUploaderProps {
  memoryId: string;
  existingFiles?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
}

const fileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-primary" />;
  if (type.startsWith('video/')) return <Film className="w-5 h-5 text-accent-foreground" />;
  if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-accent-foreground" />;
  if (type.includes('pdf') || type.includes('doc') || type.includes('text'))
    return <FileText className="w-5 h-5 text-accent-foreground" />;
  return <FileIcon className="w-5 h-5 text-muted-foreground" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileUploader: React.FC<FileUploaderProps> = ({ memoryId, existingFiles = [], onFilesChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('memory-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const processDocument = async (file: UploadedFile) => {
    if (!user || !file.id) return;
    const fileUrl = file.url || getPublicUrl(file.file_path);

    setProcessingIds(prev => new Set(prev).add(file.id!));
    try {
      const { data, error } = await invokeEdge('process-document', {
        attachmentId: file.id,
        memoryId,
        userId: user.id,
        fileUrl,
        fileType: file.file_type,
        fileName: file.file_name,
      });

      if (error) throw error;

      if (data?.extraction) {
        // Update file with extraction info
        const updated = files.map(f =>
          f.id === file.id ? { ...f, extraction: data.extraction } : f
        );
        setFiles(updated);
        onFilesChange?.(updated);

        const docType = data.extraction.document_type;
        toast({
          title: `📄 ${docType === 'warranty' ? 'Warranty' : docType === 'receipt' ? 'Receipt' : 'Document'} processed!`,
          description: data.extraction.summary || 'Content extracted and indexed for search',
        });
      }
    } catch (err: any) {
      console.error('Document processing error:', err);
      // Silent fail - processing is optional
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(file.id!);
        return next;
      });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || !user) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(selected)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${memoryId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('memory-attachments')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: insertData, error: insertError } = await supabase
          .from('memory_attachments')
          .insert({
            memory_id: memoryId,
            user_id: user.id,
            file_name: file.name,
            file_path: path,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const uploadedFile: UploadedFile = {
          id: insertData.id,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          file_size: file.size,
          url: getPublicUrl(path),
        };

        newFiles.push(uploadedFile);
      }

      const updated = [...files, ...newFiles];
      setFiles(updated);
      onFilesChange?.(updated);
      toast({ title: `${newFiles.length} file(s) uploaded` });

      // Trigger AI document processing for each file (non-blocking)
      for (const file of newFiles) {
        if (
          file.file_type.startsWith('image/') ||
          file.file_type === 'application/pdf' ||
          file.file_type.includes('text') ||
          file.file_type.includes('document')
        ) {
          processDocument(file);
        }
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    try {
      await supabase.storage.from('memory-attachments').remove([file.file_path]);
      if (file.id) {
        await supabase.from('memory_attachments').delete().eq('id', file.id);
      }
      const updated = files.filter((f) => f.file_path !== file.file_path);
      setFiles(updated);
      onFilesChange?.(updated);
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full border-dashed border-2 h-12"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {uploading ? 'Uploading...' : 'Attach files (warranties, receipts, docs)'}
      </Button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.file_path}
              className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2"
            >
              {file.file_type.startsWith('image/') && file.url ? (
                <img
                  src={file.url || getPublicUrl(file.file_path)}
                  alt={file.file_name}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                  {fileIcon(file.file_type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{formatSize(file.file_size)}</p>
                  {processingIds.has(file.id || '') && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      Analyzing...
                    </span>
                  )}
                  {file.extraction?.document_type && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      {file.extraction.document_type}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(file)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
