import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ShareMemoryProps {
  memoryId: string;
  title: string;
}

const ShareMemory: React.FC<ShareMemoryProps> = ({ memoryId, title }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setLoading(true);
    try {
      // Check for existing share
      const { data: existing } = await supabase
        .from('shared_memories')
        .select('share_token')
        .eq('memory_id', memoryId)
        .eq('user_id', user.id)
        .maybeSingle();

      let token = existing?.share_token;

      if (!token) {
        const { data, error } = await supabase
          .from('shared_memories')
          .insert({ memory_id: memoryId, user_id: user.id })
          .select('share_token')
          .single();
        if (error) throw error;
        token = data.share_token;
      }

      const url = `${window.location.origin}/shared/${token}`;
      setShareUrl(url);

      // Try native share first
      if (navigator.share) {
        await navigator.share({ title: `Memora: ${title}`, url });
      }
    } catch (err: any) {
      toast({ title: 'Error sharing', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (shareUrl) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{shareUrl}</span>
        <button onClick={copyLink} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
    >
      <Share2 className="w-4 h-4" />
    </button>
  );
};

export default ShareMemory;
