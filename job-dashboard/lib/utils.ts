export function getStatusColor(normalizedStatus: string) {
  switch (normalizedStatus) {
    case 'Not Selected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Interview':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Applied':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}