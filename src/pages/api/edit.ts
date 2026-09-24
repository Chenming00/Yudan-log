import type { APIRoute } from 'astro';
import { handleLedgerMutation } from '../../lib/ledger-mutations';

export const PATCH: APIRoute = ({ request }) => handleLedgerMutation(request, 'edit');
