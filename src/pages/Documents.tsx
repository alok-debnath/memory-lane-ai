import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/invokeEdge';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Search, ShieldCheck, Clock, AlertTriangle, FileIcon, Image, Receipt, ScrollText, Award, Sparkles, Upload, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isPast, isBefore, addDays } from 'date-fns';
import { useTimezone } from '@/hooks/useTimezone';
import PageInfoButton from '@/components/PageInfoButton';

interface DocExtraction {
  id: string;
  attachment_id: string;
  memory_id: string;
  extracted_text: string;
  document_type: string;
  expiry_date: string | null;
  key_details: Record<string, string>;
  created_at: string;
  memory_notes?: { title: string } | null;
  memory_attachments?: { file_name: string; file_type: string; file_path: string } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  warranty: <ShieldCheck className="w-5 h-5" />,
  receipt: <Receipt className="w-5 h-5" />,
  invoice: <Receipt className="w-5 h-5" />,
  certificate: <Award className="w-5 h-5" />,
  contract: <ScrollText className="w-5 h-5" />,
  insurance: <ShieldCheck className="w-5 h-5" />,
  manual: <FileText className="w-5 h-5" />,
  other: <FileIcon className="w-5 h-5" />,
};

const typeColors: Record<string, string> = {
  warranty: 'text-emerald-500 bg-emerald-500/10',
  receipt: 'text-blue-500 bg-blue-500/10',
  invoice: 'text-indigo-500 bg-indigo-500/10',
  certificate: 'text-amber-500 bg-amber-500/10',
  contract: 'text-purple-500 bg-purple-500/10',
  insurance: 'text-teal-500 bg-teal-500/10',
  manual: 'text-gray-500 bg-gray-500/10',
  other: 'text-muted-foreground bg-secondary',
};

