import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, Upload, Trash2, Plus, FileText, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface KBEntry {
  id: string;
  category: string;
  criterion: string;
  description: string | null;
  weight: number | null;
}

const CATEGORIES = ["Messaging Clarity", "Trust Signals", "CTA Strength", "Mobile Layout", "SEO Meta-data"];

const Admin = () => {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ category: CATEGORIES[0], criterion: "", description: "", weight: 2 });
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("knowledge_base").select("*").order("category");
    setEntries((data as KBEntry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchEntries();
  }, [authenticated, fetchEntries]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-kb", {
        body: { password, action: "verify" },
      });
      if (error || data?.error) {
        toast({ title: "Access denied", variant: "destructive" });
      } else {
        setAuthenticated(true);
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
    setVerifying(false);
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Read file as text (for txt/md) or extract text from PDF
      let text = "";
      if (file.type === "application/pdf") {
        // For PDFs, we'll read as base64 and let the server handle it
        // Actually, browsers can't natively parse PDFs to text easily
        // We'll use FileReader to get text if possible, or inform user
        const reader = new FileReader();
        text = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(file);
        });

        // If it looks like binary PDF data, inform user
        if (text.startsWith("%PDF")) {
          toast({
            title: "PDF format detected",
            description: "For best results, paste the text content directly or use a .txt file. Attempting to parse anyway...",
          });
          // Still try to extract readable text from the PDF binary
          const readable = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, "\n");
          text = readable;
        }
      } else {
        text = await file.text();
      }

      if (text.trim().length < 20) {
        toast({ title: "File too short", description: "The file doesn't contain enough text to extract criteria.", variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("admin-kb", {
        body: { password, action: "parse_pdf", pdfText: text },
      });

      if (error || data?.error) {
        throw new Error(data?.error || "Upload failed");
      }

      toast({ title: "Knowledge base updated!", description: `Extracted ${data.count} criteria from your document.` });
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke("admin-kb", {
        body: { password, action: "add_entry", entry: newEntry },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed");
      toast({ title: "Entry added" });
      setNewEntry({ category: CATEGORIES[0], criterion: "", description: "", weight: 2 });
      setShowAddForm(false);
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-kb", {
        body: { password, action: "delete_entry", entry: { id } },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed");
      toast({ title: "Entry deleted" });
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter your admin password to manage the knowledge base.</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={verifying || !password}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {verifying ? "Verifying..." : "Enter"}
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to auditor
          </Link>
        </form>
      </div>
    );
  }

  // Admin dashboard
  const grouped = entries.reduce<Record<string, KBEntry[]>>((acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-sm font-bold">Knowledge Base Admin</h1>
          <div className="flex items-center gap-2">
            <button onClick={fetchEntries} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Upload + Add actions */}
        <div className="flex flex-wrap gap-3">
          <label className={`flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm cursor-pointer hover:border-primary/50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>{uploading ? "Processing..." : "Upload Document"}</span>
            <input type="file" accept=".pdf,.txt,.md,.doc,.docx" onChange={handlePDFUpload} className="hidden" />
          </label>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:border-primary/50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
          <div className="flex-1" />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {entries.length} criteria
          </span>
        </div>

        {/* Upload hint */}
        <p className="text-xs text-muted-foreground">
          Upload a .txt or .md file with your audit guidelines. The AI will extract criteria and <strong>replace</strong> the current knowledge base. For PDFs, copy-paste the text into a .txt file for best results.
        </p>

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAddEntry} className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={newEntry.criterion}
                onChange={(e) => setNewEntry({ ...newEntry, criterion: e.target.value })}
                placeholder="Criterion name"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
            <textarea
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              placeholder="Description..."
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Weight:</label>
              <select
                value={newEntry.weight}
                onChange={(e) => setNewEntry({ ...newEntry, weight: Number(e.target.value) })}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none"
              >
                <option value={1}>1 - Low</option>
                <option value={2}>2 - Medium</option>
                <option value={3}>3 - High</option>
              </select>
              <div className="flex-1" />
              <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                Save
              </button>
            </div>
          </form>
        )}

        {/* Entries grouped by category */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const items = grouped[cat] || [];
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat} ({items.length})</h2>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 group hover:border-primary/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.criterion}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">w{item.weight}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
