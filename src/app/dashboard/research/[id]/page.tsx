"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string;
  title: string;
  content: string;
  sources: Array<{ title: string; url: string }>;
  recommendations: string[];
}

interface Project {
  id: string;
  title: string;
  query: string;
  status: string;
  reports: Report[];
}

export default function ResearchDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const poll = () => {
      fetch(`/api/research/${params.id}`)
        .then((r) => r.json())
        .then((data) => {
          setProject(data.project);
          if (data.project?.status === "IN_PROGRESS") {
            setTimeout(poll, 3000);
          }
        })
        .catch(console.error);
    };
    poll();
  }, [params.id]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const report = project.reports[0];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link href="/dashboard/research">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Research
        </Button>
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <Badge variant={project.status === "COMPLETED" ? "success" : "warning"}>
          {project.status.replace("_", " ")}
        </Badge>
      </div>

      {project.status === "IN_PROGRESS" && (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Research in progress...
        </div>
      )}

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm">
                {report.content}
              </div>
            </CardContent>
          </Card>

          {report.sources?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-violet-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {source.title}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {report.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {report.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
