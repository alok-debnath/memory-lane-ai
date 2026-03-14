import { ScrollView, YStack, Text, XStack, Button } from "tamagui";
import { FileText, Plus } from "@tamagui/lucide-icons";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";
import { SheetModal } from "../../components/shared/SheetModal";
import { useState } from "react";

export default function DocumentsScreen() {
  const { userId } = useAuthStore();
  const [open, setOpen] = useState(false);
  const qId = userId || "js93nf8201hns";
  const docs = useQuery(api.queries_extra.getDocuments, { userId: qId as any }) || [];

  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6" space="$4">
      <XStack jc="space-between" ai="center">
        <XStack ai="center" space="$2">
          <FileText size={28} color="$primary" />
          <Text fontSize="$8" fontWeight="bold">Documents</Text>
        </XStack>
        <Button size="$3" circular icon={<Plus size={16} />} onPress={() => setOpen(true)} />
      </XStack>

      {docs.length === 0 ? (
        <YStack ai="center" py="$8">
          <Text color="$gray10">No extracted documents found</Text>
        </YStack>
      ) : (
        docs.map((d, i) => (
          <YStack key={i} bg="$gray2" p="$4" br="$4" space="$2" mb="$2">
            <Text fontWeight="bold" fontSize="$5">{d.document_type || "Unknown Document"}</Text>
            <Text color="$gray11" numberOfLines={3}>{d.extracted_text}</Text>
          </YStack>
        ))
      )}

      <SheetModal open={open} onOpenChange={setOpen}>
        <Text fontSize="$6" fontWeight="bold" mb="$4">Upload Document</Text>
        <Text color="$gray11" mb="$4">AI will extract the text, type, and key details from your image or PDF.</Text>
        <Button bg="$primary" color="$background" icon={<FileText />}>Select File</Button>
      </SheetModal>
    </ScrollView>
  );
}
