/** Pure rules for the pre-incorporation route (no imports, so access code can use them anywhere). */

/** Business types that are companies (and so need a company, or a proposed company, checked). */
export function isCompanyType(t: unknown): boolean {
    return /limited|ltd|llp|plc|company/i.test(String(t ?? '')) && !/sole|partnership|other/i.test(String(t ?? ''));
}

export type PreIncState = 'needed' | 'in_review' | 'approved' | 'refused' | 'lapsed';

/** The pre-incorporation state from the latest application (pure, shared by single and bulk access). */
export function preStateFrom(p: any | null, tableOk: boolean, nowMs = Date.now()): { state: PreIncState; deadline: string | null } {
    if (!tableOk) return { state: 'needed', deadline: null }; // fail closed
    if (!p || p.status === 'returned') return { state: 'needed', deadline: null };
    if (p.status === 'submitted') return { state: 'in_review', deadline: null };
    if (p.status === 'refused') return { state: 'refused', deadline: null };
    if (p.status === 'lapsed' || p.status === 'incorporated') return { state: 'lapsed', deadline: p.deadline_at };
    if (p.deadline_at && new Date(p.deadline_at).getTime() < nowMs) return { state: 'lapsed', deadline: p.deadline_at };
    return { state: 'approved', deadline: p.deadline_at };
}

