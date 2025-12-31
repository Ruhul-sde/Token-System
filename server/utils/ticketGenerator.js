import Ticket from '../models/Ticket.js';

/**
 * Generate Ticket Number
 * Format: TYYMMDDDEPT001
 * Example: T250331IT001
 *
 * T      = Ticket prefix
 * YYMMDD = Date
 * DEPT   = Department code (IT, HR, G, etc.)
 * 001    = Sequential number per day + department
 */
export const generateTicketNumber = async (departmentCode = 'G') => {
  const now = new Date();

  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const dept = departmentCode.toUpperCase();
  const datePrefix = `T${year}${month}${day}${dept}`;

  // Find latest ticket with same prefix
  const latestTicket = await Ticket.findOne({
    ticketNumber: new RegExp(`^${datePrefix}`)
  }).sort({ ticketNumber: -1 });

  let sequenceNumber = 1;

  if (latestTicket?.ticketNumber) {
    const lastSequence = parseInt(latestTicket.ticketNumber.slice(-3), 10);
    sequenceNumber = lastSequence + 1;
  }

  const sequenceStr = String(sequenceNumber).padStart(3, '0');

  return `${datePrefix}${sequenceStr}`;
};
