import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/whatsapp';

export function WhatsAppButton({ label, message }: { label: string; message?: string }) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sun-500 px-4 font-bold text-navy-900 transition hover:bg-sun-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
    >
      <MessageCircle aria-hidden className="size-5" />
      <span>{label}</span>
    </a>
  );
}
