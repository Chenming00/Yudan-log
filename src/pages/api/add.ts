import type { APIRoute } from 'astro';
import { handleLedgerMutation } from '../../lib/ledger-mutations';

export const POST: APIRoute = ({ request }) => handleLedgerMutation(request, 'add');