const Documents: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatTz } = useTimezone();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocExtraction | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DocExtraction[] | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['document-extractions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('document_extractions')
        .select('*, memory_notes(title)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DocExtraction[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Semantic search through documents
  const doSearch = async (query: string) => {
    if (!query.trim() || !user) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const { data, error } = await invokeEdge('semantic-search', { query, userId: user.id, searchDocs: true });
      if (error) throw error;
      // Filter for document results
      const docResults = (data.documentResults || []) as DocExtraction[];
      setSearchResults(docResults.length > 0 ? docResults : []);
    } catch {
      // Fallback: local text search
      setSearchResults(
        documents.filter(d =>
          d.extracted_text.toLowerCase().includes(query.toLowerCase()) ||
          (d.key_details?.brand || '').toLowerCase().includes(query.toLowerCase()) ||
          (d.key_details?.model || '').toLowerCase().includes(query.toLowerCase())
        )
      );
    } finally {
      setSearching(false);
    }
  };

  const searchTimerRef = React.useRef<NodeJS.Timeout>();
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    if (value.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => doSearch(value), 400);
    } else {
      setSearchResults(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // 1. Create a memory note as a container
        const { data: memory, error: memError } = await supabase
          .from('memory_notes')
          .insert({
            title: `📄 ${file.name}`,
            content: `Document upload: ${file.name}`,
            category: 'other',
            user_id: user.id,
          })
          .select()
          .single();
        if (memError) throw memError;

        // 2. Upload file to storage
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${memory.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('memory-attachments')
          .upload(path, file);
        if (uploadErr) throw uploadErr;

        // 3. Create attachment record
        const { data: attachment, error: attachErr } = await supabase
          .from('memory_attachments')
          .insert({
            memory_id: memory.id,
            user_id: user.id,
            file_name: file.name,
            file_path: path,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();
        if (attachErr) throw attachErr;

        // 4. Get public URL and trigger AI processing
        const { data: urlData } = supabase.storage.from('memory-attachments').getPublicUrl(path);

        supabase.functions.invoke('process-document', {
          body: {
            attachmentId: attachment.id,
            memoryId: memory.id,
            userId: user.id,
            fileUrl: urlData.publicUrl,
            fileType: file.type,
            fileName: file.name,
          },
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['document-extractions'] });
        });
      }

      toast({ title: `${files.length} document(s) uploaded`, description: 'AI is analyzing your documents...' });
      // Refresh after a short delay for AI processing
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['document-extractions'] }), 3000);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  let displayDocs = searchResults !== null ? searchResults : documents;
  if (typeFilter) {
    displayDocs = displayDocs.filter(d => d.document_type === typeFilter);
  }

  const types = [...new Set(documents.map(d => d.document_type))];
  const expiringDocs = documents.filter(d =>
    d.expiry_date && !isPast(new Date(d.expiry_date)) && isBefore(new Date(d.expiry_date), addDays(new Date(), 90))
  );

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-primary" />
            Document Vault
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {documents.length} document{documents.length !== 1 ? 's' : ''} · AI-extracted & searchable
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageInfoButton />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="shrink-0"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {/* Expiring soon alert */}
      {expiringDocs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="native-card-elevated p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] font-semibold text-foreground">Expiring Soon</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
            {expiringDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="shrink-0 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-2.5 min-w-[180px] snap-start cursor-pointer"
              >
                <p className="text-[13px] font-medium text-foreground truncate">
                  {doc.key_details?.brand || doc.memory_notes?.title || 'Document'}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  Expires {formatTz(doc.expiry_date!, 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents by content, brand, model..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-secondary/60 border-0 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        {searching && (
          <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
        )}
      </div>

      {/* Type filters */}
      {types.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
          <button
            onClick={() => setTypeFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all snap-start ${
              !typeFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            All ({documents.length})
          </button>
          {types.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1 snap-start capitalize ${
                typeFilter === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="native-group">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayDocs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-semibold text-foreground text-base">
            {search ? 'No matches' : 'No documents yet'}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1 mb-3">
            {search ? 'Try different search terms' : 'Upload warranty cards, receipts, invoices, or any documents'}
          </p>
          {!search && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="border-dashed border-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload your first document
            </Button>
          )}
        </div>
      ) : (
        <div className="native-group">
          <AnimatePresence>
            {displayDocs.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="native-group-item cursor-pointer"
                onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColors[doc.document_type] || typeColors.other}`}>
                  {typeIcons[doc.document_type] || typeIcons.other}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">
                    {doc.key_details?.brand
                      ? `${doc.key_details.brand}${doc.key_details.model ? ` ${doc.key_details.model}` : ''}`
                      : doc.memory_notes?.title || 'Document'}
                  </h3>
                  <p className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5">
                    {doc.extracted_text?.slice(0, 100)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-medium text-muted-foreground capitalize bg-secondary/60 px-1.5 py-0.5 rounded">
                      {doc.document_type}
                    </span>
                    {doc.expiry_date && (
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${
                        isPast(new Date(doc.expiry_date)) ? 'text-destructive' : 'text-primary'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {isPast(new Date(doc.expiry_date)) ? 'Expired' : `Expires ${formatTz(doc.expiry_date, 'MMM d, yyyy')}`}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Document detail panel */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="native-card-elevated overflow-hidden"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColors[selectedDoc.document_type] || typeColors.other}`}>
                  {typeIcons[selectedDoc.document_type] || typeIcons.other}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground capitalize">{selectedDoc.document_type}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Added {formatTz(selectedDoc.created_at, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Key details */}
              {selectedDoc.key_details && Object.keys(selectedDoc.key_details).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedDoc.key_details)
                    .filter(([, v]) => v)
                    .map(([key, value]) => (
                      <div key={key} className="bg-secondary/40 rounded-lg px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[13px] text-foreground font-medium mt-0.5">{value}</p>
                      </div>
                    ))}
                </div>
              )}

              {selectedDoc.expiry_date && (
                <div className={`rounded-xl px-4 py-3 ${
                  isPast(new Date(selectedDoc.expiry_date))
                    ? 'bg-destructive/10 border border-destructive/20'
                    : 'bg-primary/5 border border-primary/10'
                }`}>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Expiry Date</p>
                  <p className={`text-[15px] font-semibold mt-0.5 ${
                    isPast(new Date(selectedDoc.expiry_date)) ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {formatTz(selectedDoc.expiry_date, 'MMMM d, yyyy')}
                    {isPast(new Date(selectedDoc.expiry_date)) && ' (Expired)'}
                  </p>
                </div>
              )}

              {/* Extracted text */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Extracted Content</p>
                <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {selectedDoc.extracted_text}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Documents;
