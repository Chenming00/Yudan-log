import type { APIRoute } from 'astro';
import { handleLedgerMutation } from '../../lib/ledger-mutations';

export const DELETE: APIRoute = ({ request }) => handleLedgerMutation(request, 'delete');
