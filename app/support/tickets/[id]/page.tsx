'use client';

import { useParams } from 'next/navigation';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="text-2xl">Ticket #{id}</h1>
      <p className="opacity-70">Reply UI TBD.</p>
    </div>
  );
}
