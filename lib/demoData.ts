import { Customer } from './types';
import { getTodayDateString, addWeeksToDate } from './dateUtils';

export function getInitialDemoCustomers(): Customer[] {
  const today = getTodayDateString();
  const [y, m, d] = today.split('-').map(Number);
  
  // Calculate specific relative dates
  const yesterday = new Date(y, m - 1, d - 1).toISOString().split('T')[0];
  const threeDaysAgo = new Date(y, m - 1, d - 3).toISOString().split('T')[0];
  const tomorrow = new Date(y, m - 1, d + 1).toISOString().split('T')[0];
  const inThreeDays = new Date(y, m - 1, d + 3).toISOString().split('T')[0];
  const inTenDays = new Date(y, m - 1, d + 10).toISOString().split('T')[0];

  return [
    {
      id: 'cust-1',
      name: 'Sarah Jenkins',
      phone: '07700900123',
      address: '14 Elm Grove, Highfield',
      price: 25,
      frequencyWeeks: 4,
      lastCleanedDate: new Date(y, m - 1, d - 31).toISOString().split('T')[0],
      nextDueDate: threeDaysAgo, // Overdue
      status: 'active',
      notes: 'Side gate is unlocked. Mind the ginger cat!',
      preferredContact: 'sms',
    },
    {
      id: 'cust-2',
      name: 'Dave & Karen Miller',
      phone: '07700900456',
      address: '28 Oakwood Drive, Highfield',
      price: 35,
      frequencyWeeks: 4,
      lastCleanedDate: new Date(y, m - 1, d - 28).toISOString().split('T')[0],
      nextDueDate: today, // Due Today!
      status: 'active',
      notes: 'Text 15 mins before arriving. Keybox code #8291.',
      preferredContact: 'sms',
    },
    {
      id: 'cust-3',
      name: 'Michael Chang',
      phone: '07700900789',
      address: '7 Meadow Brook Road, Highfield',
      price: 20,
      frequencyWeeks: 2,
      lastCleanedDate: new Date(y, m - 1, d - 14).toISOString().split('T')[0],
      nextDueDate: today, // Due Today!
      status: 'active',
      notes: 'Front bay windows + back patio doors. Dogs put away inside.',
      preferredContact: 'whatsapp',
    },
    {
      id: 'cust-4',
      name: 'Emma Watson',
      phone: '07700900321',
      address: '52 Victoria Crescent, Parkside',
      price: 40,
      frequencyWeeks: 4,
      lastCleanedDate: new Date(y, m - 1, d - 28).toISOString().split('T')[0],
      nextDueDate: today, // Due Today!
      status: 'active',
      notes: 'Includes conservatory glass and frames.',
      preferredContact: 'sms',
    },
    {
      id: 'cust-5',
      name: 'Robert Taylor',
      phone: '07700900654',
      address: '109 Beechwood Way, Parkside',
      price: 25,
      frequencyWeeks: 4,
      lastCleanedDate: new Date(y, m - 1, d - 27).toISOString().split('T')[0],
      nextDueDate: tomorrow, // Due tomorrow
      status: 'active',
      notes: 'Ring front bell, customer works from home.',
      preferredContact: 'sms',
    },
    {
      id: 'cust-6',
      name: 'Claire Phillips',
      phone: '07700900987',
      address: '3 Sycamore Close, Lowfield',
      price: 30,
      frequencyWeeks: 6,
      lastCleanedDate: new Date(y, m - 1, d - 39).toISOString().split('T')[0],
      nextDueDate: inThreeDays,
      status: 'active',
      notes: 'Back gate latch can be stiff, lift handle upwards.',
      preferredContact: 'sms',
    },
    {
      id: 'cust-7',
      name: 'James Henderson',
      phone: '07700900234',
      address: '88 St. Johns Road, Lowfield',
      price: 50,
      frequencyWeeks: 8,
      lastCleanedDate: new Date(y, m - 1, d - 46).toISOString().split('T')[0],
      nextDueDate: inTenDays,
      status: 'active',
      notes: 'Large 3-storey house. Extension pole required for top floor velux.',
      preferredContact: 'whatsapp',
    },
  ];
}
