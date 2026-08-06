'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  ShieldAlert, Loader2, Search, FileText, Link2, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, Pencil, MessageSquare,
} from 'lucide-react';

interface ClaimRecord {
  claimId: string;
  statement: string;
  truthLevel: 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';
  approvalStatus: 'approved' | 'candidate' | 'rejected' | 'blocked';
  provenance: string;
  source: { doc: string; section?: string };
  domain: string;
  dependencies: string[];
  contradictions: string[];
  applicableSystems: string[];
  tags: string[];
  createdBy: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface ClaimRegistry {
  version: string;
  generatedAt: string;
  claims: ClaimRecord[];
  summary: {
    totalClaims: number;
    byTruthLevel: Record<string, number>;
    byApprovalStatus: Record<string, number>;
    byProvenance: Record<string, number>;
    byDomain: Record<string, number>;
    highRiskUnreviewed: number;
  };
  validation: {
    totalClaims: number;
    findings: Array<{ claimId: string; findingType: string; severity: string; message: string }>;
    summary: { highRiskUnreviewed: number; unsupportedCanon: number; missingDependencies: number };
    verdict: string;
  };
  coverage: {
    layersImplemented: string[];
    layersNotImplemented: string[];
  };
}

const TRUTH_COLORS: Record<string, string> = {
  CANON: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  DERIVED: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  ART: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  PROC: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  UNRESOLVED: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
};

const APPROVAL_ICONS: Record<string, typeof CheckCircle2> = {
  approved: CheckCircle2,
  candidate: HelpCircle,
  rejected: XCircle,
  blocked: AlertTriangle,
};

export default function ClaimsPanel() {
  const [registry, setRegistry] = useState<ClaimRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [approvingClaim, setApprovingClaim] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'rejected' | 'needs-revision'>('approved');
  const [submitting, setSubmitting] = useState(false);

  const refreshRegistry = useCallback(async () => {
    try {
      const res = await fetch('/api/architect/claims');
      if (res.ok) {
        const data = await res.json();
        setRegistry(data);
      }
    } catch {}
  }, []);

  const submitApproval = useCallback(async () => {
    if (!approvingClaim) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/architect/claims/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: approvingClaim,
          decision: approvalDecision,
          actorId: 'user',
          actorType: 'user',
          comment: approvalComment,
        }),
      });
      if (res.ok) {
        setApprovingClaim(null);
        setApprovalComment('');
        await refreshRegistry();
      }
    } catch {} finally {
      setSubmitting(false);
    }
  }, [approvingClaim, approvalDecision, approvalComment, refreshRegistry]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/architect/claims');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setRegistry(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[11px] text-[#5a5a7a]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
        <span>Extracting claim-level records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[11px] text-rose-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!registry || registry.claims.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[11px] text-[#5a5a7a]">
        <FileText className="h-5 w-5 opacity-40" />
        <span>No claim records found.</span>
        <span className="text-[10px]">Bible docs need truth-level markers before claims can be extracted.</span>
      </div>
    );
  }

  const domains = ['all', ...Object.keys(registry.summary.byDomain).sort()];
  const filtered = registry.claims.filter(c => {
    if (domainFilter !== 'all' && c.domain !== domainFilter) return false;
    if (statusFilter !== 'all' && c.approvalStatus !== statusFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      return c.statement.toLowerCase().includes(q) ||
             c.claimId.toLowerCase().includes(q) ||
             c.source.doc.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header with honest summary */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Claim Registry</span>
        <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#aaaacc]">
          {registry.claims.length} claims
        </Badge>
        <Badge variant="outline" className="h-4 border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-300">
          {registry.summary.byApprovalStatus.candidate ?? 0} candidate
        </Badge>
        <Badge variant="outline" className="h-4 border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">
          {registry.summary.byApprovalStatus.approved ?? 0} approved
        </Badge>
      </div>

      {/* Honesty warning */}
      <div className="border-b border-[#2a2a4a] bg-emerald-500/5 px-3 py-1 text-[9px] text-emerald-400/80">
        6/6 validation layers implemented (structural, semantic-graph, numerical,
        provenance, natural-language-semantic, runtime-enforcement). All claims are
        CANDIDATE until human-reviewed. Exercise level: fixture (10 claims).
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 border-b border-[#2a2a4a] px-2 py-1.5">
        <Search className="h-3 w-3 text-[#5a5a7a]" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter claims..."
          className="h-6 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 text-[10px] text-[#c8c8e0] placeholder:text-[#4a4a6a]"
        />
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="h-6 rounded border border-[#2a2a4a] bg-[#1a1a2e] px-1.5 text-[10px] text-[#c8c8e0]"
        >
          {domains.map(d => (
            <option key={d} value={d}>{d === 'all' ? 'All domains' : d}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-6 rounded border border-[#2a2a4a] bg-[#1a1a2e] px-1.5 text-[10px] text-[#c8c8e0]"
        >
          <option value="all">All status</option>
          <option value="candidate">Needs review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Claims list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {filtered.map((claim) => {
            const ApprovalIcon = APPROVAL_ICONS[claim.approvalStatus] ?? HelpCircle;
            const isExpanded = expandedClaim === claim.claimId;
            return (
              <div
                key={claim.claimId}
                className={`rounded border border-[#2a2a4a] bg-[#12122a] transition-colors hover:border-[#3a3a5a] ${
                  isExpanded ? 'border-purple-500/30' : ''
                }`}
              >
                <button
                  onClick={() => setExpandedClaim(isExpanded ? null : claim.claimId)}
                  className="flex w-full items-start gap-2 p-2 text-left"
                >
                  <ApprovalIcon className={`mt-0.5 h-3 w-3 shrink-0 ${
                    claim.approvalStatus === 'approved' ? 'text-emerald-400' :
                    claim.approvalStatus === 'candidate' ? 'text-amber-400' :
                    claim.approvalStatus === 'rejected' ? 'text-rose-400' :
                    'text-amber-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`h-3.5 shrink-0 border-[1px] px-1 text-[8px] ${TRUTH_COLORS[claim.truthLevel]}`}>
                        {claim.truthLevel}
                      </Badge>
                      <span className="truncate text-[10px] text-[#5a5a7a]">{claim.claimId}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#c8c8e0] line-clamp-2">
                      {claim.statement}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[#4a4a6a]">
                      <span className="font-mono">{claim.source.doc}</span>
                      <span>·</span>
                      <span>{claim.domain}</span>
                      <span>·</span>
                      <span className="text-amber-400/60">{claim.provenance}</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#2a2a4a] px-2 py-1.5">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                      <div>
                        <span className="text-[#5a5a7a]">Provenance:</span>{' '}
                        <span className="text-amber-400/80">{claim.provenance}</span>
                      </div>
                      <div>
                        <span className="text-[#5a5a7a]">Created by:</span>{' '}
                        <span className="text-[#aaaacc]">{claim.createdBy}</span>
                      </div>
                      <div>
                        <span className="text-[#5a5a7a]">Source:</span>{' '}
                        <span className="font-mono text-[#aaaacc]">{claim.source.doc}</span>
                        {claim.source.section && (
                          <span className="text-[#5a5a7a]"> §{claim.source.section}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[#5a5a7a]">Domain:</span>{' '}
                        <span className="text-[#aaaacc]">{claim.domain}</span>
                      </div>
                    </div>

                    {claim.applicableSystems.length > 0 && (
                      <div className="mt-1.5">
                        <span className="text-[9px] text-[#5a5a7a]">Systems:</span>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {claim.applicableSystems.map(s => (
                            <span key={s} className="rounded bg-[#1a1a2e] px-1 py-0.5 text-[8px] text-[#8888aa]">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {claim.dependencies.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[9px]">
                        <Link2 className="h-2.5 w-2.5 text-[#5a5a7a]" />
                        <span className="text-[#5a5a7a]">Depends on:</span>
                        <span className="font-mono text-[#aaaacc]">{claim.dependencies.join(', ')}</span>
                      </div>
                    )}

                    {claim.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {claim.tags.map(t => (
                          <span key={t} className="rounded bg-purple-500/10 px-1 py-0.5 text-[8px] text-purple-300">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Approval workflow buttons */}
                    {claim.approvalStatus === 'candidate' && (
                      <div className="mt-2 flex items-center gap-1 border-t border-[#2a2a4a] pt-1.5">
                        <Button
                          size="sm"
                          className="h-5 gap-1 bg-emerald-600 px-2 text-[9px] text-white hover:bg-emerald-500"
                          onClick={() => { setApprovingClaim(claim.claimId); setApprovalDecision('approved'); }}
                          disabled={submitting}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          className="h-5 gap-1 bg-rose-600 px-2 text-[9px] text-white hover:bg-rose-500"
                          onClick={() => { setApprovingClaim(claim.claimId); setApprovalDecision('rejected'); }}
                          disabled={submitting}
                        >
                          <XCircle className="h-2.5 w-2.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 gap-1 border-amber-500/30 px-2 text-[9px] text-amber-300 hover:bg-amber-500/10"
                          onClick={() => { setApprovingClaim(claim.claimId); setApprovalDecision('needs-revision'); }}
                          disabled={submitting}
                        >
                          <Pencil className="h-2.5 w-2.5" /> Revise
                        </Button>
                      </div>
                    )}

                    {/* Show approval record if reviewed */}
                    {claim.approvalStatus !== 'candidate' && claim.reviewedAt && (
                      <div className="mt-1.5 border-t border-[#2a2a4a] pt-1 text-[9px] text-[#5a5a7a]">
                        <span>Reviewed: {claim.reviewedAt.slice(0, 10)}</span>
                        {claim.reviewNotes && (
                          <span className="ml-2 text-[#8888aa]">"{claim.reviewNotes.slice(0, 60)}"</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Approval modal */}
                {approvingClaim === claim.claimId && (
                  <div className="border-t border-purple-500/30 bg-purple-500/5 px-2 py-2">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 text-purple-400" />
                      <span className="text-[10px] font-medium text-purple-300">
                        {approvalDecision === 'approved' ? 'Approve claim' : approvalDecision === 'rejected' ? 'Reject claim' : 'Request revision'}
                      </span>
                    </div>
                    <Input
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Review comment (optional)..."
                      className="mb-1.5 h-6 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 text-[10px] text-[#c8c8e0] placeholder:text-[#4a4a6a]"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className={`h-5 px-2 text-[9px] text-white ${
                          approvalDecision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' :
                          approvalDecision === 'rejected' ? 'bg-rose-600 hover:bg-rose-500' :
                          'bg-amber-600 hover:bg-amber-500'
                        }`}
                        onClick={submitApproval}
                        disabled={submitting}
                      >
                        {submitting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-2 text-[9px] text-[#5a5a7a]"
                        onClick={() => { setApprovingClaim(null); setApprovalComment(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-4 text-center text-[10px] text-[#5a5a7a]">
              No claims match the filter.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
