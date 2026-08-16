"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Business Brain</h1>
          <p className="text-zinc-400">
            Upload company documents. AI answers business questions using your actual data.
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

      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-violet-500" />
                <div>
                  <h3 className="font-medium">{doc.name}</h3>
                  <p className="text-sm text-zinc-400">
                    {formatBytes(doc.sizeBytes)} · {doc.mimeType}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  doc.status === "READY" ? "success" : doc.status === "FAILED" ? "warning" : "secondary"
                }
              >
                {doc.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {documents.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            Upload documents to power your Business Brain. Supported: TXT, MD, CSV, JSON, PDF.
          </p>
        )}
      </div>
    </div>
  );
}
