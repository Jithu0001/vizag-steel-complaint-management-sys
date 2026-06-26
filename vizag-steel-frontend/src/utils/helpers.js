import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';
export const formatDateTime = (d) => d ? format(new Date(d), 'MMM d, yyyy · h:mm a') : '—';
export const timeAgo = (d) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—';

export const CATEGORIES = ['ELECTRICAL','SAFETY','CIVIL','MECHANICAL','ENVIRONMENTAL','HOUSEKEEPING','IT','OTHER'];
export const DEPARTMENTS = ['Electrical','Safety','Civil','Mechanical','Environmental','Housekeeping','IT','General'];
export const ROLES = ['employee','supervisor','department_admin','super_admin'];
export const STATUSES = ['pending','assigned','in_progress','resolved','verified','closed','escalated','rejected'];

export const priorityColor = { low:'#10B981', medium:'#F59E0B', high:'#F97316', critical:'#EF4444' };
export const statusColor = { pending:'#94A3B8', assigned:'#3B82F6', in_progress:'#F59E0B', resolved:'#10B981', verified:'#8B5CF6', closed:'#475569', escalated:'#EF4444', rejected:'#6B7280' };

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
