import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type MemoryNote } from '@/components/MemoryCard';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportMemoriesProps {
  notes: MemoryNote[];
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(notes: MemoryNote[]): string {
  const lines = [`# Memora Export`, `> Exported ${format(new Date(), 'PPP')} — ${notes.length} memories\n`];
  notes.forEach((n) => {
    lines.push(`## ${n.title}`);
    lines.push(`**Category:** ${n.category || 'other'} | **Created:** ${format(new Date(n.created_at), 'PPP p')}`);
    if (n.reminder_date) lines.push(`**Reminder:** ${format(new Date(n.reminder_date), 'PPP p')}`);
    lines.push('', n.content, '', '---', '');
  });
  return lines.join('\n');
}

function toCsv(notes: MemoryNote[]): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = 'Title,Content,Category,Created,Reminder,Recurring,Recurrence Type';
  const rows = notes.map((n) =>
    [
      escape(n.title),
      escape(n.content),
      escape(n.category || 'other'),
      escape(format(new Date(n.created_at), 'yyyy-MM-dd HH:mm')),
      n.reminder_date ? escape(format(new Date(n.reminder_date), 'yyyy-MM-dd HH:mm')) : '',
      n.is_recurring ? 'Yes' : 'No',
      escape(n.recurrence_type || ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function toJson(notes: MemoryNote[]): string {
  return JSON.stringify(
    notes.map(({ id, ...rest }) => rest),
    null,
    2
  );
}

const ExportMemories: React.FC<ExportMemoriesProps> = ({ notes }) => {
  if (notes.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[12px] gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => downloadFile(toMarkdown(notes), 'memora-export.md', 'text/markdown')}>
          <FileText className="w-4 h-4 mr-2" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile(toCsv(notes), 'memora-export.csv', 'text/csv')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile(toJson(notes), 'memora-export.json', 'application/json')}>
          <FileDown className="w-4 h-4 mr-2" />
          JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMemories;
