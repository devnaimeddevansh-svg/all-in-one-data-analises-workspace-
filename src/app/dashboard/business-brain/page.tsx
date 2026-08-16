"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "@/components/chat/chat-interface";
import { formatBytes } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

export default function BusinessBrainPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadDocuments() {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .catch(console.error);
  }

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "text/plain",
          sizeBytes: file.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "text/plain" },
      });

      await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: data.documentId }),
      });

      loadDocuments();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const readyCount = documents.filter((d) => d.status === "READY").length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Business Brain</h1>
            <p className="text-zinc-400">
              Upload documents and ask questions — answers cite your actual data.
              {readyCount > 0 && (
                <span className="text-violet-400 ml-1">({readyCount} document{readyCount !== 1 ? "s" : ""} indexed)</span>
              )}
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.json,.pdf"
              onChange={handleUpload}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 border-r border-zinc-800 overflow-y-auto p-4 space-y-3">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Documents</h2>
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{doc.name}</h3>
                    <p className="text-xs text-zinc-500">{formatBytes(doc.sizeBytes)}</p>
                    <Badge
                      variant={
                        doc.status === "READY" ? "success" : doc.status === "FAILED" ? "warning" : "secondary"
                      }
                      className="mt-1"
                    >
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {documents.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-8">
              Upload TXT, MD, CSV, JSON, or PDF files to get started.
            </p>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <ChatInterface
            apiEndpoint="/api/business-brain/chat"
            showSources
            placeholder={
              readyCount > 0
                ? "Ask a question about your documents..."
                : "Upload documents first, then ask questions..."
            }
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
