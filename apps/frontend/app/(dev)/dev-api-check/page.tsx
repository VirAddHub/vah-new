// Dev-only diagnostic page. Returns 404 in production and staging.
// Access locally: NODE_ENV=development next dev
import { notFound } from 'next/navigation';
import { DevApiCheckClient } from './DevApiCheckClient';

export default function DevApiCheckPage() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <DevApiCheckClient />;
}
